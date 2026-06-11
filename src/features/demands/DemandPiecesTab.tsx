import { CheckCircle2, Clock3, UserRound } from "lucide-react";
import { useState } from "react";
import { USERS_DB, type User } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { updateDemandItem } from "./repository";
import type { DemandWorkspaceData } from "./types";

type DemandPiecesTabProps = {
  currentUser: User;
  onRefresh: () => Promise<void>;
  workspace: DemandWorkspaceData;
};

export function DemandPiecesTab({
  currentUser,
  onRefresh,
  workspace
}: DemandPiecesTabProps) {
  const { showNotification } = useNotification();
  const [savingId, setSavingId] = useState<string | null>(null);
  const isManagement = currentUser.role === "Admin" || currentUser.role === "Organizador";

  async function saveItem(
    itemId: string,
    updates: Parameters<typeof updateDemandItem>[1]
  ) {
    setSavingId(itemId);
    try {
      await updateDemandItem(itemId, updates);
      await onRefresh();
    } catch (error) {
      showNotification(
        "Não foi possível salvar a peça",
        error instanceof Error ? error.message : "Tente novamente.",
        "warning"
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-glass-stroke text-xs uppercase text-carbon-500">
            <th className="px-3 py-3">Peça</th>
            <th className="px-3 py-3">Orientação</th>
            <th className="px-3 py-3">Responsável</th>
            <th className="px-3 py-3">Estimativa</th>
            <th className="px-3 py-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {workspace.items.map((item) => (
            <tr className="border-b border-carbon-800/70 align-top" key={item.id}>
              <td className="px-3 py-4">
                <p className="text-xs font-bold text-assert-300">#{item.position}</p>
                <p className="mt-1 text-sm font-bold text-carbon-100">{item.title}</p>
                {!item.is_required && (
                  <span className="mt-2 inline-block bg-carbon-800 px-2 py-1 text-[0.65rem] font-bold text-carbon-400">
                    opcional
                  </span>
                )}
              </td>
              <td className="max-w-md px-3 py-4 text-sm leading-6 text-carbon-300">
                {item.instruction || "Sem orientação específica."}
              </td>
              <td className="px-3 py-4">
                {isManagement ? (
                  <select
                    className="min-h-10 w-full border border-carbon-800 bg-carbon-950 px-2 text-xs text-carbon-100"
                    disabled={savingId === item.id}
                    onChange={(event) =>
                      void saveItem(item.id, { assignee_id: event.target.value })
                    }
                    value={item.assignee_id || ""}
                  >
                    <option value="">Sem responsável</option>
                    {USERS_DB.filter((candidate) =>
                      ["Designer", "Video Maker"].includes(candidate.role)
                    ).map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-carbon-200">
                    <UserRound className="size-4 text-carbon-500" />
                    {USERS_DB.find((candidate) => candidate.id === item.assignee_id)?.name ||
                      "Não definido"}
                  </span>
                )}
              </td>
              <td className="px-3 py-4">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-carbon-300">
                  <Clock3 className="size-4 text-carbon-500" />
                  {item.estimated_minutes || 0} min
                </span>
              </td>
              <td className="px-3 py-4">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-carbon-200">
                  {item.status === "approved" && (
                    <CheckCircle2 className="size-4 text-signal-300" />
                  )}
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
