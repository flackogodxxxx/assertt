import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock3,
  MessageSquare,
  PackageCheck,
  Repeat2,
  UserRoundCog
} from "lucide-react";
import { USERS_DB } from "../../contexts/AuthContext";
import type { DemandWorkspaceData } from "./types";

const icons = {
  demand_archived: Archive,
  demand_blocked: AlertTriangle,
  demand_reassigned: UserRoundCog,
  demand_unblocked: CheckCircle2,
  piece_reviewed: CheckCircle2,
  review_comment_resolved: MessageSquare,
  sla_alert: Clock3,
  submission_created: PackageCheck,
  workflow_transition: Repeat2
};

export function DemandActivityTab({ workspace }: { workspace: DemandWorkspaceData }) {
  return (
    <ol className="relative border-l border-carbon-800 pl-6">
      {workspace.activities.length ? (
        workspace.activities.map((event) => {
          const Icon = icons[event.event_type as keyof typeof icons] || Repeat2;
          const actor = USERS_DB.find((candidate) => candidate.id === event.actor_id);
          const payload = (event.payload || {}) as Record<string, unknown>;
          return (
            <li className="relative pb-7" key={event.id}>
              <span className="absolute -left-[2.15rem] top-0 grid size-8 place-items-center border border-carbon-700 bg-carbon-950 text-assert-300">
                <Icon className="size-4" />
              </span>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-carbon-100">
                    {event.event_type.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-carbon-500">
                    {actor?.name || (event.actor_id ? event.actor_id : "Automação Supabase")}
                  </p>
                </div>
                <time className="text-xs font-bold text-carbon-500">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short"
                  }).format(new Date(event.created_at))}
                </time>
              </div>
              {Object.keys(payload).length > 0 && (
                <p className="mt-3 text-sm leading-6 text-carbon-300">
                  {payload.reason
                    ? String(payload.reason)
                    : payload.from && payload.to
                      ? `${String(payload.from)} → ${String(payload.to)}`
                      : payload.version
                        ? `Versão ${String(payload.version)} · ${String(payload.piece_count || 0)} peça(s)`
                        : "Evento registrado no histórico operacional."}
                </p>
              )}
            </li>
          );
        })
      ) : (
        <li className="text-sm text-carbon-500">Nenhum evento registrado.</li>
      )}
    </ol>
  );
}
