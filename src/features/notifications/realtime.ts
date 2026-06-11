export type RealtimeConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline";

export type SupabaseChannelStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR";

export function getReconnectDelay(attempt: number) {
  return Math.min(30_000, 1000 * 2 ** Math.max(0, attempt));
}

export function connectionStateFromChannel(
  status: SupabaseChannelStatus,
  hasConnected: boolean
): RealtimeConnectionState {
  if (status === "SUBSCRIBED") return "connected";
  if (!navigator.onLine) return "offline";
  return hasConnected ? "reconnecting" : "connecting";
}

export function isChannelFailure(status: string): status is Exclude<SupabaseChannelStatus, "SUBSCRIBED"> {
  return status === "TIMED_OUT" || status === "CLOSED" || status === "CHANNEL_ERROR";
}
