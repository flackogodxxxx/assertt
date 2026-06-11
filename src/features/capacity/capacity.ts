export type CapacityLabel = "available" | "balanced" | "near-capacity" | "overloaded";

export type CapacityWorkItem = {
  activePieces: number;
  adjustmentCycles: number;
  dueAt?: string;
  estimatedMinutes: number;
};

export type CapacityInput = {
  weeklyCapacityMinutes: number;
  now?: Date;
  work: CapacityWorkItem[];
};

function deadlinePressure(dueAt: string | undefined, now: Date) {
  if (!dueAt) return 0;
  const remainingHours = (new Date(dueAt).getTime() - now.getTime()) / 3_600_000;
  if (remainingHours <= 8) return 0.3;
  if (remainingHours <= 24) return 0.2;
  if (remainingHours <= 48) return 0.1;
  return 0;
}

export function calculateCapacity({
  weeklyCapacityMinutes,
  now = new Date(),
  work
}: CapacityInput) {
  const usedMinutes = Math.round(
    work.reduce((total, item) => {
      const base = item.estimatedMinutes || item.activePieces * 120;
      const adjustmentLoad = base * Math.min(item.adjustmentCycles * 0.1, 0.3);
      const deadlineLoad = base * deadlinePressure(item.dueAt, now);
      return total + base + adjustmentLoad + deadlineLoad;
    }, 0)
  );
  const loadPercent =
    weeklyCapacityMinutes > 0 ? Math.round((usedMinutes / weeklyCapacityMinutes) * 100) : 0;
  const label: CapacityLabel =
    loadPercent > 100
      ? "overloaded"
      : loadPercent >= 80
        ? "near-capacity"
        : loadPercent >= 35
          ? "balanced"
          : "available";

  return {
    availableMinutes: Math.max(0, weeklyCapacityMinutes - usedMinutes),
    label,
    loadPercent,
    usedMinutes
  };
}
