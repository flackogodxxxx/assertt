import * as Dialog from "@radix-ui/react-dialog";
import { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";

type DialogContentProps = ComponentProps<typeof Dialog.Content> & {
  children: ReactNode;
};

type DialogOverlayProps = ComponentProps<typeof Dialog.Overlay>;

export const DialogRoot = Dialog.Root;
export const DialogPortal = Dialog.Portal;
export const DialogClose = Dialog.Close;
export const DialogTitle = Dialog.Title;
export const DialogDescription = Dialog.Description;

export function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  return (
    <Dialog.Overlay
      className={cn("fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-in fade-in duration-700", className)}
      {...props}
    />
  );
}

export function DialogContent({ children, className, ...props }: DialogContentProps) {
  return (
    <Dialog.Content
      className={cn(
        "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(680px,calc(100vw-2rem))] min-w-0 -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card border border-glass-stroke bg-carbon-950/92 p-6 text-carbon-50 shadow-modal backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-950 sm:p-10",
        className
      )}
      {...props}
    >
      {children}
    </Dialog.Content>
  );
}
