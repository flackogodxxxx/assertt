import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Link as LinkIcon,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Search,
  Filter,
  MessageSquare
} from "lucide-react";
import { DropboxMark, CanvaMark } from "../components/brand-icons";
import { Button } from "../components/ui/button";
import { USERS_DB, useAuth, getGlobalAvatar } from "../contexts/AuthContext";
import { type Demand, type DemandStatus, type DemandType, type Comment, useDemands } from "../contexts/DemandContext";
import { useNotification } from "../contexts/NotificationContext";
import { getAllClients } from "../data/clients";
import { cn } from "../lib/cn";
import { DemandReviewWorkspace } from "../components/DemandReviewWorkspace";
import { VideoReviewPlayer } from "../components/VideoReviewPlayer";
import { callGeminiJson, getDefaultGeminiModel } from "../lib/gemini";
import {
  buildPieceInstructions,
  formatDemandScope,
  normalizePieceCount,
  getDemandScopeLabel
} from "../lib/demand-scope";

const columns: { id: DemandStatus; title: string; subtitle: string; tone: string }[] = [
  { id: "A Fazer", title: "Entrada", subtitle: "briefing recebido", tone: "text-carbon-150" },
  { id: "Em Andamento", title: "Produção", subtitle: "responsável atuando", tone: "text-assert-300" },
  { id: "Em Revisão", title: "Aprovação", subtitle: "admin decide", tone: "text-accent-300" },
  { id: "Concluído", title: "Entregue", subtitle: "material finalizado", tone: "text-signal-300" }
];

const fieldClass =
  "min-h-12 w-full rounded-card border border-glass-stroke bg-carbon-950/66 px-4 text-carbon-50 shadow-inner outline-none transition-all duration-300 placeholder:text-carbon-500 focus:border-accent-300 focus:ring-2 focus:ring-accent-300/42";

function formatDate(value?: string) {
  if (!value) {
    return "sem prazo";
  }

  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2);
}

