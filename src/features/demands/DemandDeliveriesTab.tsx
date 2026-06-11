import { ExternalLink, PackagePlus, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { USERS_DB } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { createPartialSubmission } from "./repository";
import type { DemandWorkspaceData } from "./types";

type DemandDeliveriesTabProps = {
  onRefresh: () => Promise<void>;
  workspace: DemandWorkspaceData;
};

export function DemandDeliveriesTab({
  onRefresh,
  workspace
}: DemandDeliveriesTabProps) {
  const { showNotification } = useNotification();
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const submittableItems = useMemo(
    () => workspace.items.filter((item) => item.status !== "delivered"),
    [workspace.items]
  );

  async function submit() {
    const selected = selectedIds
      .map((itemId) => ({
        demandItemId: itemId,
        url: links[itemId]?.trim()
      }))
      .filter((item): item is { demandItemId: string; url: string } => Boolean(item.url));

    if (!selected.length || selected.length !== selectedIds.length) {
      showNotification(
        "Complete os links",
        "Selecione ao menos uma peça e informe um link para cada item.",
        "warning"
      );
      return;
    }

    setIsSaving(true);
    try {
      await createPartialSubmission(workspace.task.id, description, selected);
      await onRefresh();
      setDescription("");
      setLinks({});
      setSelectedIds([]);
      showNotification("Entrega enviada", "A nova versão já está na fila de revisão.", "success");
    } catch (error) {
      showNotification(
        "Falha ao enviar",
        error instanceof Error ? error.message : "Não foi possível criar a versão.",
        "warning"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(20rem,0.75fr)_minmax(0,1.25fr)]">
      <section>
        <div className="flex items-center gap-2">
          <PackagePlus className="size-5 text-assert-300" />
          <h3 className="text-base font-bold text-carbon-100">Nova entrega parcial</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-carbon-400">
          Selecione apenas as peças concluídas. A demanda raiz não será duplicada.
        </p>
        <div className="mt-4 space-y-3">
          {submittableItems.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <label
                className="block border border-carbon-800 bg-carbon-950/45 p-3"
                key={item.id}
              >
                <span className="flex items-center gap-3">
                  <input
                    checked={selected}
                    onChange={(event) =>
                      setSelectedIds((current) =>
                        event.target.checked
                          ? [...current, item.id]
                          : current.filter((id) => id !== item.id)
                      )
                    }
                    type="checkbox"
                  />
                  <span className="text-sm font-bold text-carbon-100">
                    Peça {item.position} · {item.title}
                  </span>
                </span>
                {selected && (
                  <input
                    className="mt-3 min-h-10 w-full border border-carbon-800 bg-carbon-900 px-3 text-sm text-carbon-100 outline-none focus:border-assert-300"
                    onChange={(event) =>
                      setLinks((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                    placeholder="Link do vídeo, arte ou arquivo"
                    value={links[item.id] || ""}
                  />
                )}
              </label>
            );
          })}
        </div>
        <textarea
          className="mt-3 min-h-24 w-full resize-y border border-carbon-800 bg-carbon-950 p-3 text-sm text-carbon-100 outline-none focus:border-assert-300"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Observações desta versão"
          value={description}
        />
        <button
          className="mt-3 inline-flex min-h-11 items-center gap-2 bg-assert-400 px-4 text-sm font-bold text-carbon-950 disabled:opacity-40"
          disabled={isSaving || selectedIds.length === 0}
          onClick={() => void submit()}
          type="button"
        >
          <Send className="size-4" />
          Enviar versão
        </button>
      </section>

      <section className="border-l border-glass-stroke pl-0 xl:pl-7">
        <h3 className="text-base font-bold text-carbon-100">Versões enviadas</h3>
        <div className="mt-4 space-y-4">
          {workspace.submissions.length ? (
            workspace.submissions.map((submission) => (
              <article className="border-b border-carbon-800 pb-4" key={submission.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-assert-300">
                      Versão {submission.version}
                    </p>
                    <p className="mt-1 text-xs text-carbon-500">
                      {USERS_DB.find((candidate) => candidate.id === submission.submitted_by)?.name ||
                        submission.submitted_by}{" "}
                      ·{" "}
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short"
                      }).format(new Date(submission.created_at))}
                    </p>
                  </div>
                  <span className="border border-carbon-700 bg-carbon-900 px-2 py-1 text-xs font-bold text-carbon-300">
                    {submission.status}
                  </span>
                </div>
                {submission.description && (
                  <p className="mt-3 text-sm leading-6 text-carbon-300">
                    {submission.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {submission.items.map((item) => {
                    const piece = workspace.items.find(
                      (candidate) => candidate.id === item.demand_item_id
                    );
                    return (
                      <a
                        className="inline-flex min-h-9 items-center gap-2 border border-accent-300/20 bg-accent-400/10 px-3 text-xs font-bold text-accent-300"
                        href={item.url}
                        key={item.id}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Peça {piece?.position || "?"}
                        <ExternalLink className="size-3.5" />
                      </a>
                    );
                  })}
                </div>
              </article>
            ))
          ) : (
            <p className="border border-dashed border-carbon-800 p-6 text-center text-sm text-carbon-500">
              Nenhuma versão enviada.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
