import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { type UserStatus, useAuth } from "./AuthContext";

type PresenceState = Record<string, { online: boolean; status: UserStatus; lastSeen: string }>;

interface PresenceContextType {
  onlineUserIds: string[];
  getPresenceStatus: (userId: string) => UserStatus | undefined;
  getLastSeen: (userId: string) => string | undefined;
  isOnline: (userId: string) => boolean;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [presence, setPresence] = useState<PresenceState>({});

  useEffect(() => {
    if (!user) {
      setPresence({});
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        setPresence({
          [user.id]: {
            lastSeen: new Date().toISOString(),
            online: true,
            status: user.status || "ONLINE"
          }
        });
        return;
      }

      channel = supabase.channel("crm-online-presence", {
        config: {
          private: true,
          presence: { key: user.id }
        }
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel!.presenceState<{
            lastSeen: string;
            status: UserStatus;
            userId: string;
          }>();

          setPresence((previous) => {
            const nextPresence: PresenceState = Object.fromEntries(
              Object.entries(previous).map(([id, value]) => [
                id,
                { ...value, online: false }
              ])
            );
            Object.entries(state).forEach(([key, values]) => {
              const latest = values.at(-1);
              if (!latest) return;
              nextPresence[latest.userId || key] = {
                lastSeen: latest.lastSeen,
                online: true,
                status: latest.status || "ONLINE"
              };
            });
            return nextPresence;
          });
        })
        .subscribe(async (status) => {
          if (status !== "SUBSCRIBED") return;
          await channel!.track({
            lastSeen: new Date().toISOString(),
            status: user.status || "ONLINE",
            userId: user.id
          });
        });
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [user]);

  const value = useMemo<PresenceContextType>(
    () => ({
      getPresenceStatus: (userId) => presence[userId]?.status,
      getLastSeen: (userId) => presence[userId]?.lastSeen,
      isOnline: (userId) => Boolean(presence[userId]?.online),
      onlineUserIds: Object.entries(presence)
        .filter(([, value]) => value.online)
        .map(([id]) => id)
    }),
    [presence]
  );

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const context = useContext(PresenceContext);

  if (!context) {
    throw new Error("usePresence must be used within a PresenceProvider");
  }

  return context;
}
