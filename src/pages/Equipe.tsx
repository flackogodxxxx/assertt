import { useEffect, useMemo, useState } from "react";
import { Search, UserCircle2, Video, PenTool, ShieldCheck, Mail, MessageSquare } from "lucide-react";
import { USERS_DB, getGlobalAvatar, type Role, type User, getGlobalStatus, type UserStatus } from "../contexts/AuthContext";
import { useDemands } from "../contexts/DemandContext";
import { usePresence } from "../contexts/PresenceContext";
import { cn } from "../lib/cn";
import { calculateCapacity } from "../features/capacity/capacity";
import { mapProfileToUser } from "../lib/crm-mappers";
import { supabase } from "../lib/supabase";
import type { ProfileRow } from "../lib/supabase-types";

type Status = UserStatus;
type CapacityRow = {
  assignee_id: string | null;
  estimated_minutes: number | null;
  production_tasks?: { due_date?: string | null } | Array<{ due_date?: string | null }>;
  status: string;
};

const db = supabase as any;

const getStatusConfig = (status: Status) => {
  switch (status) {
    case "ONLINE":
      return { color: "bg-signal-400", border: "border-signal-400/30", text: "text-signal-300", glow: "shadow-[0_0_12px_var(--color-signal-400)]" };
    case "EM REUNIAO":
      return { color: "bg-accent-400", border: "border-accent-400/30", text: "text-accent-300", glow: "shadow-[0_0_12px_var(--color-accent-400)]" };
    case "ALMOÇANDO":
      return { color: "bg-amber-400", border: "border-amber-400/30", text: "text-amber-300", glow: "shadow-[0_0_12px_rgba(251,191,36,0.6)]" };
    case "EM GRAVAÇÃO":
      return { color: "bg-assert-400", border: "border-assert-400/30", text: "text-assert-300", glow: "shadow-[0_0_12px_var(--color-assert-400)]" };
    case "OFFLINE":
      return { color: "bg-carbon-600", border: "border-carbon-600/30", text: "text-carbon-400", glow: "" };
  }
};

const getRoleIcon = (role: Role) => {
  switch (role) {
    case "Admin": return <ShieldCheck className="size-4" />;
    case "Organizador": return <UserCircle2 className="size-4" />;
    case "Designer": return <PenTool className="size-4" />;
    case "Video Maker": return <Video className="size-4" />;
  }
};

