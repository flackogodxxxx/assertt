import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Bell, CheckCircle2, X } from "lucide-react";
import { useAuth } from "./AuthContext";
import { notificationRowToEvent } from "../lib/crm-mappers";
import { playNotificationTone, shouldAlertForNotification, showNativeNotification } from "../lib/notification-realtime";
import { supabase } from "../lib/supabase";
import type { NotificationRow } from "../lib/supabase-types";
import {
  defaultNotificationPreferences,
  isNotificationTypeEnabled,
  normalizeNotificationPreferences,
  type NotificationPreferences,
  type OperationalNotificationType
} from "../features/notifications/preferences";
import type { RealtimeConnectionState } from "../features/notifications/realtime";

const db = supabase as any;

export type NotificationType = "info" | "success" | "warning";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
}

export type NotificationEvent = Notification & {
  createdAt: string;
  demandId?: string;
  deliveredTo?: string[];
  seenBy: string[];
  targetUserIds: string[];
};

interface NotificationContextType {
  notifications: Notification[];
  targetedEvents: NotificationEvent[];
  unreadCount: number;
  showNotification: (title: string, message: string, type?: NotificationType) => void;
  removeNotification: (id: string) => void;
  deleteNotification: (id: string) => void;
  markEventAsRead: (id: string) => void;
  markAllEventsAsRead: () => void;
  connectionState: RealtimeConnectionState;
  remoteEnabled: boolean;
  preferences: NotificationPreferences;
  requestDesktopPermission: () => Promise<boolean>;
  testNotification: () => Promise<void>;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
}

const NOTIFICATIONS_STORAGE_KEY = "crm_notification_events";
const NOTIFICATION_PREFERENCES_KEY = "crm_notification_preferences";
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function getStoredNotificationEvents(): NotificationEvent[] {
  const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved) as NotificationEvent[];
  } catch {
    return [];
  }
}

function persistEvents(events: NotificationEvent[]) {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(events.slice(0, 100)));
  window.dispatchEvent(new Event("crm-notification-events"));
}

