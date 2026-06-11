import { Check, CheckCircle2, ExternalLink, MessageSquare, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { VideoReviewPlayer } from "../../components/VideoReviewPlayer";
import { type ReferenceImage } from "../../contexts/DemandContext";
import { type User } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { formatMediaTime, parseMediaTime } from "../../lib/media-review";
import {
  addReviewComment,
  resolveReviewComment,
  reviewSubmissionItem
} from "./repository";
import type { DemandWorkspaceData } from "./types";

type DemandQcTabProps = {
  currentUser: User;
  onRefresh: () => Promise<void>;
  workspace: DemandWorkspaceData;
};

export function DemandQcTab({
  currentUser,
  onRefresh,
  workspace
}: DemandQcTabProps) {
  const { showNotification } = useNotification();
  const [activeSubmissionId, setActiveSubmissionId] = useState(
    workspace.submissions[0]?.id || ""
  );
  const activeSubmission =
    workspace.submissions.find((submission) => submission.id === activeSubmissionId) ||
    workspace.submissions[0];
  const [activeSubmissionItemId, setActiveSubmissionItemId] = useState(
    activeSubmission?.items[0]?.id || ""
  );
  const activeSubmissionItem =
    activeSubmission?.items.find((item) => item.id === activeSubmissionItemId) ||
    activeSubmission?.items[0];
  const activePiece = workspace.items.find(
    (item) => item.id === activeSubmissionItem?.demand_item_id
  );
  const isManagement = currentUser.role === "Admin" || currentUser.role === "Organizador";
  const activeComments = useMemo(
    () =>
      workspace.comments.filter(
        (comment) =>
          (!comment.submission_id || comment.submission_id === activeSubmission?.id) &&
          (!comment.demand_item_id || comment.demand_item_id === activePiece?.id)
      ),
    [activePiece?.id, activeSubmission?.id, workspace.comments]
  );
  const hasOpenCorrection = activeComments.some((comment) => comment.status === "open");
  const isVideo = Boolean(
    activeSubmissionItem?.url.match(/\.(mp4|webm|mov)(\?.*)?$/i) ||
      workspace.task.type === "video"
  );

  async function decide(decision: "approved" | "changes_requested") {
    if (!activeSubmissionItem) return;
    if (decision === "changes_requested" && !hasOpenCorrection) {
      showNotification(
        "Registre a correção",
        "Inclua ao menos uma correção pendente antes de solicitar ajustes.",
        "warning"
      );
      return;
    }

    try {
      await reviewSubmissionItem(activeSubmissionItem.id, decision);
      await onRefresh();
      showNotification(
        decision === "approved" ? "Peça aprovada" : "Ajustes solicitados",
        "A decisão foi registrada individualmente para esta peça.",
        "success"
      );
    } catch (error) {
      showNotification(
        "Falha na revisão",
        error instanceof Error ? error.message : "Não foi possível salvar a decisão.",
        "warning"
      );
    }
  }

  if (!activeSubmission) {
    return (
      <div className="border border-dashed border-carbon-800 p-8 text-center">
        <MessageSquare className="mx-auto size-7 text-carbon-500" />
        <p className="mt-3 text-sm font-bold text-carbon-300">
          Nenhuma entrega disponível para QC.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-glass-stroke pb-4">
        {workspace.submissions.map((submission) => (
          <button
            className={`min-h-9 border px-3 text-xs font-bold ${
              submission.id === activeSubmission.id
                ? "border-assert-300 bg-assert-500/10 text-assert-300"
                : "border-carbon-800 text-carbon-400"
            }`}
            key={submission.id}
            onClick={() => {
              setActiveSubmissionId(submission.id);
              setActiveSubmissionItemId(submission.items[0]?.id || "");
            }}
            type="button"
          >
            Versão {submission.version}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {activeSubmission.items.map((submissionItem) => {
          const piece = workspace.items.find(
            (candidate) => candidate.id === submissionItem.demand_item_id
          );
          return (
            <button
              className={`min-h-10 border px-3 text-xs font-bold ${
                submissionItem.id === activeSubmissionItem?.id
                  ? "border-accent-300 bg-accent-400/10 text-accent-300"
                  : "border-carbon-800 text-carbon-400"
              }`}
              key={submissionItem.id}
              onClick={() => setActiveSubmissionItemId(submissionItem.id)}
              type="button"
            >
              Peça {piece?.position || "?"} · {submissionItem.review_status}
            </button>
          );
        })}
      </div>

      {activeSubmissionItem && activePiece && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <section>
            {isVideo ? (
              <VideoReviewPlayer
                comments={activeComments.map((comment) => ({
                  authorId: comment.author_id,
                  createdAt: comment.created_at,
                  endTimestamp:
                    comment.end_seconds == null ? undefined : formatMediaTime(comment.end_seconds),
                  id: comment.id,
                  referenceImages: Array.isArray(comment.reference_attachments)
                    ? (comment.reference_attachments as unknown as ReferenceImage[])
                    : [],
                  text: comment.body,
                  timestamp:
                    comment.start_seconds == null ? undefined : formatMediaTime(comment.start_seconds)
                }))}
                demandId={workspace.task.id}
                onAddComment={async (
                  text,
                  timestamp,
                  endTimestamp,
                  referenceImages
                ) => {
                  await addReviewComment({
                    authorId: currentUser.id,
                    body: text,
                    demandItemId: activePiece.id,
                    endSeconds: endTimestamp ? parseMediaTime(endTimestamp) : undefined,
                    referenceAttachments: referenceImages,
                    startSeconds: timestamp ? parseMediaTime(timestamp) : undefined,
                    submissionId: activeSubmission.id,
                    taskId: workspace.task.id
                  });
                  await onRefresh();
                }}
                showSubmitAction={false}
                videoUrl={activeSubmissionItem.url}
              />
            ) : (
              <div className="grid min-h-80 place-items-center border border-carbon-800 bg-carbon-950/55 p-6">
                <a
                  className="inline-flex min-h-11 items-center gap-2 bg-accent-400 px-4 text-sm font-bold text-carbon-950"
                  href={activeSubmissionItem.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Abrir peça
                  <ExternalLink className="size-4" />
                </a>
              </div>
            )}
          </section>

          <aside className="space-y-4 border-l border-glass-stroke pl-0 xl:pl-6">
            <div>
              <p className="text-xs font-bold uppercase text-carbon-500">
                Peça {activePiece.position}
              </p>
              <h3 className="mt-1 text-base font-bold text-carbon-100">{activePiece.title}</h3>
              <p className="mt-2 text-sm leading-6 text-carbon-400">
                {activePiece.instruction || "Sem orientação específica."}
              </p>
            </div>

            <div className="space-y-2">
              {activeComments.map((comment) => (
                <article className="border border-carbon-800 bg-carbon-950/45 p-3" key={comment.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-carbon-400">{comment.status}</span>
                    {comment.status === "open" && (
                      <button
                        aria-label="Resolver comentário"
                        className="grid size-8 place-items-center border border-signal-300/25 text-signal-300"
                        onClick={async () => {
                          await resolveReviewComment(comment.id);
                          await onRefresh();
                        }}
                        type="button"
                      >
                        <Check className="size-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-carbon-200">{comment.body}</p>
                </article>
              ))}
            </div>

            {isManagement && (
              <div className="grid grid-cols-2 gap-2 border-t border-glass-stroke pt-4">
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 border border-assert-300/25 bg-assert-500/10 px-3 text-xs font-bold text-assert-300"
                  onClick={() => void decide("changes_requested")}
                  type="button"
                >
                  <RotateCcw className="size-4" />
                  Solicitar ajustes
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 bg-signal-400 px-3 text-xs font-bold text-carbon-950 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={hasOpenCorrection}
                  onClick={() => void decide("approved")}
                  title={hasOpenCorrection ? "Resolva as correções pendentes antes de aprovar" : undefined}
                  type="button"
                >
                  <CheckCircle2 className="size-4" />
                  Aprovar peça
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
