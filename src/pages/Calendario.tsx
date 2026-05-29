import { type CSSProperties, useMemo, useState } from "react";
import { CalendarDays, Clock3, ExternalLink, LockKeyhole, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "../lib/cn";

const calendarAccount = "marketingasserttech@gmail.com";
const timeZone = "America/Sao_Paulo";
const googleCalendarUrl = "https://calendar.google.com/calendar/u/0/r";
const googleCreateEventUrl = "https://calendar.google.com/calendar/u/0/r/eventedit";
const googleColorPrefix = String.fromCharCode(35);

function getGoogleCalendarEmbedUrl() {
  const url = new URL("https://calendar.google.com/calendar/embed");
  url.searchParams.set("src", calendarAccount);
  url.searchParams.set("ctz", timeZone);
  url.searchParams.set("hl", "pt_BR");
  url.searchParams.set("mode", "WEEK");
  url.searchParams.set("wkst", "1");
  url.searchParams.set("showTitle", "0");
  url.searchParams.set("showPrint", "0");
  url.searchParams.set("showTabs", "1");
  url.searchParams.set("showCalendars", "0");
  url.searchParams.set("showTz", "1");
  url.searchParams.set("bgcolor", `${googleColorPrefix}050816`);
  url.searchParams.append("color", `${googleColorPrefix}D500F9`);

  return url.toString();
}

function formatCurrentDate() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone,
    weekday: "long",
    year: "numeric"
  }).format(new Date());
}

function CalendarStatusCard({
  Icon,
  label,
  value,
  tone = "assert",
  index
}: {
  Icon: typeof CalendarDays;
  label: string;
  value: string;
  tone?: "assert" | "accent" | "signal";
  index: number;
}) {
  return (
    <article
      className="crm-card-enter rounded-card border border-glass-stroke bg-carbon-950/44 p-4 shadow-panel backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-assert-300/54 hover:shadow-2xl"
      style={{ "--crm-card-delay": `${index * 70}ms` } as CSSProperties}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-card border shadow-panel",
            tone === "signal"
              ? "border-signal-300/34 bg-signal-400/10 text-signal-300"
              : tone === "accent"
                ? "border-accent-300/34 bg-accent-400/10 text-accent-300"
                : "border-assert-300/34 bg-assert-500/10 text-assert-300"
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-[0.18em] text-carbon-400">{label}</span>
          <span className="mt-2 block text-sm font-bold leading-5 text-carbon-100">{value}</span>
        </span>
      </div>
    </article>
  );
}

export function Calendario() {
  const [calendarFrameKey, setCalendarFrameKey] = useState(0);
  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(() => new Date());
  const todayLabel = useMemo(() => formatCurrentDate(), []);
  const embedUrl = useMemo(() => getGoogleCalendarEmbedUrl(), []);
  const lastRefreshLabel = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone
  }).format(lastRefresh);

  function refreshCalendar() {
    setIsFrameLoading(true);
    setLastRefresh(new Date());
    setCalendarFrameKey((current) => current + 1);
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[1.25rem] border border-glass-stroke bg-carbon-900/48 p-6 shadow-panel-deep backdrop-blur-2xl sm:p-8 lg:p-10">
        <div className="absolute inset-x-8 top-0 h-px neon-divider" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 crm-panel-scan opacity-70" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-assert-500/16 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-28 left-10 size-80 rounded-full bg-signal-400/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.42fr)] xl:items-end">
          <div className="min-w-0">
            <div className="mb-6 inline-flex max-w-full items-center gap-3 rounded-full border border-assert-300/32 bg-carbon-950/52 px-4 py-3 shadow-panel backdrop-blur-xl">
              <Sparkles className="size-5 shrink-0 text-assert-300" aria-hidden="true" />
              <span className="truncate font-display text-xs font-bold uppercase tracking-[0.22em] text-assert-300">
                agenda oficial assert
              </span>
            </div>

            <h2 className="max-w-4xl text-balance font-display text-[clamp(2.25rem,4.8vw,4.75rem)] font-bold leading-[0.96] tracking-tight text-carbon-50">
              Calendário vivo, direto do Google Calendar.
            </h2>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-carbon-150 sm:text-lg">
              A visualização abaixo carrega a agenda oficial da conta {calendarAccount}. Alterações feitas no Google
              Calendar aparecem aqui sem cadastrar evento duplicado no CRM.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-card bg-assert-500 px-5 text-sm font-bold text-carbon-50 shadow-cta transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-assert-300 focus-visible:ring-offset-carbon-950"
                href={googleCalendarUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Abrir agenda completa
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
              <a
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-card border border-glass-stroke bg-carbon-950/56 px-5 text-sm font-bold text-carbon-100 shadow-panel transition-all duration-300 hover:scale-105 hover:border-accent-300/54 hover:shadow-lg hover:shadow-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-300 focus-visible:ring-offset-carbon-950"
                href={googleCreateEventUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Criar evento no Google
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
              <button
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-card border border-glass-stroke bg-carbon-950/56 px-5 text-sm font-bold text-carbon-100 shadow-panel transition-all duration-300 hover:scale-105 hover:border-signal-300/54 hover:text-signal-300 hover:shadow-lg hover:shadow-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-signal-300 focus-visible:ring-offset-carbon-950"
                onClick={refreshCalendar}
                type="button"
              >
                Recarregar agora
                <RefreshCw className={cn("size-4", isFrameLoading && "animate-spin")} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <CalendarStatusCard Icon={CalendarDays} index={0} label="Data conferida" value={todayLabel} />
            <CalendarStatusCard
              Icon={Clock3}
              index={1}
              label="Fuso da operação"
              tone="signal"
              value={`${timeZone} · atualizado ${lastRefreshLabel}`}
            />
            <CalendarStatusCard
              Icon={LockKeyhole}
              index={2}
              label="Acesso interno"
              tone="accent"
              value="Visível somente para Admin e Organizador no CRM"
            />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[1.25rem] border border-glass-stroke bg-carbon-900/36 p-3 shadow-panel-deep backdrop-blur-2xl sm:p-4 lg:p-5">
        <div className="absolute inset-x-8 top-0 h-px neon-divider" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-grid-soft opacity-20" aria-hidden="true" />

        <div className="relative z-10 overflow-hidden rounded-[1rem] border border-carbon-800/80 bg-carbon-950 shadow-panel">
          {isFrameLoading && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-carbon-950/82 backdrop-blur-sm">
              <div className="grid justify-items-center gap-4">
                <span className="relative grid size-16 place-items-center rounded-full border border-assert-300/28 bg-assert-500/10 text-assert-300 shadow-cta">
                  <CalendarDays className="size-7" aria-hidden="true" />
                  <span className="absolute inset-0 rounded-full border border-assert-300/28 animate-ping" />
                </span>
                <span className="font-display text-xs font-bold uppercase tracking-[0.22em] text-carbon-300">
                  carregando agenda ao vivo
                </span>
              </div>
            </div>
          )}

          <iframe
            className="block h-[72vh] min-h-[38rem] w-full bg-carbon-950"
            key={calendarFrameKey}
            onLoad={() => setIsFrameLoading(false)}
            referrerPolicy="strict-origin-when-cross-origin"
            src={embedUrl}
            title="Calendário oficial da Assert Tech no Google Calendar"
          />
        </div>

        <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3 px-1 text-xs font-semibold text-carbon-400">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-signal-300" aria-hidden="true" />
            Fonte: Google Calendar oficial da conta {calendarAccount}
          </span>
          <span>Se o Google pedir login, use a conta com acesso ao calendário.</span>
        </div>
      </section>
    </div>
  );
}
