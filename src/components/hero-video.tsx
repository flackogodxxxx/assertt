import {
  ArrowRight,
  ChevronRight,
  LineChart,
  MailCheck,
  PlayCircle,
  RadioTower,
  TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

type HeroVideoProps = {
  onAuditClick: () => void;
};

const heroVideoSrc = "./assets/Abstract_purple_pink_waves_anima…_202605281421.mp4";
const posterSrc = "./assets/assert-tech-poster.svg";
const logoSrc = "./assets/mkt-cropped.png";

const trustBadges = [
  { label: "Google Partner", value: "Sinal validado" },
  { label: "ROI/CAC no centro", value: "Mídia com margem" },
  { label: "Auditoria sem custo", value: "Diagnóstico claro" }
];

const growthStages = ["Aquisição", "Mensuração", "Conversão", "Escala"];

const liveSignals = [
  { label: "Demanda", value: "+200%", Icon: MailCheck },
  { label: "CAC", value: "-40%", Icon: TrendingUp },
  { label: "Conversão", value: "CRO", Icon: LineChart }
];

function HeaderLogo() {
  return (
    <a
      className="group relative inline-flex max-w-full items-center gap-3 overflow-hidden rounded-full border border-assert-300/25 bg-carbon-950/60 py-2 pl-2 pr-5 shadow-panel backdrop-blur-2xl transition-all duration-500 hover:border-assert-300/60 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-950"
      href="#top"
      aria-label="Assert Tech — Receita em escala"
    >
      <span
        className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(110deg,transparent_20%,color-mix(in_oklch,var(--color-assert-400),transparent_82%)_45%,color-mix(in_oklch,var(--color-accent-300),transparent_86%)_55%,transparent_80%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden="true"
      />

      <span className="relative grid size-11 shrink-0 place-items-center">
        <span
          className="absolute inset-0 animate-orbit rounded-full bg-[conic-gradient(from_180deg,transparent_40%,var(--color-assert-400)_70%,var(--color-accent-300)_85%,transparent_100%)] opacity-50 blur-[0.5px]"
          aria-hidden="true"
        />
        <span className="absolute inset-[1.5px] rounded-full bg-carbon-950 shadow-cta" />
        <span
          className="absolute inset-[1.5px] rounded-full bg-[radial-gradient(circle_at_38%_48%,color-mix(in_oklch,var(--color-assert-400),transparent_58%),transparent_60%)]"
          aria-hidden="true"
        />
        <img className="relative h-7 w-auto object-contain logo-glow" src={logoSrc} alt="" />
      </span>

      <span className="relative min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="font-display text-[0.64rem] font-bold uppercase tracking-[0.24em] text-assert-300">
            Assert Tech
          </span>
          <span
            className="size-1.5 rounded-full bg-signal-300 shadow-lg shadow-signal-300/50 animate-pulse-glow"
            aria-hidden="true"
          />
        </span>
        <span className="mt-0.5 block text-[0.82rem] font-semibold tracking-tight text-carbon-100">
          Receita em escala
        </span>
      </span>
    </a>
  );
}

function PerformanceSignalBadge() {
  const markers = ["ROI", "CAC", "CRO"];
  const meterBars = [34, 68, 48, 88];

  return (
    <div className="group/signal relative inline-grid max-w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-card border border-assert-300/36 bg-carbon-950/42 px-3 py-2.5 shadow-panel backdrop-blur-xl">
      <div
        className="absolute inset-0 bg-[linear-gradient(120deg,color-mix(in_oklch,var(--color-assert-400),transparent_88%),transparent_48%,color-mix(in_oklch,var(--color-signal-400),transparent_90%))] opacity-80"
        aria-hidden="true"
      />
      <div
        className="relative flex h-11 w-14 shrink-0 items-end justify-center gap-1 overflow-hidden rounded-card border border-assert-300/45 bg-carbon-950/72 px-2 pb-2 pt-3 shadow-cta"
        aria-hidden="true"
      >
        <span className="absolute inset-x-2 top-2 h-px bg-[linear-gradient(90deg,transparent,var(--color-assert-300),transparent)] opacity-70" />
        {meterBars.map((height, index) => (
          <span
            className="signal-meter-bar w-1.5 rounded-full bg-[linear-gradient(180deg,var(--color-accent-300),var(--color-assert-400))]"
            key={height}
            style={{ animationDelay: `${index * 0.18}s`, height: `${height}%` }}
          />
        ))}
      </div>

      <div className="relative min-w-0">
        <p className="truncate font-display text-[0.68rem] font-bold uppercase tracking-[0.22em] text-carbon-50">
          Performance guiada por receita
        </p>
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2" aria-hidden="true">
          {markers.map((marker, index) => (
            <span className="flex min-w-0 flex-1 items-center gap-2" key={marker}>
              <span className="h-1 min-w-8 flex-1 overflow-hidden rounded-full bg-carbon-800">
                <span
                  className="signal-bar block h-full rounded-full bg-[linear-gradient(90deg,var(--color-assert-400),var(--color-accent-300))]"
                  style={{ animationDelay: `${index * 0.28}s` }}
                />
              </span>
              <span className="font-display text-[0.58rem] font-bold tracking-[0.18em] text-carbon-300">
                {marker}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RevenueFlowStrip() {
  return (
    <div className="hero-flow-strip mt-5 grid grid-cols-2 gap-3 rounded-card border border-glass-stroke bg-carbon-950/34 p-3 shadow-panel backdrop-blur-xl sm:grid-cols-4">
      {growthStages.map((stage, index) => (
        <div className="relative min-w-0 rounded-card bg-carbon-950/34 px-3 py-3" key={stage}>
          <span className="font-display text-[0.62rem] font-bold uppercase tracking-[0.2em] text-carbon-400">
            0{index + 1}
          </span>
          <span className="mt-1 block truncate text-sm font-bold text-carbon-100">{stage}</span>
          <span className="mt-3 block h-1 overflow-hidden rounded-full bg-carbon-800" aria-hidden="true">
            <span
              className="hero-flow-progress block h-full rounded-full bg-[linear-gradient(90deg,var(--color-assert-400),var(--color-accent-300))]"
              style={{ animationDelay: `${index * 0.22}s` }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function CtaGlyph() {
  return (
    <span className="relative grid size-7 shrink-0 place-items-center rounded-full bg-carbon-50/14" aria-hidden="true">
      <span className="absolute h-px w-4 rotate-[-28deg] rounded-full bg-carbon-50" />
      <span className="absolute size-1.5 translate-x-1.5 translate-y-[-0.35rem] rounded-full bg-carbon-50" />
    </span>
  );
}

function ProofSignal({ label, value }: { label: string; value: string }) {
  return (
    <span className="group/proof relative min-w-0 overflow-hidden rounded-card border border-glass-stroke bg-carbon-950/48 px-4 py-3 shadow-panel backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-assert-300/70 hover:shadow-lg hover:shadow-primary/20">
      <span
        className="absolute inset-x-4 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-assert-300),transparent)] opacity-0 transition-opacity duration-300 group-hover/proof:opacity-100"
        aria-hidden="true"
      />
      <span className="flex items-center gap-3">
        <span
          className="relative grid size-7 shrink-0 place-items-center rounded-card border border-assert-300/28 bg-assert-500/12"
          aria-hidden="true"
        >
          <span className="size-2 rounded-full bg-assert-300 shadow-lg shadow-primary/30" />
          <span className="absolute inset-1 rounded-card border border-signal-300/18" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-carbon-100">{label}</span>
          <span className="mt-0.5 block truncate font-display text-[0.62rem] font-bold uppercase tracking-[0.16em] text-carbon-400">
            {value}
          </span>
        </span>
      </span>
    </span>
  );
}

export function HeroVideo({ onAuditClick }: HeroVideoProps) {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-carbon-950" aria-labelledby="hero-title">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover opacity-100 video-vivid"
        aria-hidden="true"
        poster={posterSrc}
        preload="auto"
      >
        <source src={heroVideoSrc} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-carbon-950/8" />
      <div className="absolute inset-0 hero-motion-field" aria-hidden="true" />
      <div className="absolute inset-y-0 left-0 w-[74%] bg-[linear-gradient(90deg,var(--color-carbon-950)_0%,color-mix(in_oklch,var(--color-carbon-950),transparent_22%)_44%,color-mix(in_oklch,var(--color-carbon-950),transparent_70%)_78%,transparent_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(0deg,var(--color-carbon-950),transparent)]" />
      <div className="absolute inset-0 bg-grid-soft opacity-14" />

      <header className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8 lg:px-10" data-reveal="down">
        <HeaderLogo />
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="inline-flex min-h-12 min-w-0 items-center gap-2 rounded-card border border-glass-stroke bg-carbon-950/38 px-5 text-sm font-semibold text-carbon-100 shadow-panel backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-assert-300 hover:shadow-lg hover:shadow-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-950 [&_svg]:shrink-0"
          >
            Acessar CRM
          </Link>
          <button
            className="inline-flex min-h-12 min-w-0 items-center gap-2 rounded-card border border-glass-stroke bg-assert-500/20 px-5 text-sm font-semibold text-carbon-50 shadow-panel backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-assert-300 hover:bg-assert-500/30 hover:shadow-lg hover:shadow-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-950 [&_svg]:shrink-0"
            onClick={onAuditClick}
          >
            <PlayCircle className="size-5 text-assert-300" aria-hidden="true" />
            Diagnóstico
            <ChevronRight className="size-4 text-carbon-300" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-104px)] max-w-7xl items-start px-5 pb-16 pt-5 sm:px-8 lg:px-10 xl:pb-20">
        <div className="grid w-full min-w-0 grid-cols-1 items-center gap-10 xl:grid-cols-[minmax(0,0.92fr)_minmax(440px,1.08fr)] xl:gap-12 2xl:gap-14">
          <div className="relative min-w-0 max-w-4xl" data-reveal="left">
            <div className="pointer-events-none absolute -left-4 top-24 hidden h-[420px] w-px bg-[linear-gradient(180deg,transparent,var(--color-assert-400),transparent)] opacity-60 sm:block" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-7 top-48 hidden size-6 rounded-full border border-assert-300/40 bg-carbon-950/60 shadow-cta sm:block" aria-hidden="true" />
            <PerformanceSignalBadge />

            <h1
              id="hero-title"
              className="mt-6 max-w-[780px] break-words font-display text-[clamp(3rem,6vw,5.35rem)] font-bold leading-[0.91] tracking-tight text-carbon-50"
            >
              <span className="block text-transparent bg-clip-text bg-[linear-gradient(110deg,var(--color-carbon-50),var(--color-assert-300)_48%,var(--color-accent-300))] text-neon">
                Receita
              </span>
              <span className="block text-carbon-50">
                que ganha <span className="headline-orbit-word">órbita.</span>
              </span>
              <span className="mt-4 block max-w-3xl text-[0.43em] leading-[1.06] text-carbon-150">
                Marketing orientado por margem, demanda e conversão real.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-[clamp(1.05rem,1.45vw,1.28rem)] font-medium leading-[1.48] text-carbon-100">
              A Assert Tech conecta mídia paga, SEO e CRO em um sistema de crescimento que transforma atenção em
              pipeline, clientes e escala previsível.
            </p>

            <div className="mt-5 grid gap-3 rounded-card border border-glass-stroke bg-carbon-950/38 p-3 shadow-panel backdrop-blur-xl min-[560px]:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
              <Button className="w-full justify-center" onClick={onAuditClick} size="xl">
                <CtaGlyph />
                Solicitar Auditoria Gratuita
                <ArrowRight className="size-5" aria-hidden="true" />
              </Button>
              <button
                className="inline-flex min-h-16 w-full min-w-0 items-center justify-center gap-2 rounded-card border border-glass-stroke bg-carbon-950/44 px-5 text-center text-base font-semibold text-carbon-100 shadow-panel backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-accent-300 hover:text-carbon-50 hover:shadow-lg hover:shadow-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-950 [&_svg]:shrink-0"
                onClick={() => document.getElementById("servicos")?.scrollIntoView({ behavior: "smooth" })}
              >
                Conhecer nossa operação
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="xl:hidden">
              <RevenueFlowStrip />
            </div>

            <div
              className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3"
              aria-label="Emblemas de confiança"
            >
              {trustBadges.map(({ label, value }) => (
                <ProofSignal key={label} label={label} value={value} />
              ))}
            </div>
          </div>

          <aside className="relative hidden min-h-[620px] min-w-0 xl:block" data-reveal="right">
            <div className="absolute left-[8%] top-[8%] h-[78%] w-[72%] rotate-[-9deg] rounded-full border border-assert-300/24 bg-assert-500/8 blur-[1px]" />
            <div className="absolute left-[18%] top-[18%] h-[58%] w-[58%] rotate-[12deg] rounded-full border border-accent-300/24" />
            <div className="absolute left-[18%] top-[6%] h-[520px] w-28 rotate-[34deg] rounded-full bg-assert-400/24 blur-3xl animate-pulse-glow" />
            <div className="absolute right-[10%] top-[14%] h-[430px] w-24 rotate-[34deg] rounded-full bg-accent-400/22 blur-3xl animate-float-slow" />

            <div className="group absolute right-4 top-6 size-[320px] rounded-full border border-glass-stroke bg-carbon-950/24 shadow-panel-deep backdrop-blur-sm transition-transform duration-500 hover:-translate-y-2 hover:shadow-2xl cursor-pointer 2xl:right-8 2xl:size-[360px]">
              <div className="absolute inset-8 rounded-full border border-assert-300/28" />
              <div className="absolute inset-20 rounded-full border border-accent-300/24" />
              <div className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-carbon-950/72 shadow-panel backdrop-blur-xl" />
              <div className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-assert-500 text-carbon-50 shadow-cta">
                <RadioTower className="size-9" aria-hidden="true" />
              </div>
              <span className="absolute left-[18%] top-[35%] grid size-12 place-items-center rounded-card border border-assert-300/45 bg-carbon-950/74 text-assert-300 shadow-panel backdrop-blur-xl animate-beacon">
                <MailCheck className="size-6 transition-transform duration-500 group-hover:scale-110" aria-hidden="true" />
              </span>
              <span className="absolute right-[16%] top-[38%] grid size-12 place-items-center rounded-card border border-accent-300/45 bg-carbon-950/74 text-accent-300 shadow-panel backdrop-blur-xl animate-beacon">
                <LineChart className="size-6 transition-transform duration-500 group-hover:scale-110" aria-hidden="true" />
              </span>
              <span className="absolute left-1/2 top-[17%] grid size-12 -translate-x-1/2 place-items-center rounded-card border border-signal-300/40 bg-carbon-950/74 text-signal-300 shadow-panel backdrop-blur-xl animate-beacon">
                <TrendingUp className="size-6 transition-transform duration-500 group-hover:scale-110" aria-hidden="true" />
              </span>
              <div className="absolute bottom-6 left-8 right-8 rounded-card border border-glass-stroke bg-carbon-950/70 p-4 shadow-panel backdrop-blur-xl">
                <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-assert-300">
                  Radar de escala
                </p>
                <p className="mt-2 text-sm font-semibold leading-5 text-carbon-100">
                  Sinais de tráfego qualificado, eficiência de CAC e taxas de conversão integrados no seu funil.
                </p>
              </div>
            </div>

            <div className="absolute bottom-6 left-4 right-4 grid grid-cols-3 gap-4">
              {liveSignals.map(({ label, value, Icon }) => (
                <div
                  className="min-w-0 rounded-card border border-glass-stroke bg-carbon-950/50 p-4 shadow-panel backdrop-blur-xl transition-transform duration-500 hover:-translate-y-2 hover:shadow-2xl cursor-pointer"
                  key={label}
                >
                  <Icon className="size-7 shrink-0 text-assert-300" aria-hidden="true" />
                  <strong className="mt-4 block font-display text-3xl font-bold text-carbon-50">{value}</strong>
                  <span className="text-sm font-semibold text-carbon-200">{label}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
