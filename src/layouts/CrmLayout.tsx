import { type CSSProperties, type ElementType, useState, useMemo } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardCheck,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Users,
  Briefcase,
  Video,
  ChevronDown,
  Sparkles,
  UploadCloud,
  Brain,
  X
} from "lucide-react";
import { type Role, useAuth, getGlobalStatus, saveGlobalStatus, type UserStatus } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { useDemands } from "../contexts/DemandContext";
import { getAllClients } from "../data/clients";
import { cn } from "../lib/cn";
import { CommandPalette } from "../features/command-palette/CommandPalette";
import { NotificationStatus } from "../features/notifications/NotificationStatus";

type CrmLink = {
  label: string;
  href: string;
  icon: ElementType;
  roles: Role[];
};

const links: CrmLink[] = [
  { label: "Dashboard", href: "/crm", icon: LayoutDashboard, roles: ["Admin", "Organizador", "Video Maker", "Designer"] },
  { label: "Equipe", href: "/crm/equipe", icon: Users, roles: ["Admin", "Organizador", "Video Maker", "Designer"] },
  { label: "Clientes", href: "/crm/clientes", icon: Briefcase, roles: ["Admin", "Organizador", "Video Maker", "Designer"] },
  { label: "Calendário", href: "/crm/calendario", icon: CalendarDays, roles: ["Admin", "Organizador", "Video Maker", "Designer"] },
  { label: "Demandas", href: "/crm/demandas", icon: CheckSquare, roles: ["Admin", "Organizador", "Video Maker", "Designer"] },
  { label: "Revisões", href: "/crm/revisoes", icon: ClipboardCheck, roles: ["Admin", "Organizador"] },
  { label: "IA Assert", href: "/crm/ia", icon: Brain, roles: ["Admin", "Organizador", "Video Maker", "Designer"] },
  { label: "Vídeos", href: "/crm/videos", icon: Video, roles: ["Admin", "Video Maker"] },
  { label: "Artes", href: "/crm/artes", icon: ImageIcon, roles: ["Admin", "Designer"] },
  { label: "Configurações", href: "/crm/settings", icon: Settings, roles: ["Admin", "Organizador", "Video Maker", "Designer"] }
];

const logoSrc = "/assets/mkt-cropped.png";

function CrmMark() {
  return (
    <span className="relative grid size-11 shrink-0 place-items-center rounded-card border border-assert-300/42 bg-carbon-950/72 shadow-cta">
      <span className="absolute inset-0 rounded-card bg-[radial-gradient(circle_at_42%_56%,color-mix(in_oklch,var(--color-assert-400),transparent_62%),transparent_66%)]" />
      <img className="relative h-9 w-auto object-contain logo-glow" src={logoSrc} alt="" />
    </span>
  );
}

function ActiveRail({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-assert-300 transition-all duration-300",
        active ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
      )}
      aria-hidden="true"
    />
  );
}

const getStatusConfig = (status: UserStatus) => {
  switch (status) {
    case "ONLINE": return { color: "bg-signal-400", glow: "shadow-[0_0_12px_var(--color-signal-400)]", label: "Online" };
    case "EM REUNIAO": return { color: "bg-accent-400", glow: "shadow-[0_0_12px_var(--color-accent-400)]", label: "Em Reunião" };
    case "ALMOÇANDO": return { color: "bg-amber-400", glow: "shadow-[0_0_12px_rgba(251,191,36,0.6)]", label: "Almoçando" };
    case "EM GRAVAÇÃO": return { color: "bg-assert-400", glow: "shadow-[0_0_12px_var(--color-assert-400)]", label: "Em Gravação" };
    case "OFFLINE": return { color: "bg-carbon-600", glow: "", label: "Offline" };
    default: return { color: "bg-signal-400", glow: "shadow-[0_0_12px_var(--color-signal-400)]", label: "Online" };
  }
};

