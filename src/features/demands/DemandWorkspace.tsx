import {
  Activity,
  ArrowLeft,
  Boxes,
  ClipboardCheck,
  FileText,
  PackageCheck,
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react";
import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/cn";
import { DemandActivityTab } from "./DemandActivityTab";
import { DemandDeliveriesTab } from "./DemandDeliveriesTab";
import { DemandPiecesTab } from "./DemandPiecesTab";
import { DemandQcTab } from "./DemandQcTab";
import { DemandSummaryTab } from "./DemandSummaryTab";
import { useDemandWorkspace } from "./useDemandWorkspace";
import { workflowLabels } from "./workflow";

const tabs = [
  { id: "resumo", label: "Resumo", Icon: FileText },
  { id: "pecas", label: "Peças", Icon: Boxes },
  { id: "entregas", label: "Entregas", Icon: PackageCheck },
  { id: "qc", label: "QC", Icon: ClipboardCheck },
  { id: "atividade", label: "Atividade", Icon: Activity }
] as const;

type TabId = (typeof tabs)[number]["id"];

export function DemandWorkspace() {
  const { demandId } = useParams<{ demandId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { connectionState, data, error, isLoading, refresh } = useDemandWorkspace(demandId);
  const activeTab = (searchParams.get("tab") as TabId) || "resumo";
  const scopeLabel = useMemo(
    () => `${data?.items.length || 0} peça(s)`,
    [data?.items.length]
  );

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="grid min-h-[55vh] place-items-center">
        <RefreshCw className="size-7 animate-spin text-assert-300" />
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="border border-red-400/25 bg-red-500/5 p-8 text-center">
        <h2 className="text-xl font-bold text-carbon-100">Demanda não encontrada</h2>
        <p className="mt-2 text-sm text-carbon-400">{error || "Verifique o acesso ao registro."}</p>
        <Link className="mt-5 inline-flex min-h-10 items-center gap-2 text-assert-300" to="/crm/demandas">
          <ArrowLeft className="size-4" />
          Voltar ao Kanban
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex min-h-9 items-center gap-2 text-sm font-bold text-carbon-400 hover:text-carbon-100"
        to="/crm/demandas"
      >
        <ArrowLeft className="size-4" />
        Kanban
      </Link>

      <header className="border-b border-glass-stroke pb-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-assert-300">
              {data.task.clients?.name || data.task.client_id}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-carbon-50 sm:text-3xl">
              {data.task.title}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="border border-assert-300/25 bg-assert-500/10 px-2.5 py-1 text-xs font-bold text-assert-300">
                {workflowLabels[data.task.status]}
              </span>
              <span className="border border-carbon-700 bg-carbon-900 px-2.5 py-1 text-xs font-bold text-carbon-300">
                {scopeLabel}
              </span>
              <span className="border border-carbon-700 bg-carbon-900 px-2.5 py-1 text-xs font-bold text-carbon-300">
                prioridade {data.task.priority}
              </span>
            </div>
          </div>
          <div
            className={cn(
              "inline-flex min-h-10 items-center gap-2 border px-3 text-xs font-bold",
              connectionState === "connected"
                ? "border-signal-300/25 text-signal-300"
                : "border-amber-300/25 text-amber-300"
            )}
          >
            {connectionState === "connected" ? (
              <Wifi className="size-4" />
            ) : (
              <WifiOff className="size-4" />
            )}
            {connectionState === "connected"
              ? "Realtime conectado"
              : connectionState === "offline"
                ? "Offline"
                : "Reconectando"}
          </div>
        </div>
      </header>

      <nav
        aria-label="Seções da demanda"
        className="flex gap-1 overflow-x-auto border-b border-glass-stroke"
      >
        {tabs.map(({ Icon, id, label }) => (
          <button
            aria-current={activeTab === id ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-bold",
              activeTab === id
                ? "border-assert-300 text-assert-300"
                : "border-transparent text-carbon-400 hover:text-carbon-100"
            )}
            key={id}
            onClick={() =>
              setSearchParams((current) => {
                const next = new URLSearchParams(current);
                next.set("tab", id);
                return next;
              })
            }
            type="button"
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      <main>
        {activeTab === "resumo" && (
          <DemandSummaryTab currentUser={user} onRefresh={refresh} workspace={data} />
        )}
        {activeTab === "pecas" && (
          <DemandPiecesTab currentUser={user} onRefresh={refresh} workspace={data} />
        )}
        {activeTab === "entregas" && (
          <DemandDeliveriesTab onRefresh={refresh} workspace={data} />
        )}
        {activeTab === "qc" && (
          <DemandQcTab currentUser={user} onRefresh={refresh} workspace={data} />
        )}
        {activeTab === "atividade" && <DemandActivityTab workspace={data} />}
      </main>
    </div>
  );
}
