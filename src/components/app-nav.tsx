"use client";

import { motion } from "framer-motion";
import { ChartSpline, Dumbbell, House, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { T } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const navTabs = [
  { href: "/", label: "Home", icon: House },
  { href: "/workout", label: "Train", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", icon: Sparkles },
  { href: "/progress", label: "Progress", icon: ChartSpline },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Floating dock, present at every breakpoint. Centred in the content column. */
export function AppNav() {
  const pathname = usePathname();
  return (
    <motion.nav
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={T.base}
      aria-label="Main navigation"
      className="overlay-frame tab-bar bottom-[max(12px,var(--safe-bottom))] z-50"
    >
      {navTabs.map((tab) => {
        const active = isActivePath(pathname, tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn("tab-item relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 text-xs font-medium", active && "tab-active")}
          >
            {active && <motion.span layoutId="dock-active" className="dock-active-surface absolute inset-0" transition={T.layout} />}
            {active && <motion.span layoutId="dock-limelight" className="dock-limelight absolute left-1/2 top-0 w-6 -translate-x-1/2" transition={T.layout} />}
            <Icon className="relative z-10 size-[18px]" strokeWidth={active ? 2.2 : 1.8} />
            <span className="relative z-10 hidden sm:block">{tab.label}</span>
          </Link>
        );
      })}
    </motion.nav>
  );
}
