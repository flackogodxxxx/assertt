import { type CSSProperties, useMemo, useState } from "react";
import { CheckCircle2, Clapperboard, Palette, Search, Sparkles, Users, LayoutGrid, List, Filter, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getClientLogo } from "../data/clientLogos";
import { getAllClients } from "../data/clients";
import { useDemands } from "../contexts/DemandContext";
import { cn } from "../lib/cn";
import { useAuth } from "../contexts/AuthContext";
import { getGlobalAvatar } from "../contexts/AuthContext";

function PersonBadge({ label, tone }: { label?: string; tone: "design" | "video" }) {
  const avatar = label ? getGlobalAvatar(label) : undefined;
  const initials = label
    ? label
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
    : "--";

  return (
    <span
      className={cn(
        "relative size-8 shrink-0 overflow-hidden rounded-full border font-display text-xs font-bold shadow-panel",
        tone === "design"
          ? "border-assert-300/32 bg-assert-500/12 text-assert-300"
          : "border-signal-300/32 bg-signal-400/10 text-signal-300"
      )}
      title={label || "Sem responsável"}
    >
      {avatar ? (
        <img src={avatar} alt={label} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center">{initials}</span>
      )}
    </span>
  );
}

function ClientLogo({ name, size = "large" }: { name: string, size?: "small" | "large" }) {
  const logo = getClientLogo(name);
  const sizeClass = size === "large" ? "size-16" : "size-10";

  if (!logo) {
    return (
      <div
        className={cn(`grid shrink-0 place-items-center rounded-card border border-assert-300/36 bg-assert-500/12 font-display font-bold text-assert-200 shadow-panel`, sizeClass, size === "large" ? "text-xl" : "text-sm")}
        title={`Logo pendente: ${name}`}
      >
        {name.charAt(0)}
      </div>
    );
  }

  return (
    <div
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-card border border-white/16 bg-carbon-50 shadow-[0_18px_48px_rgba(0,0,0,0.28)] transition-all duration-500 group-hover:-rotate-1 group-hover:scale-105 group-hover:shadow-[0_24px_70px_rgba(216,36,255,0.18)]", sizeClass, size === "large" ? "p-2.5" : "p-1.5")}
      title={`Logo conferida: ${name}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(216,36,255,0.16),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.88),rgba(232,239,255,0.96))]"
        aria-hidden="true"
      />
      <img
        alt={`Logo ${name}`}
        className="relative z-10 max-h-full max-w-full object-contain drop-shadow-[0_6px_14px_rgba(5,8,18,0.16)]"
        loading="lazy"
        src={logo}
      />
    </div>
  );
}

export function Clientes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [filterTeam, setFilterTeam] = useState<"all" | "full" | "partial">("all");
  
  const allClients = useMemo(() => getAllClients(), []);
  const { demands } = useDemands();

  const filteredClients = allClients.filter((client) => {
    // Permission check: if not Admin or Organizador, only show clients assigned to this user
    const isCreative = user?.role === "Designer" || user?.role === "Video Maker";
    if (isCreative && client.designer !== user?.name && client.videoMaker !== user?.name) {
      return false;
    }

    const matchesSearch = 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.designer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.videoMaker?.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;
    
    const hasFullTeam = Boolean(client.designer && client.videoMaker);
    if (filterTeam === "full" && !hasFullTeam) return false;
    if (filterTeam === "partial" && hasFullTeam) return false;
    
    return true;
  });

  const summary = useMemo(
    () => [
      { label: "clientes mapeados", value: allClients.length, Icon: Users },
      { label: "com designer", value: allClients.filter((client) => client.designer).length, Icon: Palette },
      { label: "com vídeo", value: allClients.filter((client) => client.videoMaker).length, Icon: Clapperboard },
      {
        label: "dupla completa",
        value: allClients.filter((client) => client.designer && client.videoMaker).length,
        Icon: CheckCircle2
      }
    ],
    [allClients]
  );

  const canCreate = user?.role === "Admin" || user?.role === "Organizador";

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[1.2rem] border border-glass-stroke bg-carbon-900/42 p-6 shadow-panel-deep backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-x-8 top-0 h-px neon-divider" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 crm-panel-scan opacity-60" aria-hidden="true" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)] lg:items-end">
          <div className="min-w-0">
            <div className="mb-5 inline-flex max-w-full items-center gap-3 rounded-card border border-glass-stroke bg-carbon-950/44 px-4 py-3 shadow-panel">
              <Sparkles className="size-5 shrink-0 text-assert-300" aria-hidden="true" />
              <span className="truncate font-display text-xs font-bold uppercase tracking-[0.22em] text-assert-300">
                Work OS: Contas
              </span>
            </div>
            <h2 className="max-w-3xl text-balance font-display text-[clamp(2.2rem,4.5vw,4.6rem)] font-bold leading-[0.96] tracking-tight text-carbon-50">
              Diretório de clientes.
            </h2>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-carbon-200">
              Gerencie a saúde da conta, atribuições e inicie novas demandas com um clique.
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map(({ label, value, Icon }, index) => (
            <article
              className="crm-card-enter min-h-28 rounded-card border border-glass-stroke bg-carbon-950/42 p-4 shadow-panel backdrop-blur-xl"
              key={label}
              style={{ "--crm-card-delay": `${index * 70}ms` } as CSSProperties}
            >
              <div className="flex items-start justify-between gap-3">
                <Icon className="size-6 text-accent-300" aria-hidden="true" />
                <strong className="font-display text-3xl font-bold text-carbon-50">{value}</strong>
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-carbon-400">{label}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Control Bar */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-carbon-400" aria-hidden="true" />
            <input
              className="h-10 w-full rounded-card border border-glass-stroke bg-carbon-900/60 pl-10 pr-4 text-sm text-carbon-50 outline-none transition-all duration-300 focus:border-assert-300 focus:ring-1 focus:ring-assert-300"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar cliente..."
              type="search"
              value={searchTerm}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-carbon-400" aria-hidden="true" />
            <select
              className="h-10 rounded-card border border-glass-stroke bg-carbon-900/60 pl-10 pr-4 text-sm text-carbon-50 outline-none transition-all focus:border-assert-300 appearance-none min-w-[160px]"
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value as "all" | "full" | "partial")}
            >
              <option value="all">Todos os times</option>
              <option value="full">Time completo</option>
              <option value="partial">Falta responsável</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-card border border-glass-stroke bg-carbon-900/40 p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2 rounded-card transition-colors", viewMode === "grid" ? "bg-carbon-800 text-carbon-50" : "text-carbon-400 hover:text-carbon-200")}
            title="Visão em Grid"
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={cn("p-2 rounded-card transition-colors", viewMode === "table" ? "bg-carbon-800 text-carbon-50" : "text-carbon-400 hover:text-carbon-200")}
            title="Visão em Tabela"
          >
            <List className="size-4" />
          </button>
        </div>
      </section>

      {viewMode === "grid" ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredClients.map((client, index) => {
            const clientDemands = demands.filter((demand) => demand.client === client.name);
            const todo = clientDemands.filter(d => d.status === "A Fazer").length;
            const doing = clientDemands.filter(d => d.status === "Em Andamento").length;
            const review = clientDemands.filter(d => d.status === "Em Revisão").length;
            const done = clientDemands.filter(d => d.status === "Concluído").length;
            const total = clientDemands.length;
            
            const hasFullTeam = Boolean(client.designer && client.videoMaker);

            return (
              <article
                className="crm-card-enter group relative flex flex-col overflow-hidden rounded-[1.05rem] border border-glass-stroke bg-carbon-900/38 p-5 shadow-panel backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-assert-300/54 hover:shadow-2xl cursor-pointer"
                key={client.name}
                style={{ "--crm-card-delay": `${(index % 9) * 45}ms` } as CSSProperties}
                onClick={() => navigate(`/crm/clientes/${encodeURIComponent(client.name)}`)}
              >
                <div className="absolute inset-x-6 top-0 h-px neon-divider opacity-0 transition-opacity duration-500 group-hover:opacity-80" aria-hidden="true" />
                
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-xl font-bold leading-tight text-carbon-50">
                      {client.name}
                    </h3>
                    <span
                      className={cn(
                        "mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider",
                        hasFullTeam
                          ? "border-signal-300/30 bg-signal-400/10 text-signal-300"
                          : "border-assert-300/30 bg-assert-500/10 text-assert-300"
                      )}
                    >
                      {hasFullTeam ? "time completo" : "time parcial"}
                    </span>
                  </div>
                  <ClientLogo name={client.name} />
                </div>

                {/* Premium Volume Stats */}
                <div className="mb-6 flex items-center gap-4 rounded-[1.1rem] bg-gradient-to-br from-carbon-950/80 to-carbon-900/40 p-4 border border-glass-stroke shadow-inner">
                  <div className="relative size-14 shrink-0">
                    <svg className="size-full -rotate-90 transform" viewBox="0 0 36 36">
                      <path className="text-carbon-800/60" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-assert-400 drop-shadow-[0_0_6px_rgba(216,36,255,0.6)]" strokeWidth="3.5" strokeDasharray={`${total > 0 ? (done / total) * 100 : 0}, 100`} strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-sm font-bold text-carbon-50 leading-none">{total > 0 ? Math.round((done/total)*100) : 0}%</span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest text-carbon-400 mb-1">Volume do Mês</p>
                    <div className="flex items-end gap-1.5">
                      <span className="text-xl font-bold text-carbon-50 leading-none">{done}</span>
                      <span className="text-xs font-semibold text-carbon-500 mb-0.5">/ {total} entregas</span>
                    </div>
                    {doing > 0 && (
                      <p className="text-[0.65rem] font-bold text-assert-300 mt-1.5 flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-assert-400 animate-pulse-glow" />
                        {doing} em produção
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 mb-6">
                  <div className="flex min-w-0 items-center justify-between gap-3 rounded-card bg-carbon-950/42 px-3 py-2">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-carbon-400">Design</span>
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-bold text-carbon-100">{client.designer || "---"}</span>
                      <PersonBadge label={client.designer} tone="design" />
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-3 rounded-card bg-carbon-950/42 px-3 py-2">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-carbon-400">Vídeo</span>
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-bold text-carbon-100">{client.videoMaker || "---"}</span>
                      <PersonBadge label={client.videoMaker} tone="video" />
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-glass-stroke/50">
                  {canCreate ? (
                    <Link
                      to={`/crm/demandas?newDemandFor=${encodeURIComponent(client.name)}`}
                      className="flex w-full min-h-10 items-center justify-center gap-2 rounded-card bg-carbon-950/80 px-4 text-xs font-bold text-assert-300 transition-all hover:bg-assert-500 hover:text-carbon-50 border border-assert-300/30 hover:border-assert-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Plus className="size-4" />
                      Nova Demanda
                    </Link>
                  ) : (
                    <span className="block text-center text-xs font-semibold text-carbon-500">Sem permissão de criação</span>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[1.2rem] border border-glass-stroke bg-carbon-900/38 overflow-hidden shadow-panel backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-carbon-200">
              <thead className="bg-carbon-950/60 text-xs font-bold uppercase tracking-wider text-carbon-400 border-b border-glass-stroke">
                <tr>
                  <th className="p-4 pl-6 font-display">Cliente</th>
                  <th className="p-4">Time</th>
                  <th className="p-4 w-64">Progresso Geral</th>
                  <th className="p-4 text-right pr-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-stroke/50">
                {filteredClients.map((client) => {
                  const clientDemands = demands.filter((demand) => demand.client === client.name);
                  const todo = clientDemands.filter(d => d.status === "A Fazer").length;
                  const doing = clientDemands.filter(d => d.status === "Em Andamento").length;
                  const review = clientDemands.filter(d => d.status === "Em Revisão").length;
                  const done = clientDemands.filter(d => d.status === "Concluído").length;
                  const total = clientDemands.length;

                  return (
                    <tr 
                      key={client.name} 
                      className="hover:bg-carbon-800/20 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/crm/clientes/${encodeURIComponent(client.name)}`)}
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-4">
                          <ClientLogo name={client.name} size="small" />
                          <span className="font-bold text-carbon-50 text-base">{client.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <PersonBadge label={client.designer} tone="design" />
                          <PersonBadge label={client.videoMaker} tone="video" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-carbon-950 flex overflow-hidden">
                            {total > 0 ? (
                              <>
                                <div style={{ width: `${(done / total) * 100}%` }} className="bg-signal-400" title={`Concluído: ${done}`} />
                                <div style={{ width: `${(review / total) * 100}%` }} className="bg-accent-400" title={`Em Revisão: ${review}`} />
                                <div style={{ width: `${(doing / total) * 100}%` }} className="bg-assert-400" title={`Em Andamento: ${doing}`} />
                                <div style={{ width: `${(todo / total) * 100}%` }} className="bg-carbon-600" title={`A Fazer: ${todo}`} />
                              </>
                            ) : (
                              <div className="w-full bg-carbon-950" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-carbon-400 w-8">{total > 0 ? `${done}/${total}` : "0"}</span>
                        </div>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {canCreate && (
                          <Link
                            to={`/crm/demandas?newDemandFor=${encodeURIComponent(client.name)}`}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-assert-300/30 bg-assert-500/10 px-3 text-xs font-bold text-assert-300 hover:bg-assert-500 hover:text-carbon-50 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Plus className="size-3" />
                            Nova Demanda
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {filteredClients.length === 0 && (
        <div className="rounded-[1.1rem] border border-dashed border-glass-stroke bg-carbon-900/26 p-10 text-center shadow-panel">
          <Search className="mx-auto size-10 text-carbon-400" aria-hidden="true" />
          <h3 className="mt-4 text-xl font-bold text-carbon-100">Nenhum cliente encontrado</h3>
          <p className="mt-2 text-carbon-400">Revise os termos de busca e filtros ativos e tente novamente.</p>
        </div>
      )}
    </div>
  );
}