export function Equipe() {
  const [searchTerm, setSearchTerm] = useState("");
  const [team, setTeam] = useState<User[]>(USERS_DB);
  const [capacityRows, setCapacityRows] = useState<CapacityRow[]>([]);
  const { demands } = useDemands();
  const { getPresenceStatus, isOnline } = usePresence();
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    window.addEventListener("crm-status-updated", handleUpdate);
    window.addEventListener("crm-avatar-updated", handleUpdate);
    return () => {
      window.removeEventListener("crm-status-updated", handleUpdate);
      window.removeEventListener("crm-avatar-updated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function refreshOperationalData() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const [profilesResult, itemsResult] = await Promise.all([
        db.from("profiles").select("*").order("name"),
        db
          .from("demand_items")
          .select("assignee_id, estimated_minutes, status, production_tasks!inner(due_date)")
          .not("status", "in", "(approved,delivered)")
      ]);

      if (!active) return;
      if (!profilesResult.error && profilesResult.data?.length) {
        setTeam((profilesResult.data as ProfileRow[]).map(mapProfileToUser));
      }
      if (!itemsResult.error) {
        setCapacityRows((itemsResult.data || []) as CapacityRow[]);
      }
    }

    void refreshOperationalData();
    const channel = supabase
      .channel(`team-capacity:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void refreshOperationalData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "demand_items" }, () => {
        void refreshOperationalData();
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const filteredTeam = useMemo(() => {
    return team.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, team]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-carbon-50">Equipe Assert</h2>
          <p className="text-sm font-semibold text-carbon-400">Visão macro de todos os colaboradores da agência.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-carbon-400" aria-hidden="true" />
          <input
            className="h-11 w-full rounded-card border border-glass-stroke bg-carbon-900/60 pl-10 pr-4 text-sm text-carbon-50 shadow-panel outline-none transition-all duration-300 focus:border-assert-300 focus:ring-1 focus:ring-assert-300"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou cargo..."
            type="search"
            value={searchTerm}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTeam.map((member, index) => {
          const avatar = member.avatar || getGlobalAvatar(member.email);
          
          const status: UserStatus = isOnline(member.id)
            ? getPresenceStatus(member.id) || getGlobalStatus(member.id) || "ONLINE"
            : "OFFLINE";
          
          const statusConf = getStatusConfig(status);
          const memberDemands = demands.filter(
            (demand) => demand.assigneeIds.includes(member.id) && demand.status !== "Concluído"
          );
          const activeDemandsCount = memberDemands.length;
          const normalizedWork = capacityRows
            .filter((item) => item.assignee_id === member.id)
            .map((item) => {
              const linkedTask = Array.isArray(item.production_tasks)
                ? item.production_tasks[0]
                : item.production_tasks;
              return {
                activePieces: 1,
                adjustmentCycles: item.status === "adjustments" ? 1 : 0,
                dueAt: linkedTask?.due_date || undefined,
                estimatedMinutes: item.estimated_minutes || 120
              };
            });
          const capacity = calculateCapacity({
            weeklyCapacityMinutes: 2400,
            work: normalizedWork.length
              ? normalizedWork
              : memberDemands.map((demand) => ({
                  activePieces: demand.pieceCount || 1,
                  adjustmentCycles:
                    demand.workflowStatus === "adjustments"
                      ? Math.max(1, demand.comments?.length || 0)
                      : 0,
                  dueAt: demand.deadline,
                  estimatedMinutes: Math.max(1, demand.pieceCount || 1) * 120
                }))
          });
          const capacityLabel = {
            available: "Disponível",
            balanced: "Equilibrada",
            "near-capacity": "Próximo do limite",
            overloaded: "Acima da capacidade"
          }[capacity.label];

          return (
            <article 
              key={member.id}
              className="group relative flex flex-col overflow-hidden rounded-card border border-glass-stroke bg-carbon-900/40 p-5 shadow-panel backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-assert-300/40 hover:shadow-2xl hover:shadow-assert-500/10"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="absolute inset-x-6 top-0 h-px neon-divider opacity-0 transition-opacity duration-500 group-hover:opacity-80" aria-hidden="true" />
              
              <div className="flex items-start justify-between mb-4">
                <div className="relative size-16 shrink-0">
                  <div className="grid size-full place-items-center overflow-hidden rounded-full border border-glass-stroke bg-carbon-950 font-display text-2xl font-bold text-assert-300 shadow-panel">
                    {avatar ? (
                      <img src={avatar} alt={member.name} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                  <span className={cn("absolute bottom-0 right-0 size-4 rounded-full border-2 border-carbon-900 transition-all duration-500", statusConf.color, statusConf.glow)} title={status} />
                </div>
                
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider", statusConf.border, statusConf.text, "bg-carbon-950/50")}>
                  <span className={cn("size-1.5 rounded-full", statusConf.color, statusConf.glow)} />
                  {status}
                </span>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-bold text-carbon-50">{member.name}</h3>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-carbon-400 mt-1">
                  {getRoleIcon(member.role)}
                  <span>{member.role}</span>
                </div>
              </div>

              <div className="mt-auto space-y-3 border-t border-glass-stroke/50 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase text-carbon-500">Demandas ativas</span>
                  <span className="text-xs font-bold text-carbon-200">{activeDemandsCount}</span>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold">
                    <span className="text-carbon-500">Capacidade real</span>
                    <span className={capacity.loadPercent > 100 ? "text-red-300" : "text-carbon-300"}>
                      {capacity.loadPercent}% · {capacityLabel}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden bg-carbon-800">
                    <div
                      className={cn(
                        "h-full",
                        capacity.loadPercent > 100
                          ? "bg-red-400"
                          : capacity.loadPercent >= 80
                            ? "bg-amber-400"
                            : "bg-signal-400"
                      )}
                      style={{ width: `${Math.min(100, capacity.loadPercent)}%` }}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
