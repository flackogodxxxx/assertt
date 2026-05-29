import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Gauge,
  LineChart,
  Radar,
  Rocket,
  Search,
  Target,
  TrendingUp,
  Workflow,
  Zap
} from "lucide-react";
import { CSSProperties, useEffect } from "react";
import { ExitIntentModal } from "./components/exit-intent-modal";
import { ClientLogoMarquee } from "./components/client-logo-marquee";
import { HeroVideo } from "./components/hero-video";
import { PageIntro } from "./components/page-intro";
import { ProgressiveLeadForm } from "./components/progressive-lead-form";
import { MarketingCard } from "./components/ui/marketing-card";
import { usePageMotion } from "./hooks/use-page-motion";

const method = [
  {
    title: "Diagnosticar",
    description: "Mapeamos desperdício de mídia, intenção de busca e atritos na jornada.",
    Icon: Radar
  },
  {
    title: "Projetar",
    description: "Transformamos dados em hipóteses, páginas, campanhas e mensuração limpa.",
    Icon: Workflow
  },
  {
    title: "Escalar",
    description: "Aumentamos investimento apenas onde CAC, conversão e qualidade sustentam ROI.",
    Icon: Rocket
  }
];

const services = [
  {
    title: "Tráfego Pago",
    description:
      "Campanhas orientadas a pipeline, com leitura diária de verba, CAC e qualidade dos leads.",
    Icon: Target,
    checks: ["Budget por margem", "Criativos por intenção", "Rotina de otimização"]
  },
  {
    title: "SEO e AEO",
    description:
      "Arquitetura técnica e conteúdo para aparecer em buscas tradicionais e respostas de IA.",
    Icon: Search,
    checks: ["Clusters por receita", "Base técnica auditável", "Conteúdo citável"]
  },
  {
    title: "CRO",
    description:
      "Testes e ajustes de jornada para transformar mais visitas em oportunidades comerciais reais.",
    Icon: LineChart,
    checks: ["Hipóteses priorizadas", "Mensuração limpa", "Funil sem atrito"]
  }
];

const proof = [
  { value: "200%", label: "aumento em leads qualificados", Icon: TrendingUp },
  { value: "40%", label: "redução no Custo de Aquisição", Icon: Gauge },
  { value: "ROI", label: "eixo de decisão, não vaidade", Icon: BarChart3 }
];

const operatingPrinciples = [
  "A verba só sobe quando o sinal econômico aparece.",
  "Landing pages, anúncios e CRM são tratados como um sistema único.",
  "Relatórios mostram decisões, não um amontoado de gráficos."
];

const revealDelay = (index: number) => ({ "--reveal-delay": `${index * 90}ms` }) as CSSProperties;

