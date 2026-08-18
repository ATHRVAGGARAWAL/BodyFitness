"use client";

import { motion } from "framer-motion";
import { ChartSpline, Dumbbell, House, ScanLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: House },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/snap-diet", label: "Scan", icon: ScanLine },
  { href: "/progress", label: "Progress", icon: ChartSpline },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ y: 90, opacity: 0, scale: 0.92 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 90, opacity: 0, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 340, damping: 29 }}
      aria-label="Main navigation"
      className="tab-bar fixed bottom-[max(10px,var(--safe-bottom))] left-1/2 z-50 flex w-[calc(min(100%,430px)-24px)] -translate-x-1/2 items-center justify-around px-2 pt-2"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "tab-item relative flex h-[58px] min-w-[76px] flex-col items-center justify-center gap-1 overflow-hidden rounded-[18px] text-[9px] font-bold tracking-[-0.01em] focus:outline-none",
              active && "tab-active",
            )}
          >
            {active && (
              <motion.span
                layoutId="dock-active"
                className="dock-active-surface absolute inset-0 rounded-[18px]"
                transition={{ type: "spring", stiffness: 430, damping: 34 }}
              />
            )}
            {active && (
              <motion.span
                layoutId="dock-limelight"
                className="dock-limelight absolute left-1/2 top-0 h-1 w-9 -translate-x-1/2 rounded-b-full"
                transition={{ type: "spring", stiffness: 470, damping: 32 }}
              />
            )}
            <motion.span
              animate={{ y: active ? -1 : 0, scale: active ? 1.08 : 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="relative z-10"
            >
              <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.45 : 1.9} />
            </motion.span>
            <span className="relative z-10">{tab.label}</span>
          </Link>
        );
      })}
    </motion.nav>
  );
}
