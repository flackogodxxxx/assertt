import {
  Archive,
  Brain,
  Briefcase,
  CheckSquare,
  Command,
  Search,
  SlidersHorizontal,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { canUserSeeDemand, useDemands } from "../../contexts/DemandContext";
import { getAllClients } from "../../data/clients";
import { buildCommandResults } from "./search";

export function CommandPalette() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { demands } = useDemands();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const clients = useMemo(() => getAllClients(), []);
  const results = useMemo(
    () =>
      buildCommandResults({
        clients,
        demands: demands
          .filter((demand) => canUserSeeDemand(demand, user))
          .map((demand) => ({
            archived: demand.workflowStatus === "delivered" || demand.status === "Concluído",
            client: demand.client,
            id: demand.id,
            title: demand.title
          })),
        query
      }),
    [clients, demands, query, user]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((current) => !current);
      }
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  function open(href: string) {
    setIsOpen(false);
    setQuery("");
    navigate(href);
  }

  return (
    <>
      <button
        aria-label="Buscar no CRM"
        className="inline-flex min-h-11 items-center gap-2 border border-glass-stroke bg-carbon-900/46 px-3 text-xs font-bold text-carbon-300 hover:border-assert-300/45 hover:text-assert-300"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Buscar</span>
        <span className="hidden border border-carbon-700 bg-carbon-950 px-1.5 py-0.5 text-[0.65rem] text-carbon-500 lg:inline">
          Ctrl K
        </span>
      </button>

      {isOpen && (
        <div
          aria-label="Paleta de comandos"
          aria-modal="true"
          className="fixed inset-0 z-[80] flex justify-center bg-carbon-950/80 px-4 pt-[12vh] backdrop-blur-md"
          role="dialog"
        >
          <button
            aria-label="Fechar paleta"
            className="absolute inset-0"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div className="relative z-10 h-fit w-full max-w-2xl border border-glass-stroke bg-carbon-900 shadow-panel-deep">
            <div className="flex items-center gap-3 border-b border-carbon-800 px-4">
              <Command className="size-5 text-assert-300" />
              <input
                className="min-h-14 flex-1 bg-transparent text-sm text-carbon-100 outline-none placeholder:text-carbon-500"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Clientes, demandas ou ações"
                ref={inputRef}
                value={query}
              />
              <button
                aria-label="Fechar"
                className="grid size-9 place-items-center text-carbon-500 hover:text-carbon-100"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              {!query.trim() && (
                <div className="grid gap-1">
                  {[
                    { href: "/crm/clientes", label: "Abrir clientes", Icon: Briefcase },
                    { href: "/crm/demandas", label: "Abrir Kanban", Icon: CheckSquare },
                    { href: "/crm/revisoes", label: "Abrir revisões", Icon: SlidersHorizontal },
                    { href: "/crm/ia", label: "Abrir IA Assert", Icon: Brain }
                  ].map(({ Icon, href, label }) => (
                    <button
                      className="flex min-h-11 items-center gap-3 px-3 text-left text-sm font-bold text-carbon-200 hover:bg-carbon-800"
                      key={href}
                      onClick={() => open(href)}
                      type="button"
                    >
                      <Icon className="size-4 text-carbon-500" />
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {query.trim() &&
                results.map((result) => (
                  <button
                    className="flex min-h-12 w-full items-center gap-3 px-3 text-left hover:bg-carbon-800"
                    key={result.id}
                    onClick={() => open(result.href)}
                    type="button"
                  >
                    {result.kind === "client" ? (
                      <Briefcase className="size-4 text-accent-300" />
                    ) : result.kind === "archived-demand" ? (
                      <Archive className="size-4 text-carbon-500" />
                    ) : (
                      <CheckSquare className="size-4 text-assert-300" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-carbon-100">
                        {result.label}
                      </span>
                      <span className="block truncate text-xs text-carbon-500">
                        {result.description}
                      </span>
                    </span>
                  </button>
                ))}

              {query.trim() && !results.length && (
                <p className="p-6 text-center text-sm text-carbon-500">Nenhum resultado autorizado.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
