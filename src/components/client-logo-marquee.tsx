import { CSSProperties } from "react";
import { tv, type VariantProps } from "tailwind-variants";

type ClientLogo = {
  src: string;
  alt: string;
};

const clientLogos: ClientLogo[] = [
  "image_2.png",
  "image_3.png",
  "image_4.png",
  "image_5.png",
  "image_7.png",
  "image_8.png",
  "image_9.png",
  "image_10.png",
  "image_11.png",
  "image_12.png",
  "image_13.png",
  "image_14.png",
  "image_19.png",
  "image_21.png",
  "image_23.png",
  "image_25.png",
  "image_26.png",
  "image_27.png",
  "image_28.png",
  "image_29.png",
  "image_30.png",
  "image_32.png",
  "image_33.png"
].map((fileName) => ({
  src: `./assets/${fileName}`,
  alt: "Logo de cliente da Assert Tech"
}));

const revealDelay = (index: number) => ({ "--reveal-delay": `${index * 90}ms` }) as CSSProperties;

const marqueeTrackStyles = tv({
  base: "logo-marquee-track flex w-max min-w-full shrink-0 items-center gap-4 will-change-transform sm:gap-5 lg:gap-6",
  variants: {
    direction: {
      left: "animate-logo-marquee"
    }
  },
  defaultVariants: {
    direction: "left"
  }
});

const logoTileStyles = tv({
  base: "client-logo-tile group/logo relative grid h-24 w-[178px] shrink-0 place-items-center overflow-hidden rounded-card border border-glass-stroke bg-carbon-950/54 px-5 shadow-panel backdrop-blur-xl transition-transform duration-500 hover:-translate-y-2 hover:border-assert-300/64 hover:shadow-2xl cursor-pointer sm:h-28 sm:w-[224px] sm:px-7 lg:h-[7.5rem] lg:w-[248px]"
});

type LogoTileProps = VariantProps<typeof logoTileStyles> & {
  duplicate: boolean;
  logo: ClientLogo;
};

function SignalBadgeGlyph() {
  return (
    <span className="relative grid size-9 shrink-0 place-items-center rounded-card border border-assert-300/38 bg-carbon-950/72 shadow-cta" aria-hidden="true">
      <span className="absolute left-2 top-2 size-1.5 rounded-full bg-assert-300" />
      <span className="absolute right-2 top-3 size-2 rounded-full bg-accent-300" />
      <span className="absolute bottom-2 left-3 size-1.5 rounded-full bg-carbon-50/80" />
      <span className="absolute h-px w-5 -rotate-12 rounded-full bg-[linear-gradient(90deg,var(--color-assert-300),var(--color-accent-300))]" />
    </span>
  );
}

function OrbitCtaGlyph() {
  return (
    <span className="relative grid size-7 shrink-0 place-items-center rounded-full bg-assert-500/18" aria-hidden="true">
      <span className="absolute size-5 rounded-full border border-assert-300/62" />
      <span className="absolute right-1 top-1 size-1.5 rounded-full bg-carbon-50 shadow-lg shadow-primary/30" />
      <span className="absolute h-px w-4 rotate-[-24deg] rounded-full bg-carbon-50/90" />
    </span>
  );
}

function LogoTile({ duplicate, logo }: LogoTileProps) {
  return (
    <div
      aria-hidden={duplicate ? "true" : undefined}
      className={logoTileStyles()}
      role={duplicate ? undefined : "listitem"}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_24%_16%,color-mix(in_oklch,var(--color-assert-400),transparent_80%),transparent_34%),linear-gradient(135deg,color-mix(in_oklch,var(--color-carbon-50),transparent_96%),transparent_42%,color-mix(in_oklch,var(--color-accent-400),transparent_92%))] opacity-72 transition-opacity duration-500 group-hover/logo:opacity-100"
        aria-hidden="true"
      />
      <span
        className="absolute left-4 top-4 size-2 rounded-full bg-assert-300/78 shadow-lg shadow-primary/30 transition-transform duration-500 group-hover/logo:scale-150"
        aria-hidden="true"
      />
      <span
        className="absolute bottom-4 right-4 h-px w-10 rounded-full bg-[linear-gradient(90deg,transparent,var(--color-accent-300))] opacity-70 transition-all duration-500 group-hover/logo:w-16 group-hover/logo:opacity-100"
        aria-hidden="true"
      />
      <img
        alt={duplicate ? "" : logo.alt}
        className="relative max-h-12 w-auto max-w-[132px] object-contain opacity-84 saturate-0 contrast-125 transition-all duration-500 group-hover/logo:scale-105 group-hover/logo:opacity-100 group-hover/logo:saturate-100 sm:max-h-14 sm:max-w-[168px]"
        decoding="async"
        loading="lazy"
        src={logo.src}
      />
    </div>
  );
}

