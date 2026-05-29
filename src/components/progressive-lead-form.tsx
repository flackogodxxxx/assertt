import { CSSProperties, FormEvent, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, ClipboardCheck, WalletCards } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "../lib/cn";

type LeadData = {
  name: string;
  siteUrl: string;
  email: string;
  budget: string;
};

const initialLeadData: LeadData = {
  name: "",
  siteUrl: "",
  email: "",
  budget: ""
};

const budgetOptions = [
  "Até R$ 10 mil",
  "R$ 10 mil a R$ 30 mil",
  "R$ 30 mil a R$ 80 mil",
  "Acima de R$ 80 mil"
];

const revealDelay = (index: number) => ({ "--reveal-delay": `${index * 90}ms` }) as CSSProperties;

export function ProgressiveLeadForm() {
  const [step, setStep] = useState(1);
  const [leadData, setLeadData] = useState<LeadData>(initialLeadData);
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const completionLabel = useMemo(() => (step === 1 ? "50%" : "100%"), [step]);

  const updateField = (field: keyof LeadData, value: string) => {
    setLeadData((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const hasValidUrl = () => {
    const value = leadData.siteUrl.trim();
    const urlCandidate = value.startsWith("http") ? value : `https://${value}`;

    try {
      return Boolean(new URL(urlCandidate).hostname.includes("."));
    } catch {
      return false;
    }
  };

  const advanceStep = () => {
    if (!leadData.name.trim() || !hasValidUrl()) {
      setError("Informe seu nome e uma URL válida para continuar.");
      return;
    }

    setStep(2);
    setError("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!leadData.email.trim() || !leadData.budget) {
      setError("Informe o e-mail corporativo e a verba de marketing mensal.");
      return;
    }

    setIsSubmitted(true);
    setError("");
  };

  return (
    <section
      id="auditoria"
      aria-labelledby="auditoria-title"
      className="relative overflow-hidden bg-carbon-900 px-5 py-24 text-carbon-50 sm:px-8 lg:py-28"
    >
      <div className="absolute inset-0 bg-grid-soft opacity-30" aria-hidden="true" />
      <div className="absolute left-0 top-10 h-80 w-1/2 bg-accent-glow blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:gap-14">
        <div className="min-w-0" data-reveal="left">
          <p className="font-display text-sm font-bold uppercase tracking-[0.24em] text-assert-300">
            Console de diagnóstico
          </p>
          <h2 id="auditoria-title" className="mt-5 font-display text-[clamp(2.35rem,4vw,3.75rem)] font-bold leading-tight tracking-tight">
            Uma entrada curta para mapear seu motor de aquisição.
          </h2>
          <p className="mt-5 text-lg leading-8 text-carbon-250">
            O diagnóstico cruza mídia, busca orgânica e conversão para apontar onde a receita está escapando.
          </p>
          <div className="mt-8 grid gap-4">
            {["Mapa de desperdício de verba", "Gargalos de conversão", "Próximas alavancas de escala"].map(
              (item, index) => (
                <div
                  data-reveal="card"
                  className="flex min-w-0 items-center gap-3 rounded-card border border-glass-stroke bg-carbon-950/60 p-4 shadow-panel backdrop-blur-xl transition-transform duration-500 hover:-translate-y-2 hover:border-assert-300/70 hover:shadow-2xl cursor-pointer"
                  key={item}
                  style={revealDelay(index)}
                >
                  <CheckCircle2 className="size-5 shrink-0 text-signal-300 sm:size-6" aria-hidden="true" />
                  <span className="min-w-0 font-semibold text-carbon-100">{item}</span>
                  <ChevronRight className="ml-auto size-5 shrink-0 text-carbon-400" aria-hidden="true" />
                </div>
              )
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-card border border-glass-stroke bg-carbon-950/82 p-6 shadow-panel-deep backdrop-blur-2xl sm:p-10" data-reveal="right">
          {isSubmitted ? (
            <div className="grid min-h-80 place-items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out" role="status">
              <div>
                <CheckCircle2 className="mx-auto size-14 text-signal-300" aria-hidden="true" />
                <h3 className="mt-5 font-display text-2xl font-bold">Solicitação recebida.</h3>
                <p className="mt-3 max-w-md text-carbon-250">
                  A Assert Tech já tem os dados iniciais para avaliar oportunidades de ROI, CAC e
                  conversão.
                </p>
              </div>
            </div>
          ) : (
            <form className="grid min-w-0 gap-7" onSubmit={handleSubmit}>
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-4" aria-live="polite">
                <span className="font-display text-sm font-bold uppercase tracking-[0.18em] text-carbon-300">
                  Etapa {step} de 2
                </span>
                <span className="inline-flex items-center gap-2 rounded-card bg-carbon-800 px-3 py-1 text-sm font-semibold text-accent-200">
                  <ClipboardCheck className="size-4" aria-hidden="true" />
                  {completionLabel}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-card bg-carbon-800" aria-hidden="true">
                <div
                  className={cn(
                    "h-full rounded-card bg-assert-400 shadow-lg shadow-primary/20 transition-[width] duration-300",
                    step === 1 ? "w-1/2" : "w-full"
                  )}
                />
              </div>

              {step === 1 ? (
                <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
                  <Input
                    id="lead-name"
                    label="Nome"
                    name="name"
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Seu nome"
                    required
                    value={leadData.name}
                  />
                  <Input
                    id="lead-site"
                    label="URL do Site"
                    name="siteUrl"
                    onChange={(event) => updateField("siteUrl", event.target.value)}
                    placeholder="https://empresa.com"
                    required
                    type="url"
                    value={leadData.siteUrl}
                  />
                </div>
              ) : (
                <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
                  <Input
                    id="lead-email"
                    label="E-mail Corporativo"
                    name="email"
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="voce@empresa.com"
                    required
                    type="email"
                    value={leadData.email}
                  />
                  <div className="grid min-w-0 gap-2">
                    <label className="text-sm font-semibold text-carbon-150" htmlFor="lead-budget">
                      Verba de Marketing Mensal
                    </label>
                    <select
                      className="min-h-12 w-full min-w-0 rounded-card border border-glass-stroke bg-carbon-900/80 px-4 text-base text-carbon-50 shadow-inner outline-none transition-all duration-300 hover:border-carbon-500 focus:border-accent-300 focus:ring-2 focus:ring-accent-300 focus:ring-offset-2 focus:ring-offset-carbon-950"
                      id="lead-budget"
                      name="budget"
                      onChange={(event) => updateField("budget", event.target.value)}
                      required
                      value={leadData.budget}
                    >
                      <option value="">Selecione a faixa</option>
                      {budgetOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {error ? (
                <p className="rounded-card border border-assert-400/40 bg-assert-950/40 p-4 text-sm font-medium text-assert-100" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-4">
                {step === 2 ? (
                  <Button className="w-full sm:w-auto" variant="outline" onClick={() => setStep(1)} type="button">
                    <ArrowLeft className="size-5" aria-hidden="true" />
                    Voltar
                  </Button>
                ) : (
                  <span />
                )}

                {step === 1 ? (
                  <Button className="w-full sm:w-auto" onClick={advanceStep} type="button">
                    Continuar
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button className="w-full sm:w-auto" type="submit">
                    <WalletCards className="size-5" aria-hidden="true" />
                    Solicitar Auditoria Gratuita
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
