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

export function formatDemandScope(pieceCount: number, type: DemandType) {
  const count = normalizePieceCount(pieceCount);
  const labels: Record<DemandType, [string, string]> = {
    Ambos: ["peça", "peças"],
    Arte: ["arte", "artes"],
    Vídeo: ["vídeo", "vídeos"]
  };
  const [singular, plural] = labels[type];
  return `${count} ${count === 1 ? singular : plural}`;
}
