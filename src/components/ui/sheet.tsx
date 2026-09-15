"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { Drawer } from "vaul";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * Responsive sheet: a bottom drawer (vaul) below `md`, a centred dialog (Radix) above.
 * Both wrap Radix Dialog underneath, so focus trapping, Escape and overlay-dismiss
 * behave identically. The API deliberately mirrors vaul's compound shape.
 *
 * Crossing the breakpoint while open remounts the content; local draft state resets.
 */

const SheetContext = React.createContext<{ desktop: boolean }>({ desktop: false });

/** vaul's exit transition length. */
const EXIT_MS = 550;

/**
 * Owns mount/unmount instead of relying on the drawer's animation-end tracking, which
 * can miss a programmatic close and leave a finished, invisible drawer in the DOM.
 * The drawer stays mounted for one exit transition after `open` flips to false.
 */
function useDelayedUnmount(open: boolean | undefined) {
  const [mounted, setMounted] = React.useState(Boolean(open));
  // Derive "mounted" from "open" during render so reopening never waits on an effect.
  if (open && !mounted) setMounted(true);
  React.useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open]);
  return Boolean(open) || mounted;
}

export function SheetRoot({ children, ...props }: React.ComponentProps<typeof Drawer.Root>) {
  const desktop = useIsDesktop();
  const value = React.useMemo(() => ({ desktop }), [desktop]);
  const mounted = useDelayedUnmount(props.open);
  if (!mounted) return null;
  if (desktop) {
    return (
      <SheetContext.Provider value={value}>
        <Dialog.Root open={props.open} onOpenChange={props.onOpenChange} modal>
          {children}
        </Dialog.Root>
      </SheetContext.Provider>
    );
  }
  return (
    <SheetContext.Provider value={value}>
      <Drawer.Root {...props}>{children}</Drawer.Root>
    </SheetContext.Provider>
  );
}

export function SheetContent({
  children,
  className,
  size = "md",
  showClose = true,
}: {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  showClose?: boolean;
}) {
  const { desktop } = React.useContext(SheetContext);
  const width = size === "sm" ? "sm:max-w-md" : size === "lg" ? "sm:max-w-3xl" : "sm:max-w-xl";
  if (desktop) {
    return (
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-[90] data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-[91] flex max-h-[min(88dvh,900px)] w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-[var(--shadow-sheet)] outline-none",
            width,
            className,
          )}
        >
          {showClose ? (
            <Dialog.Close className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">
              <X size={16} />
            </Dialog.Close>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5 sm:px-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    );
  }
  return (
    <Drawer.Portal>
      <Drawer.Overlay className="sheet-overlay fixed inset-0 z-[90]" />
      <Drawer.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-[91] flex max-h-[92dvh] flex-col rounded-t-2xl border border-b-0 border-border bg-card text-card-foreground shadow-[var(--shadow-sheet)] outline-none",
          className,
        )}
      >
        <div className="pb-2 pt-3"><div className="sheet-handle" /></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(20px+var(--safe-bottom))]">{children}</div>
      </Drawer.Content>
    </Drawer.Portal>
  );
}

export function SheetTitle({ className, asChild, ...props }: React.ComponentProps<typeof Dialog.Title>) {
  const { desktop } = React.useContext(SheetContext);
  const Comp = desktop ? Dialog.Title : Drawer.Title;
  return <Comp asChild={asChild} className={cn(!asChild && "text-xl font-semibold tracking-tight", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: React.ComponentProps<typeof Dialog.Description>) {
  const { desktop } = React.useContext(SheetContext);
  const Comp = desktop ? Dialog.Description : Drawer.Description;
  return <Comp className={cn("mt-1 text-sm text-muted-foreground", className)} {...props} />;
}

export function SheetHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-5 pr-8", className)}>{children}</div>;
}

export function SheetFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}>{children}</div>;
}

export const Sheet = {
  Root: SheetRoot,
  Content: SheetContent,
  Title: SheetTitle,
  Description: SheetDescription,
  Header: SheetHeader,
  Footer: SheetFooter,
};
