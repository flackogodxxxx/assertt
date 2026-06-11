import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  MessageSquare,
  RotateCcw,
  X
} from "lucide-react";
import type { User } from "../contexts/AuthContext";
import type { Demand, ReferenceImage } from "../contexts/DemandContext";
import { cn } from "../lib/cn";
import { formatDemandScope } from "../lib/demand-scope";
import { VideoReviewPlayer } from "./VideoReviewPlayer";

type DemandReviewWorkspaceProps = {
  currentUser: User;
  demand: Demand;
  onAddComment: (
    text: string,
    timestamp?: string,
    endTimestamp?: string,
    referenceImages?: ReferenceImage[]
  ) => void;
  onApprove: () => void;
  onClose: () => void;
  onRequestChanges: () => void;
  videoUrl?: string;
};

function dateLabel(value?: string) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function DemandReviewWorkspace({
  currentUser,
  demand,
  onAddComment,
  onApprove,
  onClose,
  onRequestChanges,
  videoUrl
}: DemandReviewWorkspaceProps) {
  const [contextOpen, setContextOpen] = useState(false);
  const canDecide = currentUser.role === "Admin" || currentUser.role === "Organizador";
  const hasCorrections = Boolean(demand.comments?.length);
  const isImage = Boolean(demand.deliveryLink?.match(/\.(jpeg|jpg|gif|png)(\?.*)?$/i));

  const workspace = (
    <div
      aria-labelledby="demand-review-title"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-carbon-950/90 p-3 backdrop-blur-xl sm:p-6"
      role="dialog"
    >
      <section className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[92rem] flex-col overflow-hidden rounded-[0.75rem] border border-glass-stroke bg-carbon-900 shadow-panel-deep sm:min-h-[calc(100vh-3rem)]">
        <header className="flex flex-col gap-4 border-b border-glass-stroke px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="text-assert-300">{demand.client}</span>
              <span className="text-carbon-600">/</span>
              <span className="rounded border border-accent-300/25 bg-accent-400/10 px-2 py-1 text-accent-300">
                Em revisão
              </span>
              <span className="rounded border border-carbon-700 bg-carbon-950/60 px-2 py-1 text-carbon-300">
                {demand.type}
              </span>
            </div>
            <h2 id="demand-review-title" className="mt-2 truncate text-xl font-bold text-carbon-50 sm:text-2xl">
              Revisão da entrega: {demand.title}
            </h2>
          </div>
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-carbon-300">
              <Calendar className="size-4 text-carbon-500" />
              {dateLabel(demand.deadline)}
            </span>
            <button
              aria-label="Fechar revisão"
              className="grid size-10 place-items-center rounded-card border border-glass-stroke bg-carbon-950/50 text-carbon-300 transition hover:bg-carbon-800 hover:text-carbon-50"
              onClick={onClose}
              title="Fechar revisão"
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        <div className="grid flex-1 gap-0 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.85fr)]">
          <main className="min-w-0 bg-carbon-950/45 p-4 sm:p-6 lg:p-8">
            <div className="flex min-h-[32rem] items-center justify-center rounded-[0.6rem] border border-carbon-800 bg-black/35 p-3">
              {demand.type === "Vídeo" && videoUrl ? (
                <VideoReviewPlayer
                  comments={demand.comments || []}
                  demandId={demand.id}
                  onAddComment={onAddComment}
                  showSubmitAction={false}
                  videoUrl={videoUrl}
                />
              ) : isImage ? (
                <img
                  alt={`Entrega de ${demand.title}`}
                  className="max-h-[68vh] max-w-full object-contain"
                  src={demand.deliveryLink}
                />
              ) : demand.deliveryLink ? (
                <a
                  className="inline-flex items-center gap-2 rounded-card border border-accent-300/30 bg-accent-400/10 px-5 py-3 font-bold text-accent-300 hover:bg-accent-400/15"
                  href={demand.deliveryLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="size-5" />
                  Abrir entrega em nova aba
                </a>
              ) : (
                <div className="max-w-md text-center">
                  <FileText className="mx-auto size-10 text-carbon-600" />
                  <p className="mt-4 font-bold text-carbon-200">Entrega sem pré-visualização</p>
                  <p className="mt-2 text-sm leading-6 text-carbon-400">
                    Anexe um link de entrega válido antes de concluir a revisão.
                  </p>
                </div>
              )}
            </div>
          </main>

          <aside className="flex min-h-[32rem] flex-col border-t border-glass-stroke bg-carbon-900/80 xl:border-l xl:border-t-0">
            <div className="border-b border-glass-stroke px-5 py-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-5 text-assert-300" />
                <h3 className="font-bold text-carbon-50">
                  {demand.type === "Vídeo" ? "Escopo da entrega" : "Linha de correções"}
                </h3>
                <span className="ml-auto rounded bg-carbon-950/60 px-2 py-1 text-xs font-bold text-carbon-400">
                  {demand.comments?.length || 0}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-carbon-400">
                {demand.type === "Vídeo"
                  ? `${formatDemandScope(demand.pieceCount || 1, demand.type)} vinculados a esta demanda.`
                  : "Comentários registrados para esta entrega."}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {demand.type === "Vídeo" ? (
                <ol className="space-y-3">
                  {Array.from({ length: demand.pieceCount || 1 }, (_, index) => (
                    <li className="flex gap-3 rounded-card border border-carbon-800 bg-carbon-950/45 p-3" key={index}>
                      <span className="grid size-7 shrink-0 place-items-center rounded bg-accent-400/12 text-xs font-bold text-accent-300">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-carbon-200">Peça {index + 1}</p>
                        <p className="mt-1 text-sm leading-5 text-carbon-400">
                          {demand.pieceInstructions?.[index] || "Sem orientação específica."}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="space-y-3">
                  {demand.comments?.length ? (
                    demand.comments.map((comment) => (
                      <article className="rounded-card border border-carbon-800 bg-carbon-950/45 p-4" key={comment.id}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-carbon-200">Comentário</span>
                          {comment.timestamp && (
                            <span className="font-mono text-xs text-assert-300">{comment.timestamp}</span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-carbon-300">{comment.text}</p>
                      </article>
                    ))
                  ) : (
                    <p className="py-10 text-center text-sm text-carbon-500">
                      Nenhuma correção registrada.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-glass-stroke">
              <button
                aria-expanded={contextOpen}
                className="flex w-full items-center gap-2 px-5 py-4 text-left text-sm font-bold text-carbon-200 hover:bg-carbon-800/50"
                onClick={() => setContextOpen((open) => !open)}
                type="button"
              >
                <FileText className="size-4 text-carbon-500" />
                Briefing e arquivos
                <ChevronDown className={cn("ml-auto size-4 transition", contextOpen && "rotate-180")} />
              </button>
              {contextOpen && (
                <div className="space-y-4 border-t border-glass-stroke bg-carbon-950/35 px-5 py-4">
                  <p className="text-sm leading-6 text-carbon-300">
                    {demand.description || "Sem briefing detalhado."}
                  </p>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-300">
                      Escopo: {formatDemandScope(demand.pieceCount || 1, demand.type)}
                    </p>
                    <ol className="mt-3 space-y-2">
                      {Array.from({ length: demand.pieceCount || 1 }, (_, index) => (
                        <li className="flex gap-2 text-sm text-carbon-300" key={index}>
                          <span className="font-bold text-accent-300">{index + 1}.</span>
                          <span>{demand.pieceInstructions?.[index] || `Peça ${index + 1}`}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    {demand.dropboxLink && (
                      <a className="text-accent-300 hover:underline" href={demand.dropboxLink} rel="noreferrer" target="_blank">
                        Dropbox
                      </a>
                    )}
                    {demand.planningLink && (
                      <a className="text-assert-300 hover:underline" href={demand.planningLink} rel="noreferrer" target="_blank">
                        Planejamento
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {canDecide && (
          <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-glass-stroke bg-carbon-900/96 px-5 py-4 sm:flex-row sm:items-center sm:justify-end lg:px-7">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-assert-300/35 bg-assert-500/10 px-5 text-sm font-bold text-assert-300 transition hover:bg-assert-500/18 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!hasCorrections}
              onClick={onRequestChanges}
              title={!hasCorrections ? "Registre ao menos uma correção antes de solicitar ajustes" : undefined}
              type="button"
            >
              <RotateCcw className="size-4" />
              Solicitar ajustes
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-signal-400 px-5 text-sm font-bold text-carbon-950 transition hover:bg-signal-300"
              onClick={onApprove}
              type="button"
            >
              <CheckCircle2 className="size-4" />
              Aprovar e arquivar
            </button>
          </footer>
        )}
      </section>
    </div>
  );

  return createPortal(workspace, document.body);
}
