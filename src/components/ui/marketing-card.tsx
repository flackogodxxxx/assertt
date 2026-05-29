import { ComponentProps, ElementType, ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "../../lib/cn";

const cardRootStyles = tv({
  base: "group relative flex h-full min-w-0 flex-col overflow-hidden rounded-card border p-6 shadow-panel transition-transform duration-500 hover:-translate-y-2 hover:shadow-2xl cursor-pointer sm:p-8",
  variants: {
    tone: {
      dark: "border-glass-stroke bg-glass-surface text-carbon-50 backdrop-blur-xl hover:border-accent-300/70",
      light: "border-carbon-150 bg-carbon-50 text-carbon-950 shadow-panel-light hover:border-assert-300"
    },
    depth: {
      normal: "",
      deep: "shadow-panel-deep"
    }
  },
  defaultVariants: {
    tone: "dark",
    depth: "normal"
  }
});

type CardRootProps = ComponentProps<"article"> & VariantProps<typeof cardRootStyles>;

type CardIconProps = {
  Icon: ElementType;
  className?: string;
};

type CardTitleProps = ComponentProps<"h3"> & {
  children: ReactNode;
};

type CardDescriptionProps = ComponentProps<"p"> & {
  children: ReactNode;
};

function CardRoot({ children, className, depth, tone, ...props }: CardRootProps) {
  return (
    <article className={cn(cardRootStyles({ depth, tone }), className)} {...props}>
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        aria-hidden="true"
      >
        <div className="absolute right-0 top-0 size-36 translate-x-1/4 -translate-y-1/4 rounded-full bg-accent-400/20 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-300/70 to-transparent" />
      </div>
      <div className="relative z-10">{children}</div>
    </article>
  );
}

function CardIcon({ Icon, className }: CardIconProps) {
  return (
      <div
        className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-card border border-accent-300/35 bg-accent-300/10 text-accent-300 shadow-lg shadow-accent-400/10 transition-all duration-500 group-hover:scale-105 group-hover:bg-accent-300/16 sm:size-16",
        className
      )}
    >
      <Icon className="size-8 shrink-0 sm:size-9" aria-hidden="true" />
    </div>
  );
}

function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <h3 className={cn("mt-7 text-2xl font-semibold tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
}

function CardDescription({ children, className, ...props }: CardDescriptionProps) {
  return (
    <p className={cn("mt-4 text-base leading-7 text-carbon-250", className)} {...props}>
      {children}
    </p>
  );
}

export const MarketingCard = {
  Root: CardRoot,
  Icon: CardIcon,
  Title: CardTitle,
  Description: CardDescription
};