export function App() {
  usePageMotion();

  const handleAuditClick = () => {
    document.getElementById("auditoria")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-carbon-950 text-carbon-50">
      <PageIntro />
      <div className="scroll-progress" aria-hidden="true" />
      <HeroVideo onAuditClick={handleAuditClick} />

      <main>
        <ClientLogoMarquee />

        <section
          aria-labelledby="metodo-title"
          className="relative overflow-hidden border-y border-glass-stroke bg-carbon-950 px-5 py-20 sm:px-8 lg:py-24"
        >
          <div className="absolute inset-0 bg-grid-soft opacity-20" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 h-px neon-divider" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl">
            <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-14">
              <div className="min-w-0" data-reveal="left">
                <p className="font-display text-sm font-bold uppercase tracking-[0.24em] text-assert-300">
                  Método de escala
                </p>
                <h2
                  id="metodo-title"
                  className="mt-5 max-w-xl font-display text-[clamp(2.35rem,4vw,3.8rem)] font-bold leading-tight tracking-tight text-carbon-50"
                >
                  Uma metodologia de escala previsível para operações que exigem eficiência.
                </h2>
              </div>
              <div className="grid min-w-0 gap-5 text-lg leading-8 text-carbon-200" data-reveal="right">
                <p>
                  Nossa metodologia foi desenhada para empresas que buscam superar o teto de crescimento tradicional.
                  Integramos diagnóstico analítico, experimentação ágil e execução de alta performance para acelerar o seu pipeline de receita de ponta a ponta.
                </p>
                <div className="grid gap-4">
                  {operatingPrinciples.map((item, index) => (
                    <div
                      data-reveal="card"
                      className="flex min-w-0 items-start gap-3 rounded-card border border-glass-stroke bg-carbon-900/58 p-4 shadow-panel transition-transform duration-500 hover:-translate-y-2 hover:shadow-2xl cursor-pointer"
                      key={item}
                      style={revealDelay(index)}
                    >
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-assert-300 sm:size-6" aria-hidden="true" />
                      <span className="font-semibold text-carbon-100">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative mt-14 grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-6 lg:gap-8">
              <div className="pointer-events-none absolute left-8 right-8 top-8 hidden h-px neon-divider lg:block" aria-hidden="true" />
              {method.map(({ title, description, Icon }, index) => (
                <MarketingCard.Root data-reveal="card" depth="deep" key={title} style={revealDelay(index)}>
                  <span className="pointer-events-none absolute right-5 top-5 font-display text-4xl font-bold text-assert-300/45 drop-shadow-[0_0_18px_color-mix(in_oklch,var(--color-assert-400),transparent_38%)] sm:right-6 sm:top-6 sm:text-5xl">
                    0{index + 1}
                  </span>
                  <MarketingCard.Icon Icon={Icon} />
                  <MarketingCard.Title className="font-display">{title}</MarketingCard.Title>
                  <MarketingCard.Description>{description}</MarketingCard.Description>
                </MarketingCard.Root>
              ))}
            </div>
          </div>
        </section>

        <section id="servicos" aria-labelledby="servicos-title" className="relative overflow-hidden bg-carbon-900 px-5 py-24 sm:px-8 lg:py-28">
          <div className="absolute right-0 top-16 size-[360px] translate-x-1/3 rounded-full bg-assert-500/16 blur-3xl sm:size-[460px]" aria-hidden="true" />
          <div className="absolute bottom-0 left-0 size-[380px] -translate-x-1/3 translate-y-1/3 rounded-full bg-accent-400/12 blur-3xl sm:size-[520px]" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl">
            <div className="flex min-w-0 flex-wrap items-end justify-between gap-8">
              <div className="min-w-0" data-reveal="left">
                <p className="font-display text-sm font-bold uppercase tracking-[0.24em] text-signal-300">
                  Motor de crescimento
                </p>
                <h2
                  id="servicos-title"
                  className="mt-5 max-w-3xl font-display text-[clamp(2.35rem,4vw,3.75rem)] font-bold leading-tight tracking-tight text-carbon-50"
                >
                  Três pilares de aquisição integrados para maximizar o seu retorno.
                </h2>
              </div>
              <button
                data-reveal="right"
                className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-3 rounded-card border border-glass-stroke bg-carbon-950/64 px-5 text-center text-sm font-semibold text-carbon-100 shadow-panel backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-assert-300 hover:shadow-lg hover:shadow-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-950 sm:w-auto [&_svg]:shrink-0"
                onClick={handleAuditClick}
              >
                <Zap className="size-5 text-assert-300" aria-hidden="true" />
                Quero encontrar gargalos
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-14 grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-6 lg:gap-8">
              {services.map(({ title, description, Icon, checks }, index) => (
                <MarketingCard.Root data-reveal="card" depth="deep" key={title} style={revealDelay(index)}>
                  <MarketingCard.Icon Icon={Icon} />
                  <MarketingCard.Title className="font-display">{title}</MarketingCard.Title>
                  <MarketingCard.Description>{description}</MarketingCard.Description>
                  <div className="mt-7 grid gap-3">
                    {checks.map((check) => (
                      <div className="flex min-w-0 items-center gap-3 text-sm font-semibold text-carbon-150" key={check}>
                        <CheckCircle2 className="size-5 shrink-0 text-assert-300" aria-hidden="true" />
                        <span className="min-w-0">{check}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent-300">
                    Explorar alavanca
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </div>
                </MarketingCard.Root>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="prova-title" className="relative overflow-hidden bg-carbon-950 px-5 py-24 sm:px-8 lg:py-28">
          <div className="absolute inset-0 bg-grid-soft opacity-20" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl min-w-0 grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div className="relative min-h-[360px] min-w-0 sm:min-h-[430px]" data-reveal="scale">
              <div className="absolute inset-0 rounded-[2rem] border border-glass-stroke bg-carbon-900/48 shadow-panel-deep backdrop-blur-xl" />
              <div className="absolute inset-4 overflow-hidden rounded-[1.5rem] border border-assert-300/25 bg-[radial-gradient(circle_at_30%_28%,color-mix(in_oklch,var(--color-assert-400),transparent_60%),transparent_34%),radial-gradient(circle_at_70%_72%,color-mix(in_oklch,var(--color-accent-400),transparent_68%),transparent_36%)] p-4 sm:inset-7 sm:p-6">
                <div className="absolute left-10 right-10 top-1/2 h-px neon-divider animate-flow" />
                <div className="absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-assert-300/18 animate-pulse-glow" />
                <div className="relative grid h-full min-w-0 grid-cols-2 grid-rows-2 gap-4 sm:gap-6">
                  {["Investir", "Medir", "Converter", "Escalar"].map((stage, index) => (
                    <div
                      className="group relative min-w-0 rounded-card border border-glass-stroke bg-carbon-950/54 p-3 shadow-panel backdrop-blur-xl transition-transform duration-500 hover:-translate-y-2 hover:shadow-2xl cursor-pointer sm:p-4"
                      key={stage}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="grid size-8 shrink-0 place-items-center rounded-card bg-assert-500 font-display text-xs font-bold text-carbon-50 shadow-cta sm:size-9">
                          {index + 1}
                        </span>
                        <span className="min-w-0 max-w-24 text-right font-display text-[0.68rem] font-bold uppercase tracking-[0.08em] text-carbon-150 sm:text-xs sm:tracking-[0.14em]">
                          {stage}
                        </span>
                      </div>
                      <div className="mt-5 h-1.5 overflow-hidden rounded-card bg-carbon-800">
                        <div
                          className="h-full rounded-card bg-assert-400 shadow-lg shadow-primary/20 animate-load-bar"
                          style={{ animationDelay: `${index * 0.35}s` }}
                        />
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-carbon-300">
                        <span className="size-2 rounded-full bg-signal-300 shadow-lg shadow-accent-400/30" />
                        {index === 0
                          ? "verba"
                          : index === 1
                            ? "dados"
                            : index === 2
                              ? "funil"
                              : "escala"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-w-0" data-reveal="right">
              <p className="font-display text-sm font-bold uppercase tracking-[0.24em] text-assert-300">
                Prova de performance
              </p>
              <h2
                id="prova-title"
                className="mt-5 font-display text-[clamp(2.35rem,4vw,3.75rem)] font-bold leading-tight tracking-tight text-carbon-50"
              >
                Crescimento sustentável baseado em dados reais, não em intuição.
              </h2>
              <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,10.5rem),1fr))] gap-5 lg:gap-6">
                {proof.map(({ value, label, Icon }, index) => (
                  <MarketingCard.Root className="p-7" data-reveal="card" key={value} style={revealDelay(index)}>
                    <MarketingCard.Icon Icon={Icon} />
                    <strong className="mt-7 block font-display text-[clamp(2.5rem,4vw,3.5rem)] font-bold tracking-tight text-assert-300">
                      {value}
                    </strong>
                    <span className="mt-4 block text-sm font-semibold leading-6 text-carbon-200">{label}</span>
                  </MarketingCard.Root>
                ))}
              </div>
              <div className="mt-8 inline-flex max-w-full items-center gap-3 rounded-card border border-glass-stroke bg-carbon-900/70 px-5 py-4 text-carbon-100 shadow-panel backdrop-blur-xl">
                <ClipboardCheck className="size-5 shrink-0 text-accent-300 sm:size-6" aria-hidden="true" />
                <span className="text-sm font-semibold">Playbook de escala validado por números.</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <ProgressiveLeadForm />
      <ExitIntentModal />

      <footer className="border-t border-carbon-800 bg-carbon-950 px-5 py-8 text-sm text-carbon-400 sm:px-8">
        <div className="mx-auto flex max-w-6xl min-w-0 flex-wrap items-center justify-between gap-6">
          <span className="font-display font-bold tracking-[0.22em] text-carbon-200">ASSERT TECH</span>
          <span>Performance, SEO e CRO com foco em receita.</span>
          <button
            className="inline-flex items-center gap-2 rounded-card px-3 py-2 text-carbon-200 transition-all duration-300 hover:scale-105 hover:bg-carbon-900 hover:text-carbon-50 hover:shadow-lg hover:shadow-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-950"
            onClick={handleAuditClick}
          >
            Solicitar diagnóstico <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  );
}
