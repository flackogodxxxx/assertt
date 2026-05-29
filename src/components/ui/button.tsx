import { ButtonHTMLAttributes, ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "../../lib/cn";

const buttonStyles = tv({
  base: "inline-flex min-h-12 min-w-0 items-center justify-center gap-3 rounded-card text-center font-semibold leading-tight transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-950 disabled:pointer-events-none disabled:opacity-60 disabled:hover:scale-100 [&_svg]:size-5 [&_svg]:shrink-0",
  variants: {
    variant: {
      solid:
        "bg-assert-500 px-6 text-carbon-50 shadow-cta hover:bg-assert-400 focus-visible:ring-assert-300",
      outline:
        "border border-glass-stroke bg-carbon-900/72 px-5 text-carbon-100 shadow-panel backdrop-blur-xl hover:border-accent-300/70 hover:bg-carbon-800 focus-visible:ring-accent-300",
      ghost:
        "bg-transparent px-4 text-carbon-150 hover:bg-carbon-800/70 hover:text-carbon-50 focus-visible:ring-accent-300"
    },
    intent: {
      primary: "",
      secondary: ""
    },
    size: {
      sm: "min-h-10 px-4 text-sm",
      md: "text-base",
      lg: "min-h-14 px-7 text-lg",
      xl: "min-h-16 px-8 text-lg"
    }
  },
  compoundVariants: [
    {
      intent: "secondary",
      variant: "solid",
      className: "bg-carbon-50 text-carbon-950 hover:bg-carbon-150 focus-visible:ring-carbon-50"
    }
  ],
  defaultVariants: {
    variant: "solid",
    intent: "primary",
    size: "md"
  }
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & {
    children: ReactNode;
  };

export function Button({
  children,
  className,
  intent,
  size,
  type = "button",
  variant,
  ...props
}: ButtonProps) {
  return (
    <button className={cn(buttonStyles({ intent, size, variant }), className)} type={type} {...props}>
      {children}
    </button>
  );
}
