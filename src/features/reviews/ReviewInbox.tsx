import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useDemands } from "../../contexts/DemandContext";
import { formatDemandScope } from "../../lib/demand-scope";
import { supabase } from "../../lib/supabase";

const db = supabase as any;

function hoursWaiting(value?: string) {
  if (!value) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 3_600_000));
}

export function ReviewInbox() {
  const { user } = useAuth();
  const { visibleDemands } = useDemands();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "review" | "adjustments" | "risk">("all");
  const [openCommentsByTask, setOpenCommentsByTask] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;

    async function refreshOpenComments() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const { data, error } = await db
        .from("review_comments")
        .select("task_id")
        .eq("status", "open");

      if (!active || error) return;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: { task_id: string }) => {
        counts[row.task_id] = (counts[row.task_id] || 0) + 1;
      });
      setOpenCommentsByTask(counts);
    }

    void refreshOpenComments();
    const channel = supabase
      .channel(`review-inbox:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "review_comments" },
        () => void refreshOpenComments()
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);
  const queue = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return visibleDemands
      .filter((demand) => ["review", "adjustments"].includes(demand.workflowStatus || ""))
      .filter((demand) => {
        if (filter === "review" && demand.workflowStatus !== "review") return false;
        if (filter === "adjustments" && demand.workflowStatus !== "adjustments") return false;
        if (filter === "risk") {
          if (!demand.deadline) return false;
          const hours = (new Date(demand.deadline).getTime() - Date.now()) / 3_600_000;
          if (hours > 48) return false;
        }
        return (
          !normalizedQuery ||
          `${demand.client} ${demand.title}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalizedQuery)
        );
      })
      .sort((left, right) => {
        const leftDeadline = new Date(left.deadline || "9999-12-31").getTime();
        const rightDeadline = new Date(right.deadline || "9999-12-31").getTime();
        return leftDeadline - rightDeadline;
      });
  }, [filter, query, visibleDemands]);

  if (!user || !["Admin", "Organizador"].includes(user.role)) {
    return (
      <div className="border border-amber-300/20 bg-amber-400/5 p-8 text-center">
        <AlertTriangle className="mx-auto size-7 text-amber-300" />
        <p className="mt-3 text-sm font-bold text-carbon-200">
          A inbox de revisões é restrita à gestão.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-glass-stroke pb-5">
        <p className="text-xs font-bold uppercase text-assert-300">Controle de qualidade</p>
        <h2 className="mt-2 text-2xl font-bold text-carbon-50">Inbox de revisões</h2>
        <p className="mt-2 text-sm text-carbon-400">
          Entregas aguardando decisão, ajustes reenviados e itens com risco de prazo.
        </p>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-carbon-500" />
          <span className="sr-only">Buscar revisões</span>
          <input
            className="min-h-11 w-full border border-carbon-800 bg-carbon-950 pl-10 pr-3 text-sm text-carbon-100 outline-none focus:border-assert-300"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cliente ou demanda"
            value={query}
          />
        </label>
        <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filtrar revisões">
          {[
            ["all", "Todas"],
            ["review", "Primeira revisão"],
            ["adjustments", "Ajustes"],
            ["risk", "Risco de prazo"]
          ].map(([value, label]) => (
            <button
              className={`min-h-11 shrink-0 border px-3 text-xs font-bold ${
                filter === value
                  ? "border-assert-300 bg-assert-500/10 text-assert-300"
                  : "border-carbon-800 text-carbon-400"
              }`}
              key={value}
              onClick={() => setFilter(value as typeof filter)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto border border-carbon-800">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead className="bg-carbon-950/75">
            <tr className="text-xs uppercase text-carbon-500">
              <th className="px-4 py-3">Demanda</th>
              <th className="px-4 py-3">Escopo</th>
              <th className="px-4 py-3">Aguardando</th>
              <th className="px-4 py-3">Correções</th>
              <th className="px-4 py-3">Prazo</th>
              <th className="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((demand) => {
              const waiting = hoursWaiting(demand.statusUpdatedAt);
              const openComments = openCommentsByTask[demand.id] || 0;
              const deadlineHours = demand.deadline
                ? (new Date(demand.deadline).getTime() - Date.now()) / 3_600_000
                : Infinity;
              return (
                <tr className="border-t border-carbon-800" key={demand.id}>
                  <td className="px-4 py-4">
                    <p className="text-xs font-bold uppercase text-assert-300">{demand.client}</p>
                    <p className="mt-1 text-sm font-bold text-carbon-100">{demand.title}</p>
                    <p className="mt-1 text-xs text-carbon-500">
                      {demand.workflowStatus === "adjustments" ? "Ajustes reenviados" : "Aguardando revisão"}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-carbon-300">
                    {formatDemandScope(demand.pieceCount || 1, demand.type)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-2 text-sm text-carbon-300">
                      <Clock3 className="size-4 text-carbon-500" />
                      {waiting}h
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-carbon-300">
                    {openComments}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`text-sm font-bold ${
                        deadlineHours <= 24 ? "text-red-300" : deadlineHours <= 48 ? "text-amber-300" : "text-carbon-300"
                      }`}
                    >
                      {demand.deadline
                        ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
                            new Date(demand.deadline)
                          )
                        : "Sem prazo"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      className="inline-flex min-h-10 items-center gap-2 bg-accent-400 px-4 text-xs font-bold text-carbon-950"
                      to={`/crm/demandas/${demand.id}?tab=qc`}
                    >
                      <SlidersHorizontal className="size-4" />
                      Abrir QC
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!queue.length && (
          <div className="p-10 text-center">
            <CheckCircle2 className="mx-auto size-7 text-signal-300" />
            <p className="mt-3 text-sm font-bold text-carbon-300">Nenhuma revisão neste filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
}
