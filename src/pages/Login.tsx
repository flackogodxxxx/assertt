import { type FormEvent, useMemo, useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { USERS_DB, useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { useDemands } from "../contexts/DemandContext";
import { User as UserIcon } from "lucide-react";
import { cn } from "../lib/cn";

const heroVideoSrc = "/assets/Abstract_purple_pink_waves_anima%E2%80%A6_202605291239.mp4";
const posterSrc = "/assets/assert-tech-poster.svg";

export function Login() {
  const { login, user: authUser } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const { demands } = useDemands();

  const selectedUser = useMemo(
    () => USERS_DB.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase()),
    [email]
  );

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    window.setTimeout(() => {
      if (password !== "123456") {
        showNotification("Autenticação não concluída", "A senha informada não corresponde ao acesso interno.", "warning");
        setIsLoading(false);
        return;
      }

      const success = login(email);

      if (!success) {
        showNotification("Usuário não localizado", "Este e-mail não consta na operação Assert.", "warning");
        setIsLoading(false);
        return;
      }

      showNotification("Acesso liberado", "Sua central operacional está pronta.", "success");
      setShowWelcome(true);
    }, 620);
  };

  const handleEnterCrm = () => {
    setIsExiting(true);
    setTimeout(() => {
      navigate("/crm");
    }, 600);
  };

  const activeUser = showWelcome ? authUser || selectedUser : selectedUser;

  const pendingDemandsCount = demands.filter(d => 
    d.status !== "Concluído" && 
    (activeUser?.role === "Admin" || activeUser?.role === "Organizador" || d.assigneeIds.includes(activeUser?.id || ""))
  ).length;

  if (showWelcome && activeUser) {
    let welcomeMessage = (
      <p className="text-xl font-medium text-carbon-200">
        Hoje você tem <strong className="text-3xl font-black text-carbon-50 mx-2">{pendingDemandsCount}</strong> demandas aguardando sua ação.
      </p>
    );

    if (activeUser.role === "Admin") {
      welcomeMessage = (
        <p className="text-xl font-medium text-carbon-200">
          Controle central. Acompanhe as <strong className="text-3xl font-black text-carbon-50 mx-2">{pendingDemandsCount}</strong> demandas em produção hoje.
        </p>
      );
    } else if (activeUser.role === "Organizador") {
      welcomeMessage = (
        <p className="text-xl font-medium text-carbon-200">
          Existem <strong className="text-3xl font-black text-carbon-50 mx-2">{pendingDemandsCount}</strong> demandas operacionais para organizar e distribuir.
        </p>
      );
    }

    return (
      <div className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-carbon-950 p-6 text-center",
        isExiting ? "animate-out fade-out zoom-out-95 duration-500 fill-mode-both" : "animate-in fade-in duration-700"
      )}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_oklch,var(--color-assert-500),transparent_80%),transparent_60%)] opacity-30" />
        <div className="absolute inset-0 bg-grid-soft opacity-20" />
        
        <div className="relative z-10 max-w-3xl animate-in slide-in-from-bottom-8 duration-1000 ease-out fill-mode-both" style={{ animationDelay: '200ms' }}>
          <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-assert-300 mb-6">
            Acesso Confirmado
          </p>

          <div className="mx-auto mb-6 grid size-32 place-items-center overflow-hidden rounded-full border-2 border-assert-300/40 bg-carbon-900 shadow-[0_0_60px_rgba(216,36,255,0.4)] animate-in zoom-in-50 duration-700 fill-mode-both" style={{ animationDelay: '400ms' }}>
            {activeUser.avatar ? (
              <img src={activeUser.avatar} alt={activeUser.name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-5xl font-bold text-assert-300">{activeUser.name.charAt(0)}</span>
            )}
          </div>

          <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] font-bold tracking-tight text-carbon-50 leading-tight">
            Bem-vindo(a) de volta,<br />
            <span className="text-transparent bg-clip-text bg-[linear-gradient(110deg,var(--color-assert-300),var(--color-accent-300))] text-neon">
              {activeUser.name}
            </span>!
          </h1>
          
          <div className="mt-8 mb-12 inline-block rounded-full border border-glass-stroke bg-carbon-900/50 px-8 py-4 shadow-panel-deep backdrop-blur-xl animate-in zoom-in-95 duration-700 fill-mode-both" style={{ animationDelay: '800ms' }}>
            {welcomeMessage}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both" style={{ animationDelay: '1200ms' }}>
            <Button size="lg" className="h-16 px-10 text-lg rounded-full shadow-[0_0_40px_var(--color-assert-400)] hover:scale-105 transition-all" onClick={handleEnterCrm}>
              Entrar no Work OS
              <ArrowRight className="size-6 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-carbon-950 px-4 py-6 text-carbon-50 sm:px-8 lg:px-10">
      <video
        autoPlay
        loop
        muted
        playsInline
        poster={posterSrc}
        className="absolute inset-0 h-full w-full scale-[1.16] object-cover opacity-100 video-vivid"
        aria-hidden="true"
      >
        <source src={heroVideoSrc} type="video/mp4" />
      </video>
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[42vh] w-[42vw] bg-[linear-gradient(135deg,transparent_0%,color-mix(in_oklch,var(--color-carbon-950),transparent_46%)_46%,color-mix(in_oklch,var(--color-carbon-950),transparent_12%)_100%)]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-carbon-950),transparent_8%)_0%,color-mix(in_oklch,var(--color-carbon-950),transparent_30%)_46%,color-mix(in_oklch,var(--color-carbon-950),transparent_58%)_100%)]" />
      <div className="absolute inset-0 login-motion-field" aria-hidden="true" />
      <div className="absolute inset-0 bg-grid-soft opacity-10" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-3rem)] max-w-7xl grid-cols-1 items-center gap-9 lg:grid-cols-[minmax(0,0.95fr)_minmax(410px,0.62fr)] lg:gap-12">
        <section className="min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          <div className="inline-flex items-center gap-3 rounded-full border border-assert-300/24 bg-carbon-950/34 px-4 py-2 shadow-panel backdrop-blur-xl">
            <span className="size-2 rounded-full bg-signal-300 shadow-[0_0_14px_var(--color-signal-300)]" />
            <span className="font-display text-xs font-bold uppercase tracking-[0.24em] text-carbon-150">
              Assert Tech CRM
            </span>
          </div>

          <h1 className="mt-7 max-w-4xl text-balance font-display text-[clamp(3.15rem,7vw,6.6rem)] font-bold leading-[0.9] tracking-tight text-carbon-50">
            A operação entra em <span className="text-transparent bg-clip-text bg-[linear-gradient(110deg,var(--color-carbon-50),var(--color-assert-300)_44%,var(--color-accent-300))] text-neon">sincronia.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[clamp(1.05rem,1.5vw,1.25rem)] font-medium leading-8 text-carbon-150">
            Portal oficial da Assert para organizar demandas, distribuir responsáveis, reunir arquivos de produção e manter aprovações no fluxo certo.
          </p>
        </section>

        <section className="relative rounded-[1.35rem] border border-glass-stroke bg-carbon-950/66 p-4 shadow-panel-deep backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out sm:p-5">
          <div className="absolute inset-x-8 top-0 h-px neon-divider" aria-hidden="true" />
          <div className="grid gap-6 rounded-card border border-glass-stroke bg-carbon-900/68 p-6 sm:p-7">
            <div className="flex items-start justify-between gap-5 border-b border-glass-stroke/70 pb-6">
              <div className="min-w-0">
                <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-assert-300">
                  Acesso operacional
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-carbon-50">
                  Entrar no ambiente
                </h2>
                <p className="mt-3 text-sm leading-6 text-carbon-300">
                  A autenticação libera sua visão de trabalho conforme função, permissões e demandas atribuídas.
                </p>
              </div>
              <div className="grid size-12 shrink-0 place-items-center rounded-card border border-assert-300/34 bg-assert-500/10 text-assert-300 shadow-panel">
                <ShieldCheck className="size-6" aria-hidden="true" />
              </div>
            </div>

            <form className="grid gap-5" onSubmit={handleLogin}>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-carbon-200">E-mail corporativo</span>
                <span className="relative">
                  <Mail className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-carbon-400" aria-hidden="true" />
                  <input
                    className="h-12 w-full rounded-card border border-glass-stroke bg-carbon-950/66 pl-10 pr-4 text-carbon-50 shadow-inner outline-none transition-all duration-300 placeholder:text-carbon-500 focus:border-accent-300 focus:ring-2 focus:ring-accent-300/42"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nome@asserttech.com.br"
                    required
                    type="email"
                    value={email}
                  />
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-carbon-200">Senha</span>
                <span className="relative">
                  <Lock className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-carbon-400" aria-hidden="true" />
                  <input
                    className="h-12 w-full rounded-card border border-glass-stroke bg-carbon-950/66 pl-10 pr-12 text-carbon-50 shadow-inner outline-none transition-all duration-300 placeholder:text-carbon-500 focus:border-accent-300 focus:ring-2 focus:ring-accent-300/42"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Senha interna"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-card text-carbon-400 transition-all duration-300 hover:bg-carbon-800 hover:text-carbon-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </span>
              </label>

              <div className="min-h-14 rounded-card border border-glass-stroke bg-carbon-950/40 px-4 py-3 text-sm text-carbon-300">
                {selectedUser ? (
                  <span>
                    Perfil: <strong className="text-carbon-100">{selectedUser.name}</strong> ·{" "}
                    <span className="text-accent-300">{selectedUser.role}</span>
                  </span>
                ) : (
                  <span>Use seu acesso interno para abrir a operação correspondente ao seu perfil.</span>
                )}
              </div>

              <Button className="mt-1 w-full" disabled={isLoading} size="lg" type="submit">
                {isLoading ? (
                  <>
                    <span className="size-2 rounded-full bg-carbon-50 animate-pulse-glow" aria-hidden="true" />
                    Validando acesso
                  </>
                ) : (
                  <>
                    Acessar operação
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-semibold text-carbon-300">
            <span className="rounded-card border border-glass-stroke bg-carbon-900/42 px-3 py-2">
              Acesso por função
            </span>
            <span className="rounded-card border border-glass-stroke bg-carbon-900/42 px-3 py-2">
              Notificações persistentes
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
