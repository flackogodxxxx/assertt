import { InputHTMLAttributes } from "react";
import { tv } from "tailwind-variants";
import { cn } from "../../lib/cn";

const inputStyles = tv({
  base: "min-h-12 w-full min-w-0 rounded-card border border-glass-stroke bg-carbon-900/80 px-4 text-base text-carbon-50 shadow-inner outline-none transition-all duration-300 placeholder:text-carbon-500 hover:border-carbon-500 focus:border-accent-300 focus:ring-2 focus:ring-accent-300 focus:ring-offset-2 focus:ring-offset-carbon-950"
});

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ className, id, label, ...props }: InputProps) {
  return (
    <div className="grid min-w-0 gap-2">
      <label className="text-sm font-semibold text-carbon-150" htmlFor={id}>
        {label}
      </label>
      <input className={cn(inputStyles(), className)} id={id} {...props} />
    </div>
  );
}