export function appendNotificationEvent(event: NotificationEvent) {
  const currentEvents = getStoredNotificationEvents();
  persistEvents([event, ...currentEvents]);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [events, setEvents] = useState<NotificationEvent[]>(getStoredNotificationEvents);
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>(navigator.onLine ? "connecting" : "offline");
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(NOTIFICATION_PREFERENCES_KEY) || "null");
      return stored ? { ...defaultNotificationPreferences, ...stored } : defaultNotificationPreferences;
    } catch {
      return defaultNotificationPreferences;
    }
  });
  const alertedIdsRef = useRef(new Set<string>());
  const audioContextRef = useRef<AudioContext | undefined>(undefined);
  const { user } = useAuth();

  const persistPreferences = useCallback((next: NotificationPreferences) => {
    setPreferences(next);
    localStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(next));
  }, []);

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      const next = { ...preferences, ...updates };
      persistPreferences(next);

      if (!user) return;
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      await db.from("notification_preferences").upsert({
        assignment_enabled: next.assignmentEnabled,
        deadline_enabled: next.deadlineEnabled,
        desktop_enabled: next.desktopEnabled,
        review_enabled: next.reviewEnabled,
        sound_enabled: next.soundEnabled,
        updated_at: new Date().toISOString(),
        user_id: user.id
      });
    },
    [persistPreferences, preferences, user]
  );

  const requestDesktopPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    const permission = await Notification.requestPermission();
    const granted = permission === "granted";
    await updatePreferences({ desktopEnabled: granted });
    return granted;
  }, [updatePreferences]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((previousNotifications) => previousNotifications.filter((notification) => notification.id !== id));
  }, []);

  const showNotification = useCallback(
    (title: string, message: string, type: NotificationType = "info") => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setNotifications((previousNotifications) => [...previousNotifications, { id, title, message, type }]);

      window.setTimeout(() => {
        removeNotification(id);
      }, 6200);
    },
    [removeNotification]
  );

  const testNotification = useCallback(async () => {
    showNotification("Notificação de teste", "Som e alerta do WORKOS estão configurados.", "success");
    if (preferences.soundEnabled) {
      await playNotificationTone(audioContextRef.current);
    }
    if (preferences.desktopEnabled && Notification.permission === "granted") {
      await showNativeNotification("Notificação de teste", "Alertas do WORKOS estão ativos.");
    }
  }, [preferences.desktopEnabled, preferences.soundEnabled, showNotification]);

  const refreshEvents = useCallback(() => {
    setEvents(getStoredNotificationEvents());
  }, []);

  const refreshRemoteEvents = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!user || !sessionData.session) {
      setRemoteEnabled(false);
      setConnectionState(navigator.onLine ? "connecting" : "offline");
      return false;
    }

    const { data, error } = await db
      .from("notifications")
      .select("*")
      .or(`target_user_id.eq.${user.id},target_user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setRemoteEnabled(false);
      setConnectionState(navigator.onLine ? "reconnecting" : "offline");
      return false;
    }

    setRemoteEnabled(true);
    setEvents((data || []).map((row: any) => notificationRowToEvent(row, row.target_user_id ? [row.target_user_id] : [user.id]) as NotificationEvent));
    return true;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!sessionData.session) return;
      db
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }: { data: any }) => {
          if (active && data) persistPreferences(normalizeNotificationPreferences(data));
        });
    });

    return () => {
      active = false;
    };
  }, [persistPreferences, user]);

  const targetedEvents = useMemo(() => {
    if (!user) {
      return [];
    }

    return events.filter((event) => event.targetUserIds.includes(user.id));
  }, [events, user]);

  const unreadCount = useMemo(() => {
    if (!user) {
      return 0;
    }

    return targetedEvents.filter((event) => !event.seenBy.includes(user.id)).length;
  }, [targetedEvents, user]);

  const markEventAsRead = useCallback(
    (id: string) => {
      if (!user) {
        return;
      }

      if (remoteEnabled) {
        db
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", id)
          .then(() => refreshRemoteEvents());
        return;
      }

      const updatedEvents = getStoredNotificationEvents().map((event) => {
        if (event.id !== id || event.seenBy.includes(user.id)) {
          return event;
        }

        return { ...event, seenBy: [...event.seenBy, user.id] };
      });

      persistEvents(updatedEvents);
      setEvents(updatedEvents);
    },
    [refreshRemoteEvents, remoteEnabled, user]
  );

  const deleteNotification = useCallback(
    (id: string) => {
      if (!user) return;
      if (remoteEnabled) {
        db.from("notifications").delete().eq("id", id).then(() => refreshRemoteEvents());
        return;
      }
      const updatedEvents = getStoredNotificationEvents().filter((event) => event.id !== id);
      persistEvents(updatedEvents);
      setEvents(updatedEvents);
    },
    [refreshRemoteEvents, remoteEnabled, user]
  );

  const markAllEventsAsRead = useCallback(() => {
    if (!user) {
      return;
    }

    if (remoteEnabled) {
      Promise.all(
        targetedEvents
          .filter((event) => !event.seenBy.includes(user.id))
          .map((event) =>
            db
              .from("notifications")
              .update({ read_at: new Date().toISOString() })
              .eq("id", event.id)
          )
      ).then(() => refreshRemoteEvents());
      return;
    }

    const updatedEvents = getStoredNotificationEvents().map((event) => {
      if (!event.targetUserIds.includes(user.id) || event.seenBy.includes(user.id)) {
        return event;
      }

      return { ...event, seenBy: [...event.seenBy, user.id] };
    });

    persistEvents(updatedEvents);
    setEvents(updatedEvents);
  }, [refreshRemoteEvents, remoteEnabled, targetedEvents, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;
    const unlockAudio = () => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!audioContextRef.current && AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }

        if (audioContextRef.current?.state === "suspended") {
          void audioContextRef.current.resume();
        }
        
      } catch {
        return;
      }
    };

    const processTargetedEvents = () => {
      if (remoteEnabled) {
        return;
      }

      const storedEvents = getStoredNotificationEvents();
      let hasChanges = false;

      const updatedEvents = storedEvents.map((event) => {
        const isTarget = event.targetUserIds.includes(user.id);
        const deliveredTo = event.deliveredTo || [];
        const wasDelivered = deliveredTo.includes(user.id);
        const operationalType = (
          event.type === "warning" ? "deadline" : "general"
        ) as OperationalNotificationType;

        if (
          !isTarget ||
          wasDelivered ||
          !isNotificationTypeEnabled(operationalType, preferences)
        ) {
          return event;
        }

        hasChanges = true;
        showNotification(event.title, event.message, event.type);
        if (preferences.soundEnabled) void playNotificationTone(audioContextRef.current);
        if (preferences.desktopEnabled) {
          void showNativeNotification(event.title, event.message, event.demandId);
        }

        return { ...event, deliveredTo: [...deliveredTo, user.id] };
      });

      if (hasChanges) {
        persistEvents(updatedEvents);
      }

      setEvents(hasChanges ? updatedEvents : storedEvents);
    };

    refreshRemoteEvents().then((isRemote) => {
      if (!isMounted || isRemote) {
        return;
      }

      processTargetedEvents();
    });

    const channel = supabase
      .channel(`crm-notifications:${user.id}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const row = payload.new as NotificationRow;
          const operationalType = (
            ["assignment", "review", "deadline"].includes(row.type) ? row.type : "general"
          ) as OperationalNotificationType;

          if (
            !isNotificationTypeEnabled(operationalType, preferences) ||
            !shouldAlertForNotification(
              {
                id: row.id,
                readAt: row.read_at,
                targetUserId: row.target_user_id
              },
              user.id,
              alertedIdsRef.current
            )
          ) {
            return;
          }

          const event = notificationRowToEvent(row, [user.id]) as NotificationEvent;
          alertedIdsRef.current.add(row.id);
          setEvents((previousEvents) => {
            if (previousEvents.some((candidate) => candidate.id === event.id)) {
              return previousEvents;
            }

            return [event, ...previousEvents].slice(0, 100);
          });
          showNotification(event.title, event.message, event.type);
          if (preferences.soundEnabled) void playNotificationTone(audioContextRef.current);
          if (preferences.desktopEnabled) {
            void showNativeNotification(event.title, event.message, event.demandId);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        () => {
          void refreshRemoteEvents();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications" },
        () => {
          void refreshRemoteEvents();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionState("connected");
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionState(navigator.onLine ? "reconnecting" : "offline");
        }
      });

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === NOTIFICATIONS_STORAGE_KEY) {
        processTargetedEvents();
      }
    };
    const resync = () => {
      if (navigator.onLine) void refreshRemoteEvents();
    };
    const handleOnline = () => {
      setConnectionState("reconnecting");
      resync();
    };
    const handleOffline = () => setConnectionState("offline");

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("crm-notification-events", processTargetedEvents);
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    window.addEventListener("focus", resync);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", resync);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("crm-notification-events", processTargetedEvents);
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("focus", resync);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", resync);
    };
  }, [
    preferences,
    refreshRemoteEvents,
    remoteEnabled,
    showNotification,
    user
  ]);

  return (
    <NotificationContext.Provider
      value={{
        connectionState,
        remoteEnabled,
        markAllEventsAsRead,
        markEventAsRead,
        notifications,
        preferences,
        requestDesktopPermission,
        removeNotification,
        deleteNotification,
        showNotification,
        testNotification,
        targetedEvents,
        updatePreferences,
        unreadCount
      }}
    >
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 pointer-events-none sm:bottom-6 sm:right-6">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="crm-toast pointer-events-auto flex items-start gap-3 rounded-card border border-glass-stroke bg-carbon-900/92 p-4 shadow-panel-deep backdrop-blur-xl"
          >
            <div
              className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-card border ${
                notification.type === "success"
                  ? "border-signal-300/30 bg-signal-400/10 text-signal-300"
                  : notification.type === "warning"
                    ? "border-assert-300/30 bg-assert-500/10 text-assert-300"
                    : "border-accent-300/30 bg-accent-400/10 text-accent-300"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle2 className="size-5" aria-hidden="true" />
              ) : notification.type === "warning" ? (
                <AlertCircle className="size-5" aria-hidden="true" />
              ) : (
                <Bell className="size-5" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-carbon-50">{notification.title}</h4>
              <p className="mt-1 text-xs leading-5 text-carbon-250">{notification.message}</p>
            </div>
            <button
              aria-label="Fechar notificação"
              className="rounded-card p-1 text-carbon-400 transition-all duration-300 hover:bg-carbon-800 hover:text-carbon-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
              onClick={() => removeNotification(notification.id)}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);

  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }

  return context;
}
