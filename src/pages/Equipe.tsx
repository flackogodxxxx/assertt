import { useEffect, useMemo, useState } from "react";
import { Search, UserCircle2, Video, PenTool, ShieldCheck, Mail, MessageSquare } from "lucide-react";
import { USERS_DB, getGlobalAvatar, type Role, type User, getGlobalStatus, type UserStatus } from "../contexts/AuthContext";
import { useDemands } from "../contexts/DemandContext";
import { cn } from "../lib/cn";

type Status = UserStatus;

const getSimulatedStatus = (id: string): Status => {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mod = hash % 10;
  if (mod < 5) return "ONLINE";
  if (mod === 5) return "EM REUNIAO";
  if (mod === 6) return "ALMOÇANDO";
  if (mod === 7 || mod === 8) return "EM GRAVAÇÃO";
  return "OFFLINE";
};

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
  const { demands } = useDemands();
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleStatusUpdate = () => setTick(t => t + 1);
    window.addEventListener("crm-status-updated", handleStatusUpdate);
    return () => window.removeEventListener("crm-status-updated", handleStatusUpdate);
  }, []);

  const filteredTeam = useMemo(() => {
    return USERS_DB.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

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
          const avatar = getGlobalAvatar(member.email);
          const status = getGlobalStatus(member.id) || getSimulatedStatus(member.id);
          const statusConf = getStatusConfig(status);
          const activeDemandsCount = demands.filter(d => d.assigneeIds.includes(member.id) && d.status !== "Concluído").length;

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

              <div className="mt-auto pt-4 border-t border-glass-stroke/50 flex items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-carbon-500 uppercase tracking-wider">Demandas Ativas</span>
                  <span className="grid min-w-6 place-items-center rounded-full bg-carbon-950 px-1.5 py-0.5 text-xs font-bold text-carbon-200 border border-carbon-800">
                    {activeDemandsCount}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
