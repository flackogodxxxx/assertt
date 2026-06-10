import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { type UserStatus, useAuth } from "./AuthContext";

type PresenceState = Record<string, { online: boolean; status: UserStatus; lastSeen: string }>;

interface PresenceContextType {
  onlineUserIds: string[];
  getPresenceStatus: (userId: string) => UserStatus | undefined;
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

    const channel = supabase.channel("crm-online-presence", {
      config: { presence: { key: user.id } }
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          lastSeen: string;
          status: UserStatus;
          userId: string;
        }>();

        const nextPresence: PresenceState = {};
        Object.entries(state).forEach(([key, values]) => {
          const latest = values.at(-1);
          if (!latest) {
            return;
          }

          nextPresence[latest.userId || key] = {
            lastSeen: latest.lastSeen,
            online: true,
            status: latest.status || "ONLINE"
          };
        });
        setPresence(nextPresence);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") {
          return;
        }

        await channel.track({
          lastSeen: new Date().toISOString(),
          status: user.status || "ONLINE",
          userId: user.id
        });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const value = useMemo<PresenceContextType>(
    () => ({
      getPresenceStatus: (userId) => presence[userId]?.status,
      isOnline: (userId) => Boolean(presence[userId]?.online),
      onlineUserIds: Object.keys(presence)
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
