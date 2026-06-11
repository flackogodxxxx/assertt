export function clampMediaTime(value: number, duration: number) {
  if (!Number.isFinite(value)) return 0;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  return Math.min(safeDuration, Math.max(0, value));
}

export function formatMediaTime(seconds: number) {
  const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${remainingSeconds.toFixed(3).padStart(6, "0")}`;
}

export function parseMediaTime(value: string) {
  const [minutes = "0", seconds = "0"] = value.split(":");
  const parsed = Number(minutes) * 60 + Number(seconds);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createCorrectionRange(start: number, end?: number) {
  if (end === undefined || Math.abs(end - start) < 0.001) {
    return {
      endTimestamp: undefined,
      timestamp: formatMediaTime(start)
    };
  }

  const rangeStart = Math.min(start, end);
  const rangeEnd = Math.max(start, end);
  return {
    endTimestamp: formatMediaTime(rangeEnd),
    timestamp: formatMediaTime(rangeStart)
  };
}
