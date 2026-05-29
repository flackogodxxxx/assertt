import { useMemo } from "react";
import { ArrowRight, Activity, Layers, Timer, Target, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { DropboxMark, CanvaMark } from "../components/brand-icons";
import { USERS_DB, useAuth } from "../contexts/AuthContext";
import { type Demand, type DemandStatus, useDemands } from "../contexts/DemandContext";
import { cn } from "../lib/cn";

const statusMeta: Record<DemandStatus, { label: string; code: string; color: string; glow: string }> = {
  "A Fazer": { code: "FILA", label: "A Fazer", color: "bg-carbon-500", glow: "shadow-none" },
  "Em Andamento": { code: "PROD", label: "Produção", color: "bg-assert-400", glow: "shadow-[0_0_12px_var(--color-assert-400)]" },
  "Em Revisão": { code: "REV", label: "Aprovação", color: "bg-accent-400", glow: "shadow-[0_0_12px_var(--color-accent-400)]" },
  "Concluído": { code: "DONE", label: "Finalizado", color: "bg-signal-400", glow: "shadow-[0_0_12px_var(--color-signal-400)]" }
};

function formatDate(value?: string) {
  if (!value) return "sem prazo";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function AdminDashboard({ visibleDemands }: { visibleDemands: Demand[] }) {
  const activeDemands = useMemo(() => visibleDemands.filter(d => d.status !== "Concluído"), [visibleDemands]);
  const reviewDemands = useMemo(() => visibleDemands.filter(d => d.status === "Em Revisão"), [visibleDemands]);

  const metrics = [
    { label: "Volume Total", value: visibleDemands.length, Icon: Layers, color: "text-carbon-50", border: "border-carbon-800" },
    { label: "Em Produção", value: activeDemands.length, Icon: Timer, color: "text-assert-300", border: "border-assert-300/30", bg: "bg-assert-500/10" },
    { label: "Aguardando Validação", value: reviewDemands.length, Icon: Target, color: "text-accent-300", border: "border-accent-300/30", bg: "bg-accent-500/10" }
  ];

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-glass-stroke pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-carbon-50">Visão Operacional</h1>
          <p className="mt-2 text-carbon-300">Acompanhamento de fluxo e aprovações pendentes.</p>
        </div>
        <Link to="/crm/clientes" className="inline-flex h-11 items-center justify-center gap-2 rounded-card bg-assert-400 px-6 font-bold text-carbon-950 transition-all hover:bg-assert-300 focus:outline-none focus:ring-2 focus:ring-assert-300 focus:ring-offset-2 focus:ring-offset-carbon-950">
          Nova Demanda
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map((m, i) => (
          <div 
            key={m.label} 
            className={cn("relative overflow-hidden rounded-[1.1rem] border p-5 backdrop-blur-xl transition-all", m.border, m.bg || "bg-carbon-900/40")}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-carbon-300">{m.label}</span>
              <m.Icon className={cn("size-5", m.color)} />
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold tracking-tight text-carbon-50">{m.value}</span>
              <span className="text-xs font-semibold text-carbon-500">demandas</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-[1.1rem] border border-glass-stroke bg-carbon-900/34 p-6 shadow-panel">
          <h2 className="mb-6 text-xl font-bold text-carbon-50">Validações Pendentes</h2>
          <div className="grid gap-4">
            {reviewDemands.length > 0 ? (
              reviewDemands.map((demand) => (
                <article key={demand.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-card border border-accent-300/30 bg-carbon-950/50 p-4 transition-all hover:border-accent-300/60">
                  <div className="min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-accent-300">{demand.client}</span>
                    <h3 className="truncate text-base font-bold text-carbon-50 mt-0.5">{demand.title}</h3>
                  </div>
                  <Link to="/crm/demandas" className="shrink-0 rounded-full bg-carbon-800 px-4 py-2 text-xs font-bold text-carbon-100 hover:bg-accent-400 hover:text-carbon-950 transition-colors">
                    Revisar Entrega
                  </Link>
                </article>
              ))
            ) : (
              <div className="py-10 text-center border border-dashed border-carbon-800 rounded-card bg-carbon-950/30">
                <CheckCircle2 className="mx-auto size-8 text-carbon-500 mb-3" />
                <p className="text-carbon-300 text-sm">Nenhuma entrega aguardando validação.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-[1.1rem] border border-glass-stroke bg-carbon-900/34 p-6 shadow-panel">
          <h3 className="flex items-center gap-2 text-lg font-bold text-carbon-50 mb-6">
            <Activity className="size-5 text-carbon-400" />
            Movimentações
          </h3>
          <div className="relative border-l border-glass-stroke ml-3 space-y-6 pb-4">
            {activeDemands.slice(0, 5).map((demand) => (
              <div key={demand.id} className="relative pl-6">
                <span className={cn("absolute -left-1.5 top-1.5 size-3 rounded-full border-2 border-carbon-900", statusMeta[demand.status].color)} />
                <p className="text-sm font-medium text-carbon-200">
                  <span className="text-carbon-50 font-bold">{demand.client}</span> alterado para {demand.status}.
                </p>
                <span className="text-xs text-carbon-500 block mt-1">{formatDate(demand.createdAt)}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function CreatorDashboard({ visibleDemands }: { visibleDemands: Demand[] }) {
  const activeDemands = useMemo(() => {
    return visibleDemands
      .filter(d => d.status !== "Concluído")
      .sort((a, b) => new Date(a.deadline || "9999").getTime() - new Date(b.deadline || "9999").getTime());
  }, [visibleDemands]);

  const heroTask = activeDemands[0];
  const upcomingTasks = activeDemands.slice(1, 4);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="border-b border-glass-stroke pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-carbon-50">Área de Trabalho</h1>
        <p className="mt-2 text-carbon-300">Foque na demanda mais urgente da sua fila.</p>
      </div>

      {heroTask ? (
        <div className="relative overflow-hidden rounded-[1.25rem] border border-assert-300/30 bg-carbon-900/46 p-6 shadow-panel-deep backdrop-blur-2xl sm:p-10">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-assert-400 to-transparent opacity-50" aria-hidden="true" />
          
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-assert-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-assert-300 border border-assert-300/20">
            Foco Atual
          </div>
          
          <div className="mt-2">
            <span className="text-sm font-bold uppercase text-carbon-400">{heroTask.client}</span>
            <h2 className="mt-1 font-display text-4xl font-bold text-carbon-50 leading-tight">
              {heroTask.title}
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-carbon-200 line-clamp-3">
              {heroTask.description || "Sem detalhes adicionais no briefing."}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/crm/demandas" className="inline-flex h-12 items-center justify-center gap-2 rounded-card bg-assert-400 px-8 font-bold text-carbon-950 transition-all hover:bg-assert-300">
              Acessar Demanda
              <ArrowRight className="size-4" />
            </Link>
            
            {heroTask.dropboxLink && (
              <a href={heroTask.dropboxLink} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-card border border-glass-stroke bg-carbon-900 px-6 font-bold text-carbon-100 hover:bg-carbon-800 transition-colors">
                <DropboxMark className="size-4" />
                Arquivos
              </a>
            )}
            
            <div className="ml-auto flex items-center gap-2 text-sm font-medium text-carbon-300 border border-carbon-800 rounded-full px-4 py-2 bg-carbon-950/50">
              <Clock className="size-4 text-assert-300" />
              Prazo: <span className="text-carbon-50 font-bold">{formatDate(heroTask.deadline)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center border border-dashed border-carbon-800 rounded-[1.25rem] bg-carbon-950/30">
          <CheckCircle2 className="mx-auto size-10 text-carbon-500 mb-4" />
          <h2 className="text-xl font-bold text-carbon-100">Fila Limpa</h2>
          <p className="mt-2 text-carbon-300">Você não tem demandas pendentes no momento.</p>
        </div>
      )}

      {upcomingTasks.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 text-lg font-bold text-carbon-50 flex items-center gap-2">
            Próximas na Fila
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingTasks.map(task => (
              <article key={task.id} className="rounded-card border border-carbon-800/80 bg-carbon-950/40 p-4 transition-all hover:border-carbon-700">
                <span className="text-[0.65rem] font-bold uppercase tracking-wider text-carbon-400">{task.client}</span>
                <h4 className="mt-1 truncate font-bold text-carbon-100">{task.title}</h4>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className={cn("px-2 py-0.5 rounded font-bold", statusMeta[task.status].color, "bg-opacity-20")}>
                    {task.status}
                  </span>
                  <span className="text-carbon-500">{formatDate(task.deadline)}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { visibleDemands } = useDemands();

  if (!user) return null;

  const isManagement = user.role === "Admin" || user.role === "Organizador";

  return isManagement 
    ? <AdminDashboard visibleDemands={visibleDemands} /> 
    : <CreatorDashboard visibleDemands={visibleDemands} />;
}
