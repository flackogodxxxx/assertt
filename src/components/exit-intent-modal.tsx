import { FormEvent, useEffect, useId, useState } from "react";
import { ArrowRight, CheckCircle2, Gift, X } from "lucide-react";
import { Button } from "./ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle
} from "./ui/dialog";
import { Input } from "./ui/input";

type ExitIntentModalProps = {
  initialOpen?: boolean;
  disableExitIntent?: boolean;
};

export function ExitIntentModal({ initialOpen = false, disableExitIntent = false }: ExitIntentModalProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);
  const emailId = useId();
  const siteId = useId();

  useEffect(() => {
    if (disableExitIntent || hasDismissed || isSubmitted) {
      return undefined;
    }

    const handleMouseLeave = (event: MouseEvent) => {
      if (event.clientY <= 12) {
        setIsOpen(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [disableExitIntent, hasDismissed, isSubmitted]);

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);
    if (!nextOpen) {
      setHasDismissed(true);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogClose className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-card text-carbon-300 transition-all duration-300 hover:scale-105 hover:bg-carbon-800 hover:text-carbon-50 hover:shadow-lg hover:shadow-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-950">
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Fechar modal</span>
          </DialogClose>

          <div className="mb-6 grid size-14 place-items-center rounded-card border border-accent-300/35 bg-accent-300/10 text-accent-300 shadow-lg shadow-accent-400/10 sm:size-16">
            <Gift className="size-8 sm:size-9" aria-hidden="true" />
          </div>
          <DialogTitle className="pr-12 font-display text-[clamp(1.75rem,4vw,2.25rem)] font-bold leading-tight">
            Espere! Não saia sem sua Auditoria de Marketing Gratuita.
          </DialogTitle>
          <DialogDescription className="mt-4 text-lg leading-8 text-carbon-250">
            Descubra onde você está gastando dinheiro à toa e encontre oportunidades reais para vender mais.
          </DialogDescription>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {["Mídia", "SEO", "CRO"].map((item) => (
              <div
                className="flex min-w-0 items-center gap-2 rounded-card border border-glass-stroke bg-carbon-950/58 p-3 text-sm font-semibold text-carbon-150 transition-transform duration-500 hover:-translate-y-2 hover:shadow-2xl cursor-pointer"
                key={item}
              >
                <CheckCircle2 className="size-5 shrink-0 text-signal-300" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>

          {isSubmitted ? (
            <div
              className="mt-8 rounded-card border border-signal-400/40 bg-signal-900/30 p-5 text-signal-100 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out"
              role="status"
            >
              Auditoria reservada. A equipe da Assert Tech pode priorizar seu diagnóstico.
            </div>
          ) : (
            <form className="mt-8 grid min-w-0 gap-5" onSubmit={handleSubmit}>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id={emailId}
                  label="E-mail corporativo"
                  name="exit-email"
                  placeholder="voce@empresa.com"
                  required
                  type="email"
                />
                <Input
                  id={siteId}
                  label="URL do site"
                  name="exit-site"
                  placeholder="https://empresa.com"
                  required
                  type="url"
                />
              </div>
              <Button className="justify-center" type="submit">
                <Gift className="size-5" aria-hidden="true" />
                Quero minha auditoria
                <ArrowRight className="size-5" aria-hidden="true" />
              </Button>
            </form>
          )}
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}
