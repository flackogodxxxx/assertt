import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Clapperboard, Filter, Image as ImageIcon, ListChecks, TimerReset, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { DropboxMark, CanvaMark } from "../components/brand-icons";
import { type DemandType, useDemands } from "../contexts/DemandContext";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/cn";
import { formatDemandScope } from "../lib/demand-scope";
import { type PriorityDemand, rankDemandsByPriority } from "../lib/demand-priority";

type QueueFilter = "all" | "video" | "arte" | "today" | "late";

const filterOptions: Array<{ id: QueueFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "video", label: "Vídeos" },
  { id: "arte", label: "Artes" },
  { id: "today", label: "Hoje" },
  { id: "late", label: "Atrasadas" }
];

const priorityTone: Record<PriorityDemand["priorityLevel"], { label: string; className: string; dot: string }> = {
  critical: {
    className: "border-assert-300/42 bg-assert-500/12 text-assert-200",
    dot: "bg-assert-300 shadow-[0_0_14px_var(--color-assert-300)]",
    label: "Urgente"
  },
  high: {
    className: "border-accent-300/38 bg-accent-400/10 text-accent-200",
    dot: "bg-accent-300 shadow-[0_0_14px_var(--color-accent-300)]",
    label: "Alta"
  },
  normal: {
    className: "border-signal-300/30 bg-signal-400/10 text-signal-200",
    dot: "bg-signal-300 shadow-[0_0_14px_var(--color-signal-300)]",
    label: "Normal"
  },
  waiting: {
    className: "border-carbon-700 bg-carbon-900/70 text-carbon-250",
    dot: "bg-carbon-500",
    label: "Revisão"
  }
};

function formatDate(value?: string) {
  if (!value) return "sem prazo";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    weekday: "short"
  }).format(new Date(value));
}

function typeIcon(type: DemandType) {
  if (type === "Vídeo") return Clapperboard;
  if (type === "Arte") return ImageIcon;
  return ListChecks;
}

function QueueMetric({
  label,
  value,
  Icon,
  tone
}: {
  label: string;
  value: number;
  Icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="rounded-card border border-glass-stroke bg-carbon-950/54 p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-carbon-400">{label}</span>
        <Icon className={cn("size-5", tone)} aria-hidden="true" />
      </div>
      <strong className="mt-3 block font-display text-3xl font-bold text-carbon-50">{value}</strong>
    </div>
  );
}

function DemandResourceLinks({ demand }: { demand: PriorityDemand }) {
  return (
    <div className="flex flex-wrap gap-2">
      {demand.dropboxLink && (
        <a
          aria-label={`Abrir Dropbox de ${demand.title}`}
          className="grid size-10 place-items-center rounded-card border border-signal-300/28 bg-signal-400/10 text-signal-300 transition-all hover:border-signal-300/60 hover:bg-signal-400/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-300"
          href={demand.dropboxLink}
          rel="noreferrer"
          target="_blank"
          title="Abrir arquivos"
        >
          <DropboxMark className="size-5" />
        </a>
      )}
      {demand.planningLink && (
        <a
          aria-label={`Abrir planejamento de ${demand.title}`}
          className="grid size-10 place-items-center rounded-card border border-assert-300/28 bg-assert-500/10 text-assert-300 transition-all hover:border-assert-300/60 hover:bg-assert-500/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-assert-300"
          href={demand.planningLink}
          rel="noreferrer"
          target="_blank"
          title="Abrir planejamento"
        >
          <CanvaMark className="size-5" />
        </a>
      )}
    </div>
  );
}

