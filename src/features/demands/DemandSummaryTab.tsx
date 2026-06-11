import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CalendarDays,
  ExternalLink,
  Link as LinkIcon,
  LockKeyhole,
  UserRoundCog
} from "lucide-react";
import { Link } from "react-router-dom";
import { USERS_DB, type User } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { cn } from "../../lib/cn";
import { reassignDemand, transitionDemand } from "./repository";
import type { DemandWorkspaceData } from "./types";
import {
  canTransition,
  getUnblockedStatus,
  validateTransition,
  workflowLabels,
  type WorkflowStatus
} from "./workflow";

type DemandSummaryTabProps = {
  currentUser: User;
  onRefresh: () => Promise<void>;
  workspace: DemandWorkspaceData;
};

const actionLabels: Partial<Record<WorkflowStatus, string>> = {
  adjustments: "Solicitar ajustes",
  approved: "Aprovar demanda",
  delivered: "Entregar e arquivar",
  planned: "Planejar",
  production: "Iniciar produção",
  review: "Enviar para revisão"
};

function ResourceLink({ href, label }: { href?: string; label: string }) {
  if (!href) {
    return (
      <span className="inline-flex min-h-10 items-center gap-2 border border-carbon-800 bg-carbon-950/45 px-3 text-xs font-bold text-carbon-500">
        <LinkIcon className="size-4" />
        {label} ausente
      </span>
    );
  }

  return (
    <a
      className="inline-flex min-h-10 items-center gap-2 border border-accent-300/25 bg-accent-400/10 px-3 text-xs font-bold text-accent-300 hover:border-accent-300/55"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <ExternalLink className="size-4" />
      {label}
    </a>
  );
}