function MarqueeRow({ duration, logos }: { duration: string; logos: ClientLogo[] }) {
  const repeatedLogos = [...logos, ...logos];
  const style = { "--marquee-duration": duration } as CSSProperties;

  return (
    <div className="logo-marquee relative overflow-hidden py-3" role="list">
      <div className={marqueeTrackStyles()} style={style}>
        {repeatedLogos.map((logo, index) => (
          <LogoTile
            duplicate={index >= logos.length}
            key={`${logo.src}-${index}`}
            logo={logo}
          />
        ))}
      </div>
    </div>
  );
}

export function ClientLogoMarquee() {
  const proofSignals = [
    "23 marcas em movimento",
    "Uma vitrine contínua",
    "Confiança visível sem ruído"
  ];

  return (
    <section
      id="clientes"
      aria-labelledby="clientes-title"
      className="relative overflow-hidden border-y border-glass-stroke bg-carbon-950 px-5 py-20 sm:px-8 lg:py-24"
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,color-mix(in_oklch,var(--color-assert-400),transparent_88%),transparent_34%,color-mix(in_oklch,var(--color-accent-400),transparent_90%)_72%,transparent),linear-gradient(180deg,var(--color-carbon-950),color-mix(in_oklch,var(--color-carbon-900),var(--color-carbon-950)_74%))]" aria-hidden="true" />
      <div className="client-showcase-field absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-px neon-divider" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-px neon-divider" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl min-w-0">
        <div className="grid min-w-0 items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 max-w-3xl" data-reveal="left">
            <div className="inline-flex max-w-full items-center gap-3 rounded-card border border-assert-300/32 bg-carbon-900/58 px-3 py-2 shadow-panel backdrop-blur-xl">
              <SignalBadgeGlyph />
              <span className="font-display text-xs font-bold uppercase tracking-[0.24em] text-assert-300">
                Principais clientes
              </span>
            </div>
            <h2
              id="clientes-title"
              className="mt-5 max-w-4xl font-display text-[clamp(2.15rem,4vw,3.65rem)] font-bold leading-tight tracking-tight text-carbon-50"
            >
              Uma linha viva de marcas que orbitam crescimento real.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-carbon-200">
              Um carrossel contínuo com logos de clientes que confiam na Assert Tech para conectar mídia,
              busca e conversão com direção comercial.
            </p>
          </div>

          <button
            data-reveal="right"
            className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-3 rounded-card border border-glass-stroke bg-carbon-900/72 px-5 text-center text-sm font-semibold text-carbon-100 shadow-panel backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-assert-300 hover:shadow-lg hover:shadow-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-950 sm:w-auto"
            onClick={() => document.getElementById("auditoria")?.scrollIntoView({ behavior: "smooth" })}
          >
            <OrbitCtaGlyph />
            Entrar nessa órbita
            <span className="h-px w-5 rounded-full bg-carbon-50/80" aria-hidden="true" />
          </button>
        </div>

        <div className="client-marquee-stage relative mt-12 overflow-hidden rounded-[1.25rem] border border-glass-stroke bg-carbon-950/38 p-3 shadow-panel-deep backdrop-blur-xl sm:p-4" data-reveal="scale">
          <div className="absolute inset-x-8 top-1/2 h-px neon-divider opacity-70" aria-hidden="true" />
          <MarqueeRow duration="58s" logos={clientLogos} />
        </div>

        <div className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
          {proofSignals.map((label, index) => (
            <div
              data-reveal="card"
              className="group/proof flex min-h-16 min-w-0 items-center gap-3 rounded-card border border-glass-stroke bg-carbon-900/46 px-4 text-sm font-semibold text-carbon-150 shadow-panel backdrop-blur-xl transition-transform duration-500 hover:-translate-y-2 hover:border-assert-300/58 hover:shadow-2xl cursor-pointer"
              key={label}
              style={revealDelay(index)}
            >
              <span className="relative grid size-8 shrink-0 place-items-center rounded-full border border-assert-300/30 bg-assert-500/10" aria-hidden="true">
                <span className="size-2 rounded-full bg-assert-300 shadow-lg shadow-primary/30 transition-transform duration-500 group-hover/proof:scale-150" />
              </span>
              <span className="min-w-0">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