function PriorityRow({ demand, rank }: { demand: PriorityDemand; rank: number }) {
  const TypeIcon = typeIcon(demand.type);
  const tone = priorityTone[demand.priorityLevel];

  return (
    <article className="grid gap-4 rounded-card border border-glass-stroke bg-carbon-950/58 p-4 shadow-panel transition-all duration-300 hover:border-assert-300/45 hover:bg-carbon-900/58 lg:grid-cols-[4.5rem_minmax(0,1.35fr)_minmax(9rem,0.75fr)_minmax(8rem,0.65fr)_auto] lg:items-center">
      <div className="flex items-center gap-3 lg:block">
        <span className="grid size-11 place-items-center rounded-card border border-carbon-800 bg-carbon-900 font-display text-sm font-bold text-carbon-250">
          {String(rank).padStart(2, "0")}
        </span>
        <span className={cn("inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-bold lg:mt-3", tone.className)}>
          <span className={cn("size-2 rounded-full", tone.dot)} />
          {tone.label}
        </span>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-assert-300">{demand.client}</p>
        <h3 className="mt-1 truncate text-base font-bold text-carbon-50 sm:text-lg">{demand.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-carbon-300">{demand.description || "Sem briefing detalhado."}</p>
      </div>

      <div className="grid gap-2 text-sm">
        <span className="inline-flex min-h-10 items-center gap-2 rounded-card border border-carbon-800 bg-carbon-900/62 px-3 font-bold text-carbon-150">
          <TypeIcon className="size-4 text-accent-300" aria-hidden="true" />
          {formatDemandScope(demand.pieceCount || 1, demand.type)}
        </span>
        <span className="text-xs font-semibold text-carbon-400">{demand.status}</span>
      </div>

      <div className="grid gap-1">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-carbon-100">
          <CalendarClock className="size-4 text-carbon-400" aria-hidden="true" />
          {formatDate(demand.deadline)}
        </span>
        <span className="text-xs font-semibold text-carbon-400">{demand.priorityReason}</span>
      </div>

      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <DemandResourceLinks demand={demand} />
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-glass-stroke bg-carbon-900/72 px-4 text-xs font-bold text-carbon-100 transition-all hover:border-accent-300/54 hover:text-accent-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
          to="/crm/demandas"
        >
          Abrir
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function Prioridades() {
  const { user } = useAuth();
  const { visibleDemands } = useDemands();
  const [filter, setFilter] = useState<QueueFilter>("all");

  const priorityQueue = useMemo(() => rankDemandsByPriority(visibleDemands), [visibleDemands]);

  const filteredQueue = useMemo(() => {
    return priorityQueue.filter((demand) => {
      if (filter === "video") return demand.type === "Vídeo" || demand.type === "Ambos";
      if (filter === "arte") return demand.type === "Arte" || demand.type === "Ambos";
      if (filter === "today") return demand.daysUntilDeadline === 0;
      if (filter === "late") return demand.daysUntilDeadline !== null && demand.daysUntilDeadline < 0;
      return true;
    });
  }, [filter, priorityQueue]);

  const metrics = useMemo(() => {
    return {
      active: priorityQueue.length,
      dueToday: priorityQueue.filter((demand) => demand.daysUntilDeadline === 0).length,
      late: priorityQueue.filter((demand) => demand.daysUntilDeadline !== null && demand.daysUntilDeadline < 0).length,
      videos: priorityQueue.filter((demand) => demand.type === "Vídeo" || demand.type === "Ambos").length
    };
  }, [priorityQueue]);

  const topDemand = filteredQueue[0];

  if (!user) return null;

  return (
    <div className="space-y-7 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-5 border-b border-glass-stroke pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-assert-300">Fila de decisão</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-carbon-50">Prioridades</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-carbon-300">
            Ordem sugerida por prazo, status e escopo. A lista usa somente as demandas visíveis para {user.name}.
          </p>
        </div>

        <div className="inline-flex w-full items-center gap-2 overflow-x-auto rounded-card border border-glass-stroke bg-carbon-950/58 p-1 shadow-panel lg:w-auto">
          <Filter className="ml-2 size-4 shrink-0 text-carbon-400" aria-hidden="true" />
          {filterOptions.map((option) => (
            <button
              className={cn(
                "min-h-10 shrink-0 rounded px-3 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300",
                filter === option.id
                  ? "bg-assert-500 text-carbon-50 shadow-cta"
                  : "text-carbon-300 hover:bg-carbon-900 hover:text-carbon-50"
              )}
              key={option.id}
              onClick={() => setFilter(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QueueMetric Icon={ListChecks} label="ativas" tone="text-carbon-250" value={metrics.active} />
        <QueueMetric Icon={AlertTriangle} label="atrasadas" tone="text-assert-300" value={metrics.late} />
        <QueueMetric Icon={TimerReset} label="para hoje" tone="text-accent-300" value={metrics.dueToday} />
        <QueueMetric Icon={Clapperboard} label="vídeos" tone="text-signal-300" value={metrics.videos} />
      </div>

      {topDemand ? (
        <section className="rounded-card border border-assert-300/34 bg-carbon-900/42 p-5 shadow-panel-deep">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-assert-300">atacar primeiro</p>
              <h2 className="mt-2 truncate font-display text-2xl font-bold text-carbon-50">{topDemand.title}</h2>
              <p className="mt-2 text-sm font-semibold text-carbon-300">
                {topDemand.client} · {formatDemandScope(topDemand.pieceCount || 1, topDemand.type)} · {topDemand.priorityReason}
              </p>
            </div>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-assert-500 px-5 text-sm font-bold text-carbon-50 shadow-cta transition-all hover:bg-assert-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-assert-300"
              to="/crm/demandas"
            >
              Ir para demanda
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : null}

      <div className="grid gap-3">
        {filteredQueue.length ? (
          filteredQueue.map((demand, index) => <PriorityRow demand={demand} key={demand.id} rank={index + 1} />)
        ) : (
          <div className="rounded-card border border-dashed border-carbon-800 bg-carbon-950/42 p-10 text-center">
            <CheckCircle2 className="mx-auto size-10 text-carbon-500" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-bold text-carbon-100">Nada nesta fila</h2>
            <p className="mt-2 text-sm text-carbon-400">Troque o filtro ou confira novamente quando novas demandas chegarem.</p>
          </div>
        )}
      </div>
    </div>
  );
}
