import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AlertCircle, Bell, CheckCircle2, X } from "lucide-react";
import { useAuth } from "./AuthContext";
import { notificationRowToEvent } from "../lib/crm-mappers";
import { supabase } from "../lib/supabase";

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
  markEventAsRead: (id: string) => void;
  markAllEventsAsRead: () => void;
}

const NOTIFICATIONS_STORAGE_KEY = "crm_notification_events";
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
  const { user } = useAuth();

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

  const refreshEvents = useCallback(() => {
    setEvents(getStoredNotificationEvents());
  }, []);

  const refreshRemoteEvents = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!user || !sessionData.session) {
      setRemoteEnabled(false);
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
      return false;
    }

    setRemoteEnabled(true);
    setEvents((data || []).map((row: any) => notificationRowToEvent(row, row.target_user_id ? [row.target_user_id] : [user.id]) as NotificationEvent));
    return true;
  }, [user]);

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

        if (!isTarget || wasDelivered) {
          return event;
        }

        hasChanges = true;
        showNotification(event.title, event.message, event.type);

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
      .channel("crm-notifications-context")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          refreshRemoteEvents();
        }
      )
      .subscribe();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === NOTIFICATIONS_STORAGE_KEY) {
        processTargetedEvents();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("crm-notification-events", processTargetedEvents);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("crm-notification-events", processTargetedEvents);
    };
  }, [refreshRemoteEvents, remoteEnabled, showNotification, user]);

  return (
    <NotificationContext.Provider
      value={{
        markAllEventsAsRead,
        markEventAsRead,
        notifications,
        removeNotification,
        showNotification,
        targetedEvents,
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
