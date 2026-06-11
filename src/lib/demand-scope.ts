import type { DemandType } from "../contexts/DemandContext";

export function normalizePieceCount(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(50, Math.max(1, Math.round(value)));
}

export function buildPieceInstructions(value: string, pieceCount: number) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, normalizePieceCount(pieceCount));
}

export function getDemandScopeLabel(type: DemandType, plural = false) {
  const labels: Record<DemandType, [string, string]> = {
    Ambos: ["vídeo/arte", "vídeos/artes"],
    Arte: ["arte", "artes"],
    Vídeo: ["vídeo", "vídeos"]
  };
  return labels[type][plural ? 1 : 0];
}

export function formatDemandScope(pieceCount: number, type: DemandType) {
  const count = normalizePieceCount(pieceCount);
  const label = getDemandScopeLabel(type, count !== 1);
  return `${count} ${label}`;
}