export function DemandSummaryTab({
  currentUser,
  onRefresh,
  workspace
}: DemandSummaryTabProps) {
  const { showNotification } = useNotification();
  const [blockReason, setBlockReason] = useState("");
  const [blockCategory, setBlockCategory] = useState("internal");
  const [reassignReason, setReassignReason] = useState("");
  const [assigneeId, setAssigneeId] = useState(workspace.task.assignee_id);
  const [isSaving, setIsSaving] = useState(false);
  const checklist = (workspace.task.checklist || {}) as Record<string, unknown>;
  const isManagement = currentUser.role === "Admin" || currentUser.role === "Organizador";
  const status = workspace.task.status;

  async function runTransition(toStatus: WorkflowStatus, reason?: string) {
    const validation = validateTransition(status, toStatus, reason);
    if (!validation.valid) {
      showNotification("Transição bloqueada", validation.reason || "Revise os dados.", "warning");
      return;
    }

    setIsSaving(true);
    try {
      await transitionDemand(workspace.task.id, toStatus, reason, blockCategory);
      await onRefresh();
      setBlockReason("");
      showNotification("Etapa atualizada", `Demanda movida para ${workflowLabels[toStatus]}.`, "success");
    } catch (error) {
      showNotification(
        "Não foi possível atualizar",
        error instanceof Error ? error.message : "Falha ao alterar a etapa.",
        "warning"
      );
    } finally {
      setIsSaving(false);
    }
  }

  const transitionTargets = (
    ["planned", "production", "review", "adjustments", "approved", "delivered"] as WorkflowStatus[]
  ).filter((target) => canTransition(status, target));

  const iaParams = new URLSearchParams({
    client: workspace.task.clients?.name || "",
    demandId: workspace.task.id,
    title: workspace.task.title,
    type: workspace.task.type,
    briefing: String(checklist.description || workspace.task.stage_note || "")
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.6fr)]">
      <div className="space-y-6">
        <section className="border-b border-glass-stroke pb-6">
          <p className="text-xs font-bold uppercase text-carbon-500">Briefing operacional</p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-carbon-200">
            {String(checklist.description || workspace.task.stage_note || "Sem briefing detalhado.")}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <ResourceLink href={String(checklist.dropboxLink || "") || undefined} label="Dropbox" />
            <ResourceLink href={String(checklist.planningLink || "") || undefined} label="Planejamento" />
            <Link
              className="inline-flex min-h-10 items-center gap-2 border border-assert-300/25 bg-assert-500/10 px-3 text-xs font-bold text-assert-300 hover:border-assert-300/55"
              to={`/crm/ia?${iaParams.toString()}`}
            >
              <Brain className="size-4" />
              Abrir na IA Assert
            </Link>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold text-carbon-100">Mover etapa</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {status === "blocked" ? (
              <button
                className="inline-flex min-h-10 items-center gap-2 bg-signal-400 px-4 text-sm font-bold text-carbon-950 disabled:opacity-50"
                disabled={isSaving}
                onClick={() => void runTransition(getUnblockedStatus(workspace.task.blocked_from_status))}
                type="button"
              >
                <LockKeyhole className="size-4" />
                Desbloquear para {workflowLabels[getUnblockedStatus(workspace.task.blocked_from_status)]}
              </button>
            ) : (
              transitionTargets.map((target) => (
                <button
                  className="inline-flex min-h-10 items-center gap-2 border border-glass-stroke bg-carbon-900/65 px-4 text-sm font-bold text-carbon-100 hover:border-assert-300/50 hover:text-assert-300 disabled:opacity-50"
                  disabled={isSaving}
                  key={target}
                  onClick={() => void runTransition(target)}
                  type="button"
                >
                  {actionLabels[target] || workflowLabels[target]}
                  <ArrowRight className="size-4" />
                </button>
              ))
            )}
          </div>
        </section>

        {status !== "blocked" && ["planned", "production", "review", "adjustments"].includes(status) && (
          <section className="border border-amber-300/20 bg-amber-400/5 p-4">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="size-4" />
              <h3 className="text-sm font-bold">Bloquear demanda</h3>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[11rem_minmax(0,1fr)_auto]">
              <select
                className="min-h-11 border border-carbon-800 bg-carbon-950 px-3 text-sm text-carbon-100"
                onChange={(event) => setBlockCategory(event.target.value)}
                value={blockCategory}
              >
                <option value="internal">Dependência interna</option>
                <option value="external_dependency">Dependência externa</option>
                <option value="client">Aguardando cliente</option>
              </select>
              <input
                className="min-h-11 border border-carbon-800 bg-carbon-950 px-3 text-sm text-carbon-100 outline-none focus:border-amber-300"
                onChange={(event) => setBlockReason(event.target.value)}
                placeholder="Motivo obrigatório"
                value={blockReason}
              />
              <button
                className="min-h-11 bg-amber-400 px-4 text-sm font-bold text-carbon-950 disabled:opacity-40"
                disabled={isSaving || !blockReason.trim()}
                onClick={() => void runTransition("blocked", blockReason)}
                type="button"
              >
                Bloquear
              </button>
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-5 border-l border-glass-stroke pl-0 xl:pl-6">
        <div>
          <p className="text-xs font-bold uppercase text-carbon-500">Responsável</p>
          <p className="mt-2 text-sm font-bold text-carbon-100">
            {USERS_DB.find((candidate) => candidate.id === workspace.task.assignee_id)?.name ||
              workspace.task.assignee_id}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-carbon-500">Prazo</p>
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-carbon-100">
            <CalendarDays className="size-4 text-assert-300" />
            {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
              new Date(`${workspace.task.due_date}T12:00:00`)
            )}
          </p>
        </div>
        {workspace.task.blocked_reason && (
          <div className="border border-amber-300/25 bg-amber-400/5 p-3">
            <p className="text-xs font-bold uppercase text-amber-300">Motivo do bloqueio</p>
            <p className="mt-2 text-sm leading-6 text-carbon-200">{workspace.task.blocked_reason}</p>
          </div>
        )}
        {isManagement && (
          <div className="border-t border-glass-stroke pt-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase text-carbon-500">
              <UserRoundCog className="size-4" />
              Reatribuir com auditoria
            </p>
            <select
              className="mt-3 min-h-11 w-full border border-carbon-800 bg-carbon-950 px-3 text-sm text-carbon-100"
              onChange={(event) => setAssigneeId(event.target.value)}
              value={assigneeId}
            >
              {USERS_DB.filter((candidate) =>
                ["Designer", "Video Maker"].includes(candidate.role)
              ).map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} · {candidate.role}
                </option>
              ))}
            </select>
            <input
              className="mt-2 min-h-11 w-full border border-carbon-800 bg-carbon-950 px-3 text-sm text-carbon-100"
              onChange={(event) => setReassignReason(event.target.value)}
              placeholder="Motivo da reatribuição"
              value={reassignReason}
            />
            <button
              className={cn(
                "mt-2 min-h-10 w-full bg-carbon-800 px-3 text-sm font-bold text-carbon-100",
                "disabled:cursor-not-allowed disabled:opacity-40"
              )}
              disabled={
                isSaving ||
                !reassignReason.trim() ||
                assigneeId === workspace.task.assignee_id
              }
              onClick={async () => {
                setIsSaving(true);
                try {
                  await reassignDemand(workspace.task.id, assigneeId, reassignReason);
                  await onRefresh();
                  setReassignReason("");
                  showNotification("Demanda reatribuída", "A mudança foi registrada na atividade.", "success");
                } catch (error) {
                  showNotification(
                    "Falha na reatribuição",
                    error instanceof Error ? error.message : "Não foi possível reatribuir.",
                    "warning"
                  );
                } finally {
                  setIsSaving(false);
                }
              }}
              type="button"
            >
              Confirmar reatribuição
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
