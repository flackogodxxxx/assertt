import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, User, Send, CheckCircle2, CircleDashed, Users, ExternalLink, Calendar } from "lucide-react";
import { useDemands } from "../contexts/DemandContext";
import { getAllClients } from "../data/clients";
import { useAuth, USERS_DB, getGlobalAvatar } from "../contexts/AuthContext";
import { getClientLogo } from "../data/clientLogos";
import { cn } from "../lib/cn";

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
  const { demands } = useDemands();
  
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
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [demands, client, user]);

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
        <h2 className="text-xl font-bold text-carbon-50 mb-6 flex items-center gap-2">
          <Clock className="size-5 text-accent-300" /> 
          Histórico de Demandas
        </h2>

        {clientDemands.length === 0 ? (
          <div className="border border-dashed border-glass-stroke rounded-[1rem] bg-carbon-900/20 p-12 text-center">
            <p className="text-carbon-300 font-medium">Nenhuma demanda registrada para este cliente.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {clientDemands.map((demand) => {
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
                    <div className="flex flex-col gap-2 md:items-end min-w-[240px] bg-carbon-900/40 p-3 rounded-card border border-glass-stroke">
                      
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
                    </div>
                    
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