function ResourceLink({
  href,
  label,
  kind
}: {
  href?: string;
  label: string;
  kind: "dropbox" | "canva";
}) {
  const Icon = kind === "dropbox" ? DropboxMark : CanvaMark;

  if (!href) {
    return (
      <span className="inline-flex min-h-11 items-center gap-2 rounded-card border border-carbon-800 bg-carbon-900/42 px-3 text-xs font-bold text-carbon-500">
        <Icon className="size-5" />
        {label} ausente
      </span>
    );
  }

  return (
    <a
      className={cn(
        "group/link inline-flex min-h-11 min-w-0 items-center gap-2 rounded-card border px-3 text-xs font-bold transition-all duration-300 hover:scale-[1.03] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-950",
        kind === "dropbox"
          ? "border-signal-300/30 bg-signal-400/10 text-signal-300 hover:bg-signal-400/16 focus-visible:ring-signal-300"
          : "border-assert-300/30 bg-assert-500/10 text-assert-300 hover:bg-assert-500/16 focus-visible:ring-assert-300"
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <Icon className="size-5 shrink-0 transition-transform duration-300 group-hover/link:rotate-[-6deg] group-hover/link:scale-110" />
      <span className="truncate">{label}</span>
      <ExternalLink className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
    </a>
  );
}

function getReviewVideoUrl(demand: Demand) {
  const latestDelivery = demand.deliveries?.[demand.deliveries.length - 1]?.url;
  const link = demand.videoUrl || latestDelivery || demand.deliveryLink || demand.dropboxLink;

  if (!link) {
    return undefined;
  }

  if (link.includes("dropbox.com")) {
    return link.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
  }

  return link;
}

function isDemandInReview(demand: Demand) {
  return demand.status === "Em Revisão";
}

async function generateDemandCaption(demand: Demand) {
  return callGeminiJson<{ caption?: string; transcription?: string }>({
    model: getDefaultGeminiModel(),
    prompt: `Crie uma legenda pronta para redes sociais a partir desta demanda do CRM.

Cliente: ${demand.client}
Titulo: ${demand.title}
Tipo: ${demand.type}
Briefing: ${demand.description || "Sem briefing detalhado."}

Responda somente JSON valido neste formato:
{
  "caption": "texto da legenda"
}`,
    systemInstruction:
      "Voce e um social media senior de uma agencia de tecnologia. Escreva em portugues do Brasil, com tom profissional, claro e comercial. Nao inclua explicacoes fora do JSON."
  });
}

function DemandCard({
  canApprove,
  canMove,
  demand,
  index,
  onStatusChange,
  onClick
}: {
  canApprove: boolean;
  canMove: boolean;
  demand: Demand;
  index: number;
  onStatusChange: (id: string, status: DemandStatus) => void;
  onClick: () => void;
}) {
  const { user } = useAuth();
  const { updateDemand } = useDemands();
  const { showNotification } = useNotification();
  const [isGenerating, setIsGenerating] = useState(false);

  const assignees = demand.assigneeIds
    .map((assigneeId) => USERS_DB.find((candidate) => candidate.id === assigneeId))
    .filter(Boolean);

  return (
    <article
      draggable={canMove}
      onDragStart={(e) => e.dataTransfer.setData("demandId", demand.id)}
      className={cn(
        "crm-card-enter group relative min-h-[24rem] rounded-[1rem] border border-glass-stroke bg-carbon-950/58 p-4 shadow-panel backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-assert-300/55 hover:shadow-2xl",
        canMove ? "cursor-grab active:cursor-grabbing" : ""
      )}
      style={{ "--crm-card-delay": `${(index % 8) * 55}ms` } as CSSProperties}
      onClick={(e) => {
        // Prevent click if clicking a button or link inside
        if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) return;
        onClick();
      }}
    >
      <div className="absolute inset-x-5 top-0 h-px neon-divider opacity-0 transition-opacity duration-500 group-hover:opacity-80" aria-hidden="true" />

      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="rounded-full border border-assert-300/28 bg-assert-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-assert-300">
          {demand.type}
        </span>
        <div className="flex items-center gap-2">
          {demand.deliveryLink && (
            <a
              aria-label="Abrir entrega"
              className="grid size-9 shrink-0 place-items-center rounded-card border border-accent-300/30 bg-accent-400/10 text-accent-300 transition-all duration-300 hover:scale-105 hover:bg-accent-400/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
              href={demand.deliveryLink}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      <h4 className="line-clamp-2 min-h-[3.2rem] text-lg font-bold leading-snug text-carbon-50">{demand.title}</h4>
      <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-carbon-300">
        {demand.description || "Sem briefing detalhado."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-accent-300/28 bg-accent-400/10 px-3 py-1 text-xs font-bold text-accent-300">
          {formatDemandScope(demand.pieceCount || 1, demand.type)}
        </span>
        <span className="rounded-full border border-carbon-700/80 bg-carbon-900/60 px-3 py-1 text-xs font-bold text-carbon-200">
          {demand.client}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-signal-300/24 bg-signal-400/10 px-3 py-1 text-xs font-bold text-signal-300">
          <Calendar className="size-3.5" aria-hidden="true" />
          {formatDate(demand.deadline)}
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        <ResourceLink href={demand.dropboxLink} kind="dropbox" label={`${getDemandScopeLabel(demand.type, true).replace(/^\w/, c => c.toUpperCase())} no Dropbox`} />
        <ResourceLink href={demand.planningLink} kind="canva" label="Planejamento / roteiro" />
      </div>

      {demand.caption && (
        <div className="mt-4 rounded-[0.8rem] border border-assert-300/30 bg-assert-500/10 p-3 relative overflow-hidden group/caption">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-assert-400 to-transparent opacity-50" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.65rem] font-bold uppercase tracking-widest text-assert-300 flex items-center gap-1.5"><Sparkles className="size-3" /> Legenda de IA</span>
            <button
              className="text-xs font-bold text-assert-300 hover:text-assert-200 transition-colors bg-assert-500/20 px-2 py-1 rounded"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(demand.caption!);
                showNotification("Legenda copiada", "O texto foi copiado para a area de transferencia.", "success");
              }}
            >
              📋 Copiar
            </button>
          </div>
          <p className="text-xs text-carbon-200 whitespace-pre-wrap leading-relaxed">{demand.caption}</p>
        </div>
      )}

      <div className="mt-4 flex min-h-10 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {assignees.length ? (
            assignees.map((assignee) => (
              <span
                className="relative size-10 shrink-0 overflow-hidden rounded-full border border-glass-stroke bg-carbon-900 font-display text-xs font-bold text-carbon-100 shadow-panel"
                key={assignee!.id}
                title={assignee!.name}
              >
                {getGlobalAvatar(assignee!.email) ? (
                  <img src={getGlobalAvatar(assignee!.email)} alt={assignee!.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center">{initials(assignee!.name)}</span>
                )}
              </span>
            ))
          ) : (
            <span className="text-xs font-semibold text-carbon-500">sem responsável</span>
          )}
        </div>
        {demand.comments && demand.comments.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-carbon-400">
            <MessageSquare className="size-4" />
            {demand.comments.length}
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-glass-stroke/60 pt-4">
        {demand.status === "A Fazer" && canMove && (
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-card border border-glass-stroke bg-carbon-900/70 px-3 text-xs font-bold text-carbon-200 transition-all duration-300 hover:scale-105 hover:border-assert-300/60 hover:text-assert-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-assert-300"
            onClick={() => onStatusChange(demand.id, "Em Andamento")}
            type="button"
          >
            <Clock3 className="size-4" aria-hidden="true" />
            Iniciar
          </button>
        )}

        {demand.status === "Em Andamento" && canMove && (
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-card border border-glass-stroke bg-carbon-900/70 px-3 text-xs font-bold text-carbon-200 transition-all duration-300 hover:scale-105 hover:border-accent-300/60 hover:text-accent-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
            onClick={() => onStatusChange(demand.id, "Em Revisão")}
            type="button"
          >
            <Send className="size-4" aria-hidden="true" />
            Revisão
          </button>
        )}

        {demand.status === "Em Revisão" && canApprove && (
          <>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-card border border-signal-300/30 bg-signal-400/10 px-3 text-xs font-bold text-signal-300 transition-all duration-300 hover:scale-105 hover:bg-signal-400/16 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-300"
              onClick={() => onStatusChange(demand.id, "Concluído")}
              type="button"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Aprovar
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-card border border-assert-300/30 bg-assert-500/10 px-3 text-xs font-bold text-assert-300 transition-all duration-300 hover:scale-105 hover:bg-assert-500/16 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-assert-300"
              onClick={() => onStatusChange(demand.id, "Em Andamento")}
              type="button"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Ajustar
            </button>
          </>
        )}

        {demand.status === "Em Revisão" && !canApprove && (
          <span className="inline-flex min-h-10 items-center gap-2 rounded-card border border-accent-300/24 bg-accent-400/10 px-3 text-xs font-bold text-accent-300">
            <ShieldCheck className="size-4" aria-hidden="true" />
            QC revisa
          </span>
        )}

        {demand.type === "Vídeo" && user?.role === "Video Maker" && demand.status !== "Concluído" && !demand.caption && (
          <button
            className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-card border border-assert-300/30 bg-assert-500/10 px-3 text-xs font-bold text-assert-300 transition-all duration-300 hover:scale-105 hover:bg-assert-500/20 active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-assert-300"
            onClick={async (e) => {
              e.stopPropagation();
              setIsGenerating(true);
              try {
                const result = await generateDemandCaption(demand);
                const caption = result.caption || result.transcription;
                if (!caption) {
                  throw new Error("Gemini nao retornou legenda.");
                }
                updateDemand(demand.id, {
                  caption
                });
                showNotification("Legenda gerada", "A legenda foi anexada a demanda.", "success");
              } catch (error) {
                showNotification(
                  "IA indisponivel",
                  error instanceof Error ? error.message : "Nao foi possivel gerar a legenda agora.",
                  "warning"
                );
              } finally {
                setIsGenerating(false);
              }
            }}
            disabled={isGenerating}
            type="button"
          >
            <Sparkles className={cn("size-4", isGenerating && "animate-pulse")} aria-hidden="true" />
            {isGenerating ? "Gerando..." : "Gerar Legenda"}
          </button>
        )}
      </div>
    </article>
  );
}

function MyTasksView({ demands, onStatusChange, onClick }: { demands: Demand[], onStatusChange: (id: string, s: DemandStatus) => void, onClick: (d: Demand) => void }) {
  const { user } = useAuth();
  
  // Foca nas demandas não concluídas, priorizando as atribuídas ao usuário
  const myDemands = useMemo(() => {
    return demands
      .filter(d => d.status !== "Concluído")
      .sort((a, b) => {
        // Priorizar as que eu estou como assignee
        const aIsMine = a.assigneeIds.includes(user?.id || "");
        const bIsMine = b.assigneeIds.includes(user?.id || "");
        if (aIsMine && !bIsMine) return -1;
        if (!aIsMine && bIsMine) return 1;
        // Priorizar as com prazo mais próximo
        if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        return 0;
      });
  }, [demands, user?.id]);

  if (myDemands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-glass-stroke border-dashed rounded-[1.2rem] bg-carbon-950/40">
        <Sparkles className="size-10 text-carbon-400 mb-4" />
        <h3 className="text-xl font-bold text-carbon-50">Nenhuma demanda ativa na fila!</h3>
        <p className="text-carbon-300 mt-2">Você concluiu tudo. Bom trabalho.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {myDemands.map((demand, i) => (
        <div key={demand.id} className="group relative flex flex-col rounded-card border border-glass-stroke bg-carbon-950/66 p-5 shadow-panel transition-all hover:scale-[1.02] hover:border-assert-300/50 hover:bg-carbon-900 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="mb-3 flex items-start justify-between">
            <span className={cn("text-[0.65rem] font-bold uppercase tracking-widest px-2 py-1 rounded-sm", demand.status === "A Fazer" ? "bg-carbon-800 text-carbon-300" : demand.status === "Em Andamento" ? "bg-accent-500/20 text-accent-300" : "bg-signal-400/20 text-signal-300")}>
              {demand.status}
            </span>
            <div className="flex items-center gap-2">
              {demand.deadline && <span className="text-[0.65rem] font-bold text-assert-300 bg-assert-500/10 px-2 py-1 rounded-sm">{formatDate(demand.deadline)}</span>}
            </div>
          </div>
          <h4 className="text-lg font-bold text-carbon-50 mb-1">{demand.title}</h4>
          <p className="text-xs text-carbon-300 font-semibold">{demand.client}</p>
          <p className="mt-2 mb-4 text-xs font-bold text-accent-300">
            {formatDemandScope(demand.pieceCount || 1, demand.type)}
          </p>
          
          <div className="mt-auto pt-4 flex gap-2">
            <button onClick={() => onClick(demand)} className="flex-1 bg-carbon-800 hover:bg-carbon-700 text-carbon-50 font-bold text-xs py-2 rounded border border-glass-stroke transition-all">Ver Detalhes</button>
            {demand.status !== "Em Revisão" && (
              <button onClick={() => onStatusChange(demand.id, demand.status === "A Fazer" ? "Em Andamento" : "Em Revisão")} className="flex-1 bg-assert-500 hover:bg-assert-400 text-carbon-50 font-bold text-xs py-2 rounded transition-all shadow-cta flex items-center justify-center gap-1">
                {demand.status === "A Fazer" ? "Iniciar" : "Entregar"}
                <ArrowRight className="size-3" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

import { useLocation, useSearchParams } from "react-router-dom";
export function Demandas() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { visibleDemands: allVisibleDemands, addDemand, updateDemandStatus, addComment } = useDemands();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const visibleDemands = useMemo(() => {
    let filtered = allVisibleDemands;
    
    if (location.pathname.includes("/videos")) {
      filtered = filtered.filter(d => d.type === "Vídeo" || d.type === "Ambos");
    } else if (location.pathname.includes("/artes")) {
      filtered = filtered.filter(d => d.type === "Arte" || d.type === "Ambos");
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.title.toLowerCase().includes(q) || 
        d.client.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q)
      );
    }
    
    if (dateFilter) {
      filtered = filtered.filter(d => d.deadline && d.deadline.startsWith(dateFilter));
    }
    
    return filtered;
  }, [allVisibleDemands, location.pathname, searchQuery, dateFilter]);
  const { showNotification } = useNotification();

  const [isModalOpen, setIsModalOpen] = useState(() => searchParams.has("newDemandFor"));
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newClient, setNewClient] = useState(searchParams.get("newDemandFor") || "");
  const [newType, setNewType] = useState<DemandType>(location.pathname.includes("/artes") ? "Arte" : "Vídeo");
  const [newDeadline, setNewDeadline] = useState("");
  const [newDropboxLink, setNewDropboxLink] = useState("");
  const [newPlanningLink, setNewPlanningLink] = useState("");
  const [newPieceCount, setNewPieceCount] = useState(1);
  const [newPieceInstructions, setNewPieceInstructions] = useState("");
  const [deliveryLink, setDeliveryLink] = useState("");
  const [deliveryDesc, setDeliveryDesc] = useState("");
  const [promptDemandForReview, setPromptDemandForReview] = useState<Demand | null>(null);
  const [selectedPiecesForReview, setSelectedPiecesForReview] = useState<number[]>([]);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [newComment, setNewComment] = useState("");

  const canCreate = user?.role === "Admin" || user?.role === "Organizador";
  const canApprove = user?.role === "Admin";

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
        setSelectedDemand(null);
        setPromptDemandForReview(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const allClients = useMemo(() => getAllClients(), []);
  const selectedClient = allClients.find((client) => client.name === newClient);

  if (!user) {
    return null;
  }

  const getAssigneesFor = (clientName: string, type: DemandType) => {
    const clientData = allClients.find((client) => client.name === clientName);
    const assignees: string[] = [];

    if (!clientData) {
      return assignees;
    }

    if ((type === "Arte" || type === "Ambos") && clientData.designer) {
      const designer = USERS_DB.find((candidate) => candidate.name === clientData.designer && candidate.role === "Designer");

      if (designer) {
        assignees.push(designer.id);
      }
    }

    if ((type === "Vídeo" || type === "Ambos") && clientData.videoMaker) {
      const videoMaker = USERS_DB.find((candidate) => candidate.name === clientData.videoMaker && candidate.role === "Video Maker");

      if (videoMaker) {
        assignees.push(videoMaker.id);
      }
    }

    return [...new Set(assignees)];
  };

  const previewAssignees = getAssigneesFor(newClient, newType)
    .map((assigneeId) => USERS_DB.find((candidate) => candidate.id === assigneeId))
    .filter(Boolean);

  const resetForm = () => {
    setNewTitle("");
    setNewDesc("");
    setNewClient("");
    setNewType("Vídeo");
    setNewDeadline("");
    setNewDropboxLink("");
    setNewPlanningLink("");
    setNewPieceCount(1);
    setNewPieceInstructions("");
  };

  const handleCreateDemand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newTitle || !newClient || !newDropboxLink) {
      showNotification("Informações obrigatórias", "Preencha o título, cliente e link do Dropbox.", "warning");
      return;
    }
    
    if (!newPlanningLink.trim() && !newDesc.trim()) {
      showNotification(
        "Informações obrigatórias",
        "É obrigatório fornecer o Link do Planejamento (Canva) OU o Briefing interno detalhado.",
        "warning"
      );
      return;
    }

    const assigneeIds = getAssigneesFor(newClient, newType);

    if (!assigneeIds.length) {
      showNotification(
        "Sem responsável definido",
        "Esse cliente ainda não tem uma pessoa cadastrada para o tipo de demanda escolhido.",
        "warning"
      );
      return;
    }

    addDemand({
      assigneeIds,
      authorId: user.id,
      client: newClient,
      deadline: newDeadline ? new Date(`${newDeadline}T12:00:00`).toISOString() : undefined,
      description: newDesc,
      dropboxLink: newDropboxLink,
      planningLink: newPlanningLink,
      pieceCount: normalizePieceCount(newPieceCount),
      pieceInstructions: buildPieceInstructions(newPieceInstructions, newPieceCount),
      title: newTitle,
      type: newType
    });

    setIsModalOpen(false);
    resetForm();
    if (searchParams.has("newDemandFor")) {
      setSearchParams(new URLSearchParams());
    }
  };

  const handleStatusChange = (id: string, newStatus: DemandStatus) => {
    if (newStatus === "Concluído" && !canApprove) {
      showNotification("Acesso negado", "Apenas administradores podem concluir demandas.", "warning");
      return;
    }

    if (newStatus === "Em Revisão") {
      const demand = visibleDemands.find(d => d.id === id);
      if (demand) setPromptDemandForReview(demand);
      return;
    }

    updateDemandStatus(id, newStatus);
  };

  const submitLinkAndReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!promptDemandForReview || !deliveryLink.trim()) {
      showNotification("Informações ausentes", "Preencha o link da entrega.", "warning");
      return;
    }
    
    let finalDesc = deliveryDesc.trim();
    if (promptDemandForReview.pieceCount && promptDemandForReview.pieceCount > 1 && selectedPiecesForReview.length > 0) {
      const scopeLabel = getDemandScopeLabel(promptDemandForReview.type, selectedPiecesForReview.length > 1);
      const scopeLabelCapitalized = scopeLabel.charAt(0).toUpperCase() + scopeLabel.slice(1);
      finalDesc = `${scopeLabelCapitalized} entregue(s): ${selectedPiecesForReview.map(p => p + 1).join(", ")}`;
      if (deliveryDesc.trim()) {
        finalDesc += ` - ${deliveryDesc.trim()}`;
      }
    } else if (!finalDesc) {
      showNotification("Informações ausentes", "Preencha a descrição da entrega.", "warning");
      return;
    }

    updateDemandStatus(promptDemandForReview.id, "Em Revisão", { 
      url: deliveryLink, 
      description: finalDesc,
      pieces: selectedPiecesForReview 
    });
    setPromptDemandForReview(null);
    setDeliveryLink("");
    setDeliveryDesc("");
    setSelectedPiecesForReview([]);
  };

  const cardsByStatus = (status: DemandStatus) => visibleDemands.filter((demand) => demand.status === status);

  const isVideos = location.pathname.includes("/videos");
  const isArtes = location.pathname.includes("/artes");

  const pageTitle = isVideos 
    ? "Fila de Edição de Vídeo." 
    : isArtes 
      ? "Fila de Design e Artes." 
      : "Acompanhe e mova as demandas ativas.";

  const pageSubtitle = isVideos
    ? "Visão específica do pipeline de audiovisual."
    : isArtes
      ? "Visão específica do pipeline de criação gráfica."
      : "Visão geral do pipeline de criação. Arraste os cards para atualizar o status e clique para ver os detalhes.";

  const badgeText = isVideos ? "audiovisual" : isArtes ? "design" : "visão operacional";

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[1.2rem] border border-glass-stroke bg-carbon-900/42 p-6 shadow-panel-deep backdrop-blur-2xl sm:p-8">
        <div className="absolute inset-x-8 top-0 h-px neon-divider" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 crm-panel-scan opacity-60" aria-hidden="true" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-5 inline-flex max-w-full items-center gap-3 rounded-card border border-glass-stroke bg-carbon-950/44 px-4 py-3 shadow-panel">
              <span className="grid size-8 place-items-center rounded-card border border-assert-300/34 bg-assert-500/10 text-assert-300">
                <Send className="size-4" aria-hidden="true" />
              </span>
              <Sparkles className="size-5 shrink-0 text-assert-300" aria-hidden="true" />
              <span className="truncate font-display text-xs font-bold uppercase tracking-[0.22em] text-assert-300">
                {badgeText}
              </span>
            </div>
            <h2 className="max-w-3xl text-balance font-display text-[clamp(2.2rem,4.5vw,4.6rem)] font-bold leading-[0.96] tracking-tight text-carbon-50">
              {pageTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-carbon-200">
              {pageSubtitle}
            </p>
            
            {/* Search and Filters */}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-carbon-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisar demandas ou clientes..." 
                  className="h-11 w-full rounded-card border border-glass-stroke bg-carbon-950/66 pl-10 pr-4 text-sm text-carbon-50 outline-none transition-all focus:border-accent-300"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-carbon-400" />
                <input 
                  type="date" 
                  className="h-11 rounded-card border border-glass-stroke bg-carbon-950/66 pl-10 pr-4 text-sm text-carbon-50 outline-none transition-all focus:border-accent-300 [color-scheme:dark]"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>
          </div>

          {canCreate && (
            <Button className="w-full sm:w-auto" onClick={() => setIsModalOpen(true)} size="lg">
              <Plus className="size-5" aria-hidden="true" />
              Nova demanda
              <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
          )}
        </div>

        <div className="relative z-10 mt-7 grid gap-3 sm:grid-cols-3">
          {[
            { label: "visíveis para você", value: visibleDemands.length, Icon: UserRoundCheck },
            { label: "em aprovação", value: visibleDemands.filter((demand) => demand.status === "Em Revisão").length, Icon: FileCheck2 },
            { label: "concluídas", value: visibleDemands.filter((demand) => demand.status === "Concluído").length, Icon: CheckCircle2 }
          ].map(({ label, value, Icon }, index) => (
            <article
              className="crm-card-enter rounded-card border border-glass-stroke bg-carbon-950/42 p-4 shadow-panel"
              key={label}
              style={{ "--crm-card-delay": `${index * 70}ms` } as CSSProperties}
            >
              <div className="flex items-center justify-between gap-3">
                <Icon className="size-6 text-accent-300" aria-hidden="true" />
                <strong className="font-display text-3xl font-bold text-carbon-50">{value}</strong>
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-carbon-400">{label}</p>
            </article>
          ))}
        </div>
      </section>

      {isVideos || isArtes ? (
        <MyTasksView demands={visibleDemands} onStatusChange={handleStatusChange} onClick={setSelectedDemand} />
      ) : (
        <section className="crm-kanban-scroll flex gap-4 overflow-x-auto pb-4 xl:grid xl:auto-cols-fr xl:grid-flow-col xl:overflow-visible min-h-[60vh]">
          {columns.map((column) => {
            const columnDemands = cardsByStatus(column.id);

            return (
              <div 
                className="flex w-[18rem] shrink-0 flex-col rounded-[1.05rem] border border-glass-stroke bg-carbon-900/28 p-3 shadow-panel backdrop-blur-xl transition-colors duration-300 drag-over:bg-carbon-800/40 xl:w-auto" 
                key={column.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("bg-carbon-800/40");
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("bg-carbon-800/40");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("bg-carbon-800/40");
                  const demandId = e.dataTransfer.getData("demandId");
                  if (demandId) {
                    handleStatusChange(demandId, column.id);
                  }
                }}
              >
                <div className="mb-3 flex min-h-16 shrink-0 items-center justify-between gap-3 rounded-card border border-carbon-800/80 bg-carbon-950/46 p-3">
                  <div className="min-w-0">
                    <h3 className={cn("truncate text-sm font-bold", column.tone)}>{column.title}</h3>
                    <p className="mt-1 truncate text-xs font-semibold text-carbon-500">{column.subtitle}</p>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-card bg-carbon-900 font-display text-sm font-bold text-carbon-100">
                    {columnDemands.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-1 grid auto-rows-max gap-3 custom-scrollbar">
                  {columnDemands.length ? (
                    columnDemands.map((demand, index) => (
                      <DemandCard
                        canApprove={canApprove}
                        canMove={true}
                        demand={demand}
                        index={index}
                        key={demand.id}
                        onStatusChange={handleStatusChange}
                        onClick={() => setSelectedDemand(demand)}
                      />
                    ))
                  ) : (
                    <div className="min-h-40 rounded-card border border-dashed border-carbon-800 bg-carbon-950/28 p-5 text-center">
                      <Sparkles className="mx-auto size-7 text-carbon-500" aria-hidden="true" />
                      <p className="mt-4 text-sm font-bold text-carbon-300">Nenhuma demanda aqui</p>
                      <p className="mt-1 text-xs leading-5 text-carbon-500">Quando houver novas demandas nesta etapa, elas aparecerão aqui.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-carbon-950/82 p-4 backdrop-blur-xl animate-in fade-in">
          <form
            className="crm-modal-panel relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-[1.2rem] border border-glass-stroke bg-carbon-900/94 shadow-panel-deep backdrop-blur-2xl"
            onSubmit={handleCreateDemand}
          >
            <div className="absolute inset-x-8 top-0 h-px neon-divider" aria-hidden="true" />
            
            <div className="shrink-0 mb-2 flex items-start justify-between gap-4 p-5 sm:p-7 pb-0 sm:pb-0">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-assert-300">
                  nova atribuição
                </p>
                <h3 className="mt-2 text-2xl font-bold text-carbon-50">Enviar demanda</h3>
              </div>
              <button
                className="rounded-card border border-glass-stroke bg-carbon-950/48 px-3 py-2 text-sm font-bold text-carbon-250 transition-all duration-300 hover:bg-carbon-800 hover:text-carbon-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
                onClick={() => {
                  setIsModalOpen(false);
                  if (searchParams.has("newDemandFor")) setSearchParams(new URLSearchParams());
                }}
                type="button"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-4 custom-scrollbar">
              <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-carbon-200">Título da demanda</span>
                <input
                  className={fieldClass}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="Ex: Reels de oferta do mês"
                  required
                  value={newTitle}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-carbon-200">Cliente</span>
                  <select className={fieldClass} onChange={(event) => setNewClient(event.target.value)} required value={newClient}>
                    <option value="">Selecione...</option>
                    {allClients.map((client) => (
                      <option key={client.name} value={client.name}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-carbon-200">Tipo</span>
                  <select className={fieldClass} onChange={(event) => setNewType(event.target.value as DemandType)} value={newType}>
                    <option value="Vídeo">Vídeo</option>
                    <option value="Arte">Arte</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-carbon-200">Prazo</span>
                  <input
                    className={cn(fieldClass, "[color-scheme:dark]")}
                    onChange={(event) => setNewDeadline(event.target.value)}
                    type="date"
                    value={newDeadline}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold text-carbon-200">
                    <DropboxMark className="size-5 text-signal-300" />
                    Link do Dropbox
                  </span>
                  <input
                    className={fieldClass}
                    onChange={(event) => setNewDropboxLink(event.target.value)}
                    placeholder="https://www.dropbox.com/..."
                    required
                    type="url"
                    value={newDropboxLink}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold text-carbon-200">
                    <CanvaMark className="size-5 text-assert-300" />
                    Link do planejamento / roteiro (Opcional se houver briefing)
                  </span>
                  <input
                    className={fieldClass}
                    onChange={(event) => setNewPlanningLink(event.target.value)}
                    placeholder="https://www.canva.com/..."
                    type="url"
                    value={newPlanningLink}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-carbon-200">Quantidade de {getDemandScopeLabel(newType, true)}</span>
                  <input
                    aria-describedby="piece-count-help"
                    className={fieldClass}
                    max={50}
                    min={1}
                    onChange={(event) => setNewPieceCount(normalizePieceCount(Number(event.target.value)))}
                    required
                    type="number"
                    value={newPieceCount}
                  />
                  <span className="text-xs leading-5 text-carbon-500" id="piece-count-help">
                    Esta demanda representa {formatDemandScope(newPieceCount, newType)}.
                  </span>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-carbon-200">Orientação por {getDemandScopeLabel(newType, false)}</span>
                  <textarea
                    className={cn(fieldClass, "min-h-28 py-3")}
                    onChange={(event) => setNewPieceInstructions(event.target.value)}
                    placeholder={`Uma linha para cada ${getDemandScopeLabel(newType, false)}, por exemplo:\n${getDemandScopeLabel(newType, false) === "arte" ? "Arte" : "Vídeo"} 1: apresentação\n${getDemandScopeLabel(newType, false) === "arte" ? "Arte" : "Vídeo"} 2: demonstração\n${getDemandScopeLabel(newType, false) === "arte" ? "Arte" : "Vídeo"} 3: CTA`}
                    value={newPieceInstructions}
                  />
                  <span className="text-xs leading-5 text-carbon-500">
                    As primeiras {normalizePieceCount(newPieceCount)} linhas serão numeradas para quem produzir.
                  </span>
                </label>
              </div>

              <div className="rounded-card border border-glass-stroke bg-carbon-950/44 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-carbon-400">responsáveis calculados</p>
                <div className="flex min-h-10 flex-wrap gap-2">
                  {previewAssignees.length ? (
                    previewAssignees.map((assignee) => (
                      <span
                        className="inline-flex items-center gap-2 rounded-full border border-accent-300/24 bg-accent-400/10 px-3 py-1.5 text-xs font-bold text-accent-300"
                        key={assignee!.id}
                      >
                        <span className="grid size-6 place-items-center rounded-full bg-carbon-950 font-display text-[0.65rem] text-carbon-100">
                          {initials(assignee!.name)}
                        </span>
                        {assignee!.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm font-semibold text-carbon-500">
                      {selectedClient ? "Sem responsável para esse tipo." : "Selecione um cliente."}
                    </span>
                  )}
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-carbon-200">Briefing interno (Obrigatório se não houver Canva)</span>
                <textarea
                  className={cn(fieldClass, "min-h-28 py-3")}
                  onChange={(event) => setNewDesc(event.target.value)}
                  placeholder="Objetivo, formato, prioridade, observações de edição e pontos de atenção."
                  value={newDesc}
                />
              </label>

              </div>
            </div>

            <div className="shrink-0 mt-2 border-t border-glass-stroke/50 bg-carbon-950/20 p-5 sm:p-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end rounded-b-[1.2rem]">
              <Button variant="ghost" onClick={() => {
                setIsModalOpen(false);
                if (searchParams.has("newDemandFor")) {
                  setSearchParams(new URLSearchParams());
                }
              }}>
                Cancelar
              </Button>
              <Button type="submit">
                Enviar para responsável
                <Send className="size-5" aria-hidden="true" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {promptDemandForReview && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-carbon-950/82 p-4 backdrop-blur-xl animate-in fade-in">
          <form
            className="crm-modal-panel relative my-6 w-full max-w-md rounded-[1.2rem] border border-glass-stroke bg-carbon-900/94 p-6 shadow-panel-deep backdrop-blur-2xl"
            onSubmit={submitLinkAndReview}
          >
            <div className="absolute inset-x-8 top-0 h-px neon-divider" aria-hidden="true" />
            <div className="grid size-14 place-items-center rounded-[1rem] border border-assert-300/30 bg-gradient-to-br from-assert-500/20 to-assert-500/5 text-assert-300 shadow-[0_0_30px_rgba(216,36,255,0.15)] ring-1 ring-white/5">
              <Send className="size-6" aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-2xl font-black tracking-tight text-carbon-50">Enviar para revisão</h3>
            <p className="mt-2 text-sm leading-relaxed text-carbon-300">
              Insira o link da pasta, Drive, Frame.io ou arquivo final para o admin avaliar.
            </p>

            {promptDemandForReview.pieceCount && promptDemandForReview.pieceCount > 1 && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-bold tracking-wide text-carbon-200">
                  Selecione os itens para entrega
                </p>
                <div className="grid gap-3 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                  {Array.from({ length: promptDemandForReview.pieceCount }).map((_, i) => {
                    const alreadyDelivered = promptDemandForReview.deliveries?.some(d => d.pieces?.includes(i));
                    const isSelected = selectedPiecesForReview.includes(i) || !!alreadyDelivered;
                    return (
                      <label 
                        key={i} 
                        className={cn(
                          "group relative flex items-center gap-4 rounded-[1rem] border p-4 transition-all duration-300",
                          alreadyDelivered 
                            ? "border-carbon-800 bg-carbon-950/40 opacity-50 cursor-not-allowed" 
                            : isSelected
                              ? "border-assert-400/50 bg-assert-400/10 shadow-[inset_0_0_20px_rgba(216,36,255,0.05)] cursor-pointer"
                              : "border-glass-stroke bg-carbon-950/40 hover:border-carbon-600 hover:bg-carbon-900/60 cursor-pointer"
                        )}
                      >
                        <div className={cn(
                          "relative flex size-5 shrink-0 items-center justify-center rounded-md border transition-all duration-300",
                          alreadyDelivered
                            ? "border-carbon-700 bg-carbon-800 text-carbon-400"
                            : isSelected
                              ? "border-assert-400 bg-assert-400 text-carbon-950 shadow-[0_0_10px_rgba(216,36,255,0.4)]"
                              : "border-carbon-600 bg-carbon-950 group-hover:border-carbon-500"
                        )}>
                          {isSelected && <Check className="size-3.5" strokeWidth={3} />}
                        </div>
                        <input 
                          type="checkbox" 
                          disabled={alreadyDelivered}
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPiecesForReview(prev => [...prev, i]);
                            } else {
                              setSelectedPiecesForReview(prev => prev.filter(p => p !== i));
                            }
                          }}
                          className="sr-only"
                        />
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-sm font-bold transition-colors",
                            isSelected ? "text-carbon-50" : "text-carbon-200"
                          )}>
                            {getDemandScopeLabel(promptDemandForReview.type, false).replace(/^\w/, c => c.toUpperCase())} {i + 1}
                          </span>
                          {promptDemandForReview.pieceInstructions?.[i] && (
                            <span className="text-xs text-carbon-400 mt-0.5 line-clamp-1">{promptDemandForReview.pieceInstructions[i]}</span>
                          )}
                          {alreadyDelivered && (
                            <span className="text-xs text-signal-400 font-medium mt-0.5 flex items-center gap-1"><CheckCircle2 className="size-3" /> Entregue</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-carbon-500 group-focus-within:text-assert-400 transition-colors">
                  <MessageSquare className="size-4" />
                </div>
                <input
                  className={cn(fieldClass, "pl-11 border-carbon-800 bg-carbon-950/50 focus:bg-carbon-900/80")}
                  onChange={(event) => setDeliveryDesc(event.target.value)}
                  placeholder={promptDemandForReview.pieceCount && promptDemandForReview.pieceCount > 1 ? "Observações (opcional)" : `O que está sendo entregue? (ex: ${getDemandScopeLabel(promptDemandForReview.type, false).replace(/^\w/, c => c.toUpperCase())} 1 e 2)`}
                  required={!promptDemandForReview.pieceCount || promptDemandForReview.pieceCount <= 1}
                  type="text"
                  value={deliveryDesc}
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-carbon-500 group-focus-within:text-assert-400 transition-colors">
                  <LinkIcon className="size-4" />
                </div>
                <input
                  className={cn(fieldClass, "pl-11 border-carbon-800 bg-carbon-950/50 focus:bg-carbon-900/80")}
                  onChange={(event) => setDeliveryLink(event.target.value)}
                  placeholder="https://... (Link Frame.io, Drive, etc)"
                  required
                  type="url"
                  value={deliveryLink}
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="hover:bg-carbon-800"
                onClick={() => {
                  setPromptDemandForReview(null);
                  setDeliveryLink("");
                  setDeliveryDesc("");
                  setSelectedPiecesForReview([]);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-assert-500 hover:bg-assert-400 text-carbon-950 shadow-[0_0_15px_rgba(216,36,255,0.3)]">
                Enviar revisão
                <ArrowRight className="size-5 ml-1" aria-hidden="true" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {selectedDemand?.status === "Em Revisão" && (
        <DemandReviewWorkspace
          currentUser={user}
          demand={selectedDemand}
          onAddComment={(text, timestamp, endTimestamp, referenceImages) => {
            addComment(selectedDemand.id, text, timestamp, endTimestamp, referenceImages);
            setSelectedDemand((previous) =>
              previous
                ? {
                    ...previous,
                    comments: [
                      ...(previous.comments || []),
                      {
                        authorId: user.id,
                        createdAt: new Date().toISOString(),
                        id: `tmp-${Date.now()}`,
                        text,
                        timestamp,
                        endTimestamp,
                        referenceImages
                      }
                    ]
                  }
                : null
            );
          }}
          onApprove={() => {
            updateDemandStatus(selectedDemand.id, "Concluído");
            setSelectedDemand(null);
            showNotification(
              "Demanda aprovada",
              "A demanda foi arquivada no histórico do cliente.",
              "success"
            );
          }}
          onClose={() => setSelectedDemand(null)}
          onRequestChanges={() => {
            updateDemandStatus(selectedDemand.id, "Em Andamento");
            setSelectedDemand(null);
            showNotification(
              "Correções enviadas",
              "O responsável recebeu os ajustes e a demanda voltou para produção.",
              "info"
            );
          }}
          videoUrl={getReviewVideoUrl(selectedDemand)}
        />
      )}

      {selectedDemand && selectedDemand.status !== "Em Revisão" && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-carbon-950/82 p-4 backdrop-blur-xl animate-in fade-in">
          <div className="crm-modal-panel relative my-6 w-full max-w-4xl rounded-[1.2rem] border border-glass-stroke bg-carbon-900/94 p-6 shadow-panel-deep backdrop-blur-2xl">
            <div className="absolute inset-x-8 top-0 h-px neon-divider" aria-hidden="true" />
            
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-assert-300">
                  {selectedDemand.client}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-carbon-50">{selectedDemand.title}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-card border border-glass-stroke bg-carbon-950/48 px-3 py-2 text-sm font-bold text-carbon-250 transition-all duration-300 hover:bg-carbon-800 hover:text-carbon-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
                  onClick={() => setSelectedDemand(null)}
                  type="button"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-carbon-200 mb-2">Briefing Interno</h4>
                  <p className="text-sm text-carbon-300 leading-relaxed bg-carbon-950/40 p-4 rounded-card border border-carbon-800">
                    {selectedDemand.description || "Nenhum briefing preenchido."}
                  </p>
                </div>

                <div>
                  <h4 className="mb-2 text-sm font-bold text-carbon-200">
                    Escopo: {formatDemandScope(selectedDemand.pieceCount || 1, selectedDemand.type)}
                  </h4>
                  <ol className="space-y-2 rounded-card border border-accent-300/20 bg-accent-400/5 p-4">
                    {Array.from({ length: selectedDemand.pieceCount || 1 }, (_, index) => (
                      <li className="flex gap-3 text-sm text-carbon-300" key={index}>
                        <span className="grid size-6 shrink-0 place-items-center rounded bg-accent-400/12 text-xs font-bold text-accent-300">
                          {index + 1}
                        </span>
                        <span>{selectedDemand.pieceInstructions?.[index] || `${getDemandScopeLabel(selectedDemand.type, false).replace(/^\w/, c => c.toUpperCase())} ${index + 1}`}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid gap-3">
                  <h4 className="text-sm font-bold text-carbon-200">Arquivos e Links</h4>
                  <ResourceLink href={selectedDemand.dropboxLink} kind="dropbox" label={`${getDemandScopeLabel(selectedDemand.type, true).replace(/^\w/, c => c.toUpperCase())} no Dropbox`} />
                  {selectedDemand.planningLink && (
                    <ResourceLink href={selectedDemand.planningLink} kind="canva" label="Planejamento / roteiro" />
                  )}
                  
                  {selectedDemand.deliveries && selectedDemand.deliveries.length > 0 ? (
                    <div className="mt-4 border-t border-carbon-800 pt-4">
                      <h4 className="text-sm font-bold text-assert-300 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="size-4" /> Histórico de Entregas
                      </h4>
                      <div className="space-y-3">
                        {selectedDemand.deliveries.map((delivery, i) => (
                          <div key={delivery.id || i} className="rounded border border-carbon-800 bg-carbon-950/40 p-3">
                            <p className="text-xs font-bold text-carbon-200 mb-1">{delivery.description}</p>
                            <a href={delivery.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-semibold text-accent-300 hover:underline">
                              <ExternalLink className="size-3" /> Acessar entrega
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : selectedDemand.deliveryLink ? (
                    <div className="mt-4 border-t border-carbon-800 pt-4">
                      <h4 className="text-sm font-bold text-assert-300 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="size-4" /> Entrega
                      </h4>
                      <a href={selectedDemand.deliveryLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-accent-300 hover:underline">
                        <ExternalLink className="size-4" /> Acessar Link de Entrega
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col border-t border-carbon-800 lg:border-t-0 lg:border-l lg:pl-8 pt-6 lg:pt-0">
                {isDemandInReview(selectedDemand) && selectedDemand.type === "Vídeo" && (user.role === "Admin" || user.role === "Organizador") ? (
                  <>
                    {getReviewVideoUrl(selectedDemand) ? (
                      <VideoReviewPlayer
                      videoUrl={getReviewVideoUrl(selectedDemand)!}
                      comments={selectedDemand.comments || []}
                      demandId={selectedDemand.id}
                      onAddComment={(text, timestamp) => {
                        addComment(selectedDemand.id, text, timestamp);
                        setSelectedDemand(prev => prev ? {
                          ...prev,
                          comments: [...(prev.comments || []), { id: `tmp-${Date.now()}`, authorId: user.id, text, createdAt: new Date().toISOString(), timestamp }]
                        } : null);
                      }}
                      onSendCorrections={() => {
                        updateDemandStatus(selectedDemand.id, "Em Andamento");
                        setSelectedDemand(null);
                        showNotification("🔁 Ajustes solicitados", "Anotações enviadas! O responsável já foi notificado para corrigir.", "info");
                      }}
                    />
                  ) : (
                    <div className="rounded-card border border-assert-300/30 bg-assert-500/10 p-5 text-sm text-assert-200">
                      Nenhum link de vídeo foi anexado a esta demanda. Envie o link de entrega ou Dropbox antes da revisão com minutagem.
                    </div>
                  )}
                  {canApprove && (
                    <div className="mt-4 flex gap-3 flex-wrap">
                      <Button onClick={() => {
                        updateDemandStatus(selectedDemand.id, "Concluído");
                        setSelectedDemand(null);
                        showNotification("🎉 Demanda Concluída", "Material aprovado e finalizado com sucesso!", "success");
                      }} className="bg-assert-500 hover:bg-assert-400 text-carbon-950">
                        <CheckCircle2 className="size-4 mr-2" /> Aprovar Demanda
                      </Button>
                      <Button variant="outline" onClick={() => {
                        updateDemandStatus(selectedDemand.id, "Em Andamento");
                        setSelectedDemand(null);
                        showNotification("✅ Entrega parcial aprovada", "Parte do material já foi validado! Resta finalizar o restante.", "info");
                      }}>
                        Aprovar Parcial (Voltar p/ Produção)
                      </Button>
                    </div>
                  )}
                  </>
                ) : (
                  <>
                    <h4 className="text-sm font-bold text-carbon-200 mb-4 flex items-center gap-2">
                      <MessageSquare className="size-4" /> Comentários
                    </h4>
                    
                    <div className="flex-1 overflow-y-auto max-h-[400px] space-y-4 mb-4 pr-2">
                      {selectedDemand.comments && selectedDemand.comments.length > 0 ? (
                        selectedDemand.comments.map(comment => {
                          const author = USERS_DB.find(u => u.id === comment.authorId);
                          return (
                            <div key={comment.id} className="bg-carbon-950/60 p-3 rounded-card border border-carbon-800/80">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-carbon-100">{author?.name || "Usuário"}</span>
                                <div className="flex items-center gap-2">
                                  {comment.timestamp && (
                                    <span className="text-[0.65rem] font-mono bg-assert-500/20 text-assert-300 px-1 rounded border border-assert-300/30">
                                      {comment.timestamp}
                                    </span>
                                  )}
                                  <span className="text-[0.65rem] text-carbon-500">{formatDate(comment.createdAt)}</span>
                                </div>
                              </div>
                              <p className="text-sm text-carbon-300">{comment.text}</p>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-sm text-carbon-500 italic text-center py-8">Nenhum comentário ainda. Inicie a conversa!</p>
                      )}
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newComment.trim()) return;
                        addComment(selectedDemand.id, newComment);
                        setNewComment("");
                        // Update local state so modal updates immediately
                        setSelectedDemand(prev => prev ? {
                          ...prev,
                          comments: [...(prev.comments || []), { id: `tmp-${Date.now()}`, authorId: user.id, text: newComment, createdAt: new Date().toISOString() }]
                        } : null);
                      }}
                      className="mt-auto relative"
                    >
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Adicionar comentário..."
                        className="w-full min-h-12 rounded-card border border-glass-stroke bg-carbon-950/66 pl-4 pr-12 text-sm text-carbon-50 outline-none transition-all focus:border-assert-300"
                      />
                      <button type="submit" disabled={!newComment.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-assert-300 hover:text-assert-400 disabled:opacity-50">
                        <Send className="size-4" />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
