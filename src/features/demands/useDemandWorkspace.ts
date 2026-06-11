import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  getReconnectDelay,
  isChannelFailure,
  type RealtimeConnectionState
} from "../notifications/realtime";
import { fetchDemandWorkspace } from "./repository";
import type { DemandWorkspaceData } from "./types";

export function useDemandWorkspace(taskId: string | undefined) {
  const [data, setData] = useState<DemandWorkspaceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>("connecting");
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!taskId) return;
    try {
      const workspace = await fetchDemandWorkspace(taskId);
      if (!mountedRef.current) return;
      setData(workspace);
      setError(null);
    } catch (refreshError) {
      if (!mountedRef.current) return;
      setError(
        refreshError instanceof Error ? refreshError.message : "Não foi possível carregar a demanda."
      );
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!taskId) return;

    let channel = createChannel();
    let reconnectTimer: number | undefined;
    let syncTimer: number | undefined;
    let reconnectAttempt = 0;
    let cancelled = false;

    function createChannel() {
      const channelName = `demand-workspace:${taskId}:${crypto.randomUUID()}`;
      return supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "production_tasks", filter: `id=eq.${taskId}` },
          () => void refresh()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "demand_items", filter: `task_id=eq.${taskId}` },
          () => void refresh()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "submissions", filter: `task_id=eq.${taskId}` },
          () => void refresh()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "review_comments", filter: `task_id=eq.${taskId}` },
          () => void refresh()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "activity_events", filter: `task_id=eq.${taskId}` },
          () => void refresh()
        );
    }

    function subscribe() {
      setConnectionState(navigator.onLine ? "connecting" : "offline");
      channel.subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          reconnectAttempt = 0;
          setConnectionState("connected");
          void refresh();
          return;
        }

        if (!isChannelFailure(status)) return;
        setConnectionState(navigator.onLine ? "reconnecting" : "offline");
        window.clearTimeout(reconnectTimer);
        reconnectTimer = window.setTimeout(async () => {
          if (cancelled || !navigator.onLine) return;
          await supabase.removeChannel(channel);
          channel = createChannel();
          reconnectAttempt += 1;
          subscribe();
        }, getReconnectDelay(reconnectAttempt));
      });
    }

    const resync = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void refresh();
    };
    const handleOnline = () => {
      setConnectionState("reconnecting");
      resync();
    };
    const handleOffline = () => setConnectionState("offline");

    subscribe();
    syncTimer = window.setInterval(resync, 60_000);
    window.addEventListener("focus", resync);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", resync);

    return () => {
      cancelled = true;
      window.clearInterval(syncTimer);
      window.clearTimeout(reconnectTimer);
      window.removeEventListener("focus", resync);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", resync);
      void supabase.removeChannel(channel);
    };
  }, [refresh, taskId]);

  return { connectionState, data, error, isLoading, refresh };
}