function StatusSelector({ userId }: { userId: string }) {
  const { user, updateProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const status = user?.status || getGlobalStatus(userId) || "ONLINE";

  const handleStatusChange = (newStatus: UserStatus) => {
    saveGlobalStatus(userId, newStatus);
    updateProfile({ status: newStatus });
    setIsOpen(false);
  };

  const currentConf = getStatusConfig(status);
  const options: UserStatus[] = ["ONLINE", "EM REUNIAO", "ALMOÇANDO", "EM GRAVAÇÃO", "OFFLINE"];

  return (
    <div className="relative mt-1">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-full border border-glass-stroke bg-carbon-900/60 px-2 py-0.5 transition-colors hover:bg-carbon-800 focus:outline-none"
        title="Alterar Status"
      >
        <span className={cn("size-1.5 rounded-full", currentConf.color, currentConf.glow)} />
        <span className="text-[0.65rem] font-bold text-carbon-300">{currentConf.label}</span>
        <ChevronDown className="size-3 text-carbon-500" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 bottom-full mb-2 z-50 w-40 overflow-hidden rounded-card border border-glass-stroke bg-carbon-900/94 p-1 shadow-panel backdrop-blur-xl animate-in fade-in zoom-in-95">
            <p className="mb-1 px-2 pt-1 text-[0.65rem] font-bold uppercase tracking-wider text-carbon-400">Seu Status</p>
            {options.map((opt) => {
              const conf = getStatusConfig(opt);
              return (
                <button
                  key={opt}
                  onClick={() => handleStatusChange(opt)}
                  className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-xs font-semibold text-carbon-100 transition-colors hover:bg-carbon-800"
                >
                  <span className={cn("size-2.5 rounded-full", conf.color, conf.glow)} />
                  {conf.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


export function CrmLayout() {
  const { user, logout } = useAuth();
  const { markAllEventsAsRead, markEventAsRead, deleteNotification, targetedEvents, unreadCount } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const { visibleDemands } = useDemands();
  
  const allClients = useMemo(() => getAllClients(), []);
  
  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return null;
    const q = globalSearch.toLowerCase();
    return {
      clients: allClients.filter(c => c.name.toLowerCase().includes(q)),
      demands: visibleDemands.filter(d => d.title.toLowerCase().includes(q) || d.client.toLowerCase().includes(q))
    };
  }, [globalSearch, visibleDemands, allClients]);

  if (!user) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path || (path !== "/crm" && location.pathname.startsWith(path));
  const visibleLinks = links.filter((link) => link.roles.includes(user.role) || user.role === "Admin");
  const currentPage = visibleLinks.find((link) => isActive(link.href))?.label || "CRM";

  return (
    <div className="crm-shell relative flex h-dvh overflow-hidden bg-carbon-950 text-carbon-50">
      <div className="crm-shell-field absolute inset-0" aria-hidden="true" />

      <aside className="relative z-20 hidden w-72 shrink-0 border-r border-glass-stroke bg-carbon-950/58 shadow-panel-deep backdrop-blur-2xl lg:flex lg:flex-col">
        <div className="absolute inset-x-0 bottom-0 h-px neon-divider opacity-40" aria-hidden="true" />

        <div className="p-6">
          <Link
            to="/"
            className="group inline-flex w-full items-center gap-3 rounded-card border border-glass-stroke bg-carbon-900/48 p-3 transition-all duration-300 hover:scale-[1.02] hover:border-assert-300/64 hover:shadow-lg hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
          >
            <CrmMark />
            <span className="min-w-0">
              <span className="block font-display text-sm font-bold uppercase tracking-[0.28em] text-assert-300">
                Assert CRM
              </span>
              <span className="mt-1 block text-xs font-semibold text-carbon-250">Operação interna</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="mb-4 px-3 font-display text-[0.64rem] font-bold uppercase tracking-[0.24em] text-carbon-400">
            Esteira operacional
          </div>
          <div className="grid gap-2">
            {visibleLinks.map((link, index) => {
              const active = isActive(link.href);
              const Icon = link.icon;

              return (
                <Link
                  className={cn(
                    "crm-nav-item group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-card border px-3 py-3.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300",
                    active
                      ? "border-assert-300/36 bg-carbon-900/76 text-carbon-50 shadow-panel"
                      : "border-transparent text-carbon-250 hover:border-glass-stroke hover:bg-carbon-900/56 hover:text-carbon-100"
                  )}
                  key={link.href}
                  style={{ "--nav-delay": `${index * 60}ms` } as CSSProperties}
                  to={link.href}
                >
                  <ActiveRail active={active} />
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-card border transition-all duration-300",
                      active
                        ? "border-assert-300/42 bg-assert-500/12 text-assert-300"
                        : "border-carbon-800/70 bg-carbon-950/42 text-carbon-300 group-hover:text-assert-300"
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="truncate text-sm font-bold">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-glass-stroke bg-carbon-950/42 p-5">
          <div className="mb-5 flex min-w-0 items-center gap-3">
            <div className="relative size-12 shrink-0">
              <div className="grid size-full place-items-center overflow-hidden rounded-full border border-accent-300/40 bg-carbon-900 font-display text-lg font-bold text-accent-300 shadow-panel">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
            </div>
            <div className="min-w-0">
              <span className="block truncate text-sm font-bold text-carbon-50">{user.name}</span>
              <StatusSelector userId={user.id} />
            </div>
          </div>
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-card border border-glass-stroke bg-carbon-900/58 px-4 text-sm font-bold text-carbon-200 transition-all duration-300 hover:scale-[1.02] hover:border-assert-300/54 hover:bg-carbon-800 hover:text-assert-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-assert-300"
            onClick={logout}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Desconectar
          </button>
        </div>
      </aside>

      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden animate-in fade-in duration-1000">
        <header className="relative z-20 flex min-h-20 items-center justify-between gap-4 border-b border-glass-stroke bg-carbon-950/54 px-4 backdrop-blur-2xl sm:px-6 lg:px-10">
          <div className="absolute inset-x-0 bottom-0 h-px neon-divider" aria-hidden="true" />

          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden">
              <CrmMark />
            </div>
            <div className="min-w-0">
              <p className="font-display text-[0.66rem] font-bold uppercase tracking-[0.24em] text-carbon-400">
                Operação Assert
              </p>
              <h1 className="truncate font-display text-xl font-bold tracking-tight text-carbon-50 sm:text-2xl">
                {currentPage}
              </h1>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <CommandPalette />
            <div className="relative hidden w-72 md:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-carbon-400" aria-hidden="true" />
              <input
                aria-label="Buscar no CRM"
                className="h-11 w-full rounded-card border border-glass-stroke bg-carbon-900/46 pl-10 pr-4 text-sm text-carbon-100 placeholder-carbon-400 shadow-panel outline-none transition-all duration-300 focus:border-accent-300 focus:ring-2 focus:ring-accent-300/40"
                placeholder="Buscar clientes, demandas..."
                type="search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
              
              {globalSearch.trim() && searchResults && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setGlobalSearch("")} />
                  <div className="absolute left-0 top-14 z-50 w-[400px] max-h-96 overflow-y-auto rounded-card border border-glass-stroke bg-carbon-900/94 p-2 shadow-panel backdrop-blur-xl animate-in fade-in zoom-in-95 custom-scrollbar">
                    {searchResults.clients.length === 0 && searchResults.demands.length === 0 ? (
                      <p className="text-sm text-carbon-400 p-4 text-center">Nenhum resultado encontrado.</p>
                    ) : (
                      <>
                        {searchResults.clients.length > 0 && (
                          <div className="mb-4">
                            <p className="px-2 pt-1 pb-2 text-[0.65rem] font-bold uppercase tracking-wider text-carbon-400">Clientes</p>
                            {searchResults.clients.slice(0, 3).map(c => (
                              <button key={c.name} onClick={() => { setGlobalSearch(""); navigate(`/crm/clientes/${encodeURIComponent(c.name)}`); }} className="w-full flex items-center gap-2 p-2 rounded hover:bg-carbon-800 text-left transition-colors">
                                <Users className="size-4 text-carbon-300" />
                                <span className="text-sm font-bold text-carbon-100">{c.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {searchResults.demands.length > 0 && (
                          <div>
                            <p className="px-2 pt-1 pb-2 text-[0.65rem] font-bold uppercase tracking-wider text-carbon-400">Demandas</p>
                            {searchResults.demands.slice(0, 5).map(d => (
                              <button key={d.id} onClick={() => { setGlobalSearch(""); navigate(`/crm/demandas/${d.id}`); }} className="w-full flex flex-col gap-1 p-2 rounded hover:bg-carbon-800 text-left transition-colors">
                                <span className="text-xs font-bold text-carbon-400 uppercase tracking-wider">{d.client}</span>
                                <span className="text-sm font-bold text-carbon-100 truncate w-full">{d.title}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="hidden items-center gap-2 rounded-card border border-glass-stroke bg-carbon-900/46 px-4 py-3 text-xs font-bold text-carbon-250 shadow-panel xl:inline-flex">
              <span className="size-2 rounded-full bg-signal-400 shadow-[0_0_12px_var(--color-signal-400)]" />
              Sistema operacional
            </div>
            <div className="relative">
              <button
                aria-label="Abrir notificações"
                className="relative grid size-11 place-items-center rounded-card border border-glass-stroke bg-carbon-900/46 text-carbon-200 shadow-panel transition-all duration-300 hover:scale-105 hover:border-assert-300/54 hover:text-assert-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
                onClick={() => setIsNotificationOpen((current) => !current)}
                type="button"
              >
                <Bell className="size-5" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-assert-500 px-1.5 font-display text-[0.64rem] font-bold text-carbon-50 shadow-cta">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)} />
                  <div className="crm-toast absolute right-0 top-14 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-[1rem] border border-glass-stroke bg-carbon-950/94 p-3 shadow-panel-deep backdrop-blur-2xl">
                  <div className="mb-3 flex items-center justify-between gap-3 px-2 pt-1">
                    <div>
                      <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-assert-300">notificações</p>
                      <p className="mt-1 text-xs font-semibold text-carbon-400">Demandas atribuídas ao seu perfil</p>
                    </div>
                    {unreadCount > 0 ? (
                      <button
                        className="rounded-full border border-glass-stroke bg-carbon-900/72 px-3 py-1.5 text-xs font-bold text-carbon-250 transition-all duration-300 hover:border-signal-300/44 hover:text-signal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-300"
                        onClick={markAllEventsAsRead}
                        type="button"
                      >
                        Marcar lidas
                      </button>
                    ) : (
                      <Inbox className="size-5 text-carbon-400" aria-hidden="true" />
                    )}
                  </div>
                  <NotificationStatus />

                  <div className="max-h-80 overflow-y-auto pr-1">
                    {targetedEvents.length ? (
                      targetedEvents.slice(0, 8).map((event) => {
                        const isUnread = !event.seenBy.includes(user.id);

                        return (
                          <div
                            key={event.id}
                            className="mb-2 flex w-full gap-2 rounded-card border border-carbon-800/80 bg-carbon-900/50 p-3 transition-all duration-300 hover:border-accent-300/48 hover:bg-carbon-900 group"
                          >
                            <button
                              className="flex-1 text-left focus-visible:outline-none"
                              onClick={() => {
                                markEventAsRead(event.id);
                                setIsNotificationOpen(false);
                                if (event.demandId) navigate(`/crm/demandas/${event.demandId}`);
                              }}
                              type="button"
                            >
                              <span className="flex items-start justify-between gap-3">
                                <span className="text-sm font-bold text-carbon-50">{event.title}</span>
                                {isUnread ? (
                                  <span className="mt-1 size-2 shrink-0 rounded-full bg-assert-300 shadow-[0_0_12px_var(--color-assert-300)]" />
                                ) : (
                                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-signal-300" aria-hidden="true" />
                                )}
                              </span>
                              <span className="text-xs leading-5 text-carbon-300 block">{event.message}</span>
                            </button>
                            <button
                              aria-label="Apagar notificação"
                              className="shrink-0 self-start p-1 text-carbon-500 hover:text-assert-400 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-assert-400 rounded"
                              onClick={() => deleteNotification(event.id)}
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-card border border-dashed border-carbon-800 bg-carbon-900/36 p-5 text-center">
                        <Bell className="mx-auto size-6 text-carbon-500" aria-hidden="true" />
                        <p className="mt-3 text-sm font-bold text-carbon-300">Nada novo por aqui</p>
                      </div>
                    )}
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
        </header>

        <nav className="relative z-20 flex gap-2 overflow-x-auto border-b border-glass-stroke bg-carbon-950/58 px-4 py-3 backdrop-blur-xl lg:hidden">
          {visibleLinks.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;

            return (
              <Link
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-card border px-3 text-xs font-bold transition-all duration-300",
                  active
                    ? "border-assert-300/44 bg-assert-500/12 text-assert-100"
                    : "border-glass-stroke bg-carbon-900/44 text-carbon-250"
                )}
                key={link.href}
                to={link.href}
              >
                <Icon className="size-4" aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
          <button
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-card border border-glass-stroke bg-carbon-900/44 px-3 text-xs font-bold text-carbon-250"
            onClick={logout}
            type="button"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Desconectar
          </button>
        </nav>

        <div className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute inset-0 bg-grid-soft opacity-[0.12]" aria-hidden="true" />
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-[42rem] translate-x-1/4 -translate-y-1/3 rotate-12 bg-[linear-gradient(100deg,transparent,color-mix(in_oklch,var(--color-accent-400),transparent_86%),transparent)] blur-[72px]" aria-hidden="true" />
          <div className="crm-route-frame relative z-10 mx-auto max-w-7xl animate-in fade-in duration-700">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
