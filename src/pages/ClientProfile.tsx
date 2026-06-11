import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CircleDashed,
  Clock,
  ExternalLink,
  Search,
  Send,
  Trash2,
  User
} from "lucide-react";
import { useDemands } from "../contexts/DemandContext";
import { getAllClients } from "../data/clients";
import { useAuth, USERS_DB, getGlobalAvatar } from "../contexts/AuthContext";
import { getClientLogo } from "../data/clientLogos";
import { cn } from "../lib/cn";
import { formatDemandScope } from "../lib/demand-scope";

function formatDate(isoString: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(isoString));
}

function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2);
}

export function ClientProfile() {
  const { clientName } = useParams<{ clientName: string }>();
  const { user } = useAuth();
  const { demands, deleteDemandPermanently } = useDemands();
  const [historyTab, setHistoryTab] = useState<"active" | "archived">("active");
  const [historySearch, setHistorySearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  
  const client = useMemo(() => {
    return getAllClients().find(c => c.name === decodeURIComponent(clientName || ""));
  }, [clientName]);

  const clientDemands = useMemo(() => {
    if (!client) return [];
    
    // Filtra demandas deste cliente
    let filtered = demands.filter(d => d.client === client.name);
    
    // Se for operação, filtra só as que estão atribuídas a ele
    if (user?.role === "Designer" || user?.role === "Video Maker") {
      filtered = filtered.filter(d => d.assigneeIds.includes(user.id));
    }
    
    // Ordena da mais recente para a mais antiga
    return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [demands, client, user]);

  const displayedDemands = useMemo(() => {
    const search = historySearch.trim().toLowerCase();

    return clientDemands.filter((demand) => {
      const matchesTab =
        historyTab === "archived"
          ? demand.status === "Concluído"
          : demand.status !== "Concluído";
      const matchesSearch =
        !search ||
        demand.title.toLowerCase().includes(search) ||
        demand.type.toLowerCase().includes(search) ||
        demand.description.toLowerCase().includes(search);

      return matchesTab && matchesSearch;
    });
  }, [clientDemands, historySearch, historyTab]);

  if (!client || !user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-2xl font-bold text-carbon-50 mb-4">Cliente não encontrado</h2>
        <Link to="/crm/clientes" className="text-assert-300 hover:underline flex items-center gap-2">
          <ArrowLeft className="size-4" /> Voltar para clientes
        </Link>
      </div>
    );
  }

  const logo = getClientLogo(client.name);
  const isAdminOrOrg = user.role === "Admin" || user.role === "Organizador";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link to="/crm/clientes" className="inline-flex items-center gap-2 text-sm font-bold text-carbon-400 hover:text-carbon-200 transition-colors">
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      {/* Header do Perfil */}
      <section className="relative overflow-hidden rounded-[1.2rem] border border-glass-stroke bg-carbon-900/42 p-6 sm:p-8 shadow-panel-deep backdrop-blur-2xl">
        <div className="absolute inset-x-8 top-0 h-px neon-divider" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 crm-panel-scan opacity-60" aria-hidden="true" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {logo ? (
            <div className="size-24 sm:size-32 rounded-[1rem] bg-carbon-50 border border-white/20 shadow-xl flex items-center justify-center p-2">
              <img src={logo} alt={client.name} className="max-w-full max-h-full object-contain drop-shadow-md" />
            </div>
          ) : (
            <div className="size-24 sm:size-32 rounded-[1rem] bg-assert-500/10 border border-assert-300/30 flex items-center justify-center text-assert-300 text-4xl font-display font-bold shadow-xl">
              {client.name.charAt(0)}
            </div>
          )}

          <div className="flex-1 text-center sm:text-left mt-2">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-carbon-50 tracking-tight">{client.name}</h1>
            
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
              <div className="flex items-center gap-2 bg-carbon-950/50 border border-glass-stroke px-4 py-2 rounded-card">
                <span className="text-xs font-bold text-carbon-400 uppercase tracking-widest">Designer:</span>
                <span className="text-sm font-bold text-assert-300">{client.designer || "Nenhum"}</span>
              </div>
              <div className="flex items-center gap-2 bg-carbon-950/50 border border-glass-stroke px-4 py-2 rounded-card">
                <span className="text-xs font-bold text-carbon-400 uppercase tracking-widest">Vídeo:</span>
                <span className="text-sm font-bold text-signal-300">{client.videoMaker || "Nenhum"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Histórico de Demandas */}
      <section>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-carbon-50">
              <Clock className="size-5 text-accent-300" />
              Histórico de demandas
            </h2>
            <p className="mt-1 text-sm text-carbon-400">
              Acompanhe a operação ativa e consulte entregas já aprovadas.
            </p>
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-carbon-500" />
            <span className="sr-only">Buscar no histórico</span>
            <input
              className="min-h-11 w-full rounded-card border border-glass-stroke bg-carbon-950/60 pl-10 pr-4 text-sm text-carbon-100 outline-none focus:border-assert-300"
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Buscar demanda, tipo ou briefing"
              value={historySearch}
            />
          </label>
        </div>

        <div className="mb-5 inline-flex rounded-card border border-glass-stroke bg-carbon-950/55 p-1" role="tablist" aria-label="Histórico do cliente">
          <button
            aria-selected={historyTab === "active"}
            className={cn(
              "min-h-10 rounded px-4 text-sm font-bold transition",
              historyTab === "active" ? "bg-carbon-700 text-carbon-50" : "text-carbon-400 hover:text-carbon-200"
            )}
            onClick={() => setHistoryTab("active")}
            role="tab"
            type="button"
          >
            Ativas ({clientDemands.filter((demand) => demand.status !== "Concluído").length})
          </button>
          <button
            aria-selected={historyTab === "archived"}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded px-4 text-sm font-bold transition",
              historyTab === "archived" ? "bg-carbon-700 text-carbon-50" : "text-carbon-400 hover:text-carbon-200"
            )}
            onClick={() => setHistoryTab("archived")}
            role="tab"
            type="button"
          >
            <Archive className="size-4" />
            Arquivadas ({clientDemands.filter((demand) => demand.status === "Concluído").length})
          </button>
        </div>

        {displayedDemands.length === 0 ? (
          <div className="border border-dashed border-glass-stroke rounded-[1rem] bg-carbon-900/20 p-12 text-center">
            <p className="text-carbon-300 font-medium">
              {historyTab === "archived" ? "Nenhuma demanda arquivada." : "Nenhuma demanda ativa."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedDemands.map((demand) => {
              const author = USERS_DB.find(u => u.id === demand.authorId);
              const assignees = demand.assigneeIds.map(id => USERS_DB.find(u => u.id === id)).filter(Boolean);
              
              const isDone = demand.status === "Concluído";

              return (
                <div key={demand.id} className={cn("rounded-[1rem] border border-glass-stroke bg-carbon-950/60 p-5 shadow-panel transition-all hover:border-assert-300/40", isDone && "opacity-80")}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Infos da Demanda */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {isDone ? (
                          <span className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-signal-300 bg-signal-400/10 px-2 py-1 rounded">
                            <CheckCircle2 className="size-3" /> Concluído
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-assert-300 bg-assert-500/10 px-2 py-1 rounded">
                            <CircleDashed className="size-3" /> {demand.status}
                          </span>
                        )}
                        <span className="text-xs font-bold text-carbon-400 border border-glass-stroke px-2 py-1 rounded">
                          {demand.type}
                        </span>
                        <span className="border border-accent-300/25 bg-accent-400/10 px-2 py-1 text-xs font-bold text-accent-300">
                          {formatDemandScope(demand.pieceCount || 1, demand.type)}
                        </span>
                        {demand.deadline && (
                          <span className="flex items-center gap-1 text-xs font-bold text-carbon-400">
                            <Calendar className="size-3" />
                            {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(demand.deadline))}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-carbon-50">{demand.title}</h3>
                      <p className="text-sm text-carbon-300 mt-1 line-clamp-2">{demand.description}</p>
                    </div>

                    {/* Metadata Contextual (Data, Autor, Destinatário) */}
                    <div className="flex min-w-[240px] flex-col gap-2 rounded-card border border-glass-stroke bg-carbon-900/40 p-3 md:items-end">
                      
                      <div className="flex items-center gap-2 text-xs font-medium text-carbon-300">
                        <Clock className="size-3 text-carbon-400" />
                        <span>Enviado em: <strong className="text-carbon-200">{formatDate(demand.createdAt)}</strong></span>
                      </div>
                      
                      <div className="h-px w-full bg-glass-stroke/50 my-1" />

                      {isAdminOrOrg ? (
                        <>
                          {/* Visão da Gestão: Vê para quem enviou */}
                          <div className="flex items-start gap-2 text-xs">
                            <Send className="size-3 text-assert-300 shrink-0 mt-0.5" />
                            <div className="flex flex-col">
                              <span className="text-carbon-400">Distribuído para:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {assignees.map(a => (
                                  <span key={a?.id} className="font-bold text-assert-300 bg-assert-500/10 px-1.5 rounded">{a?.name} ({a?.role})</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Visão da Operação: Vê quem enviou para ele */}
                          <div className="flex items-center gap-2 text-xs">
                            <User className="size-3 text-accent-300 shrink-0" />
                            <span className="text-carbon-400">Enviado por:</span>
                            <span className="font-bold text-accent-300">{author?.name} ({author?.role})</span>
                          </div>
                        </>
                      )}
                      <div className="mt-2 flex w-full flex-wrap justify-end gap-2 border-t border-glass-stroke/60 pt-3">
                        {demand.deliveryLink && (
                          <a
                            className="inline-flex min-h-9 items-center gap-2 rounded border border-accent-300/30 bg-accent-400/10 px-3 text-xs font-bold text-accent-300"
                            href={demand.deliveryLink}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <ExternalLink className="size-3.5" />
                            Entrega
                          </a>
                        )}
                        {user.role === "Admin" && isDone && (
                          <button
                            className="inline-flex min-h-9 items-center gap-2 rounded border border-red-400/30 bg-red-500/10 px-3 text-xs font-bold text-red-300 hover:bg-red-500/15"
                            onClick={() => {
                              setDeleteTarget(demand.id);
                              setDeleteConfirmation("");
                            }}
                            type="button"
                          >
                            <Trash2 className="size-3.5" />
                            Excluir definitivamente
                          </button>
                        )}
                      </div>
                    </div>
                    
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {deleteTarget && (() => {
        const target = clientDemands.find((demand) => demand.id === deleteTarget);
        if (!target) return null;

        return (
          <div className="fixed inset-0 z-50 grid place-items-center bg-carbon-950/88 p-4 backdrop-blur-xl">
            <div aria-modal="true" className="w-full max-w-lg rounded-[0.75rem] border border-red-400/25 bg-carbon-900 p-6 shadow-panel-deep" role="dialog">
              <div className="flex items-center gap-3 text-red-300">
                <Trash2 className="size-5" />
                <h3 className="text-lg font-bold">Excluir demanda arquivada</h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-carbon-300">
                Esta ação remove a demanda, notificações e histórico associado. Digite o título abaixo para confirmar:
              </p>
              <p className="mt-3 rounded border border-carbon-800 bg-carbon-950/55 p-3 text-sm font-bold text-carbon-100">
                {target.title}
              </p>
              <input
                autoFocus
                className="mt-4 min-h-11 w-full rounded-card border border-glass-stroke bg-carbon-950/65 px-4 text-sm text-carbon-50 outline-none focus:border-red-400"
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder="Digite o título exato"
                value={deleteConfirmation}
              />
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="min-h-11 rounded-card border border-glass-stroke px-4 text-sm font-bold text-carbon-300"
                  onClick={() => setDeleteTarget(null)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="min-h-11 rounded-card bg-red-500 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={deleteConfirmation !== target.title}
                  onClick={async () => {
                    if (await deleteDemandPermanently(target.id)) {
                      setDeleteTarget(null);
                      setDeleteConfirmation("");
                    }
                  }}
                  type="button"
                >
                  Excluir definitivamente
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
