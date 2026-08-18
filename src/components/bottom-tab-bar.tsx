"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity, Camera, ChartNoAxesCombined, Dumbbell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Dashboard", icon: Activity, color: "#ff375f" },
  { href: "/workout", label: "Workout", icon: Dumbbell, color: "#30d158" },
  { href: "/snap-diet", label: "Snap Diet", icon: Camera, color: "#64d2ff" },
  { href: "/progress", label: "Progress", icon: ChartNoAxesCombined, color: "#bf5af2" },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 90, opacity: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 31 }}
      aria-label="Main navigation"
      className="liquid-dock fixed bottom-[max(10px,var(--safe-bottom))] left-1/2 z-50 flex h-[66px] w-[calc(min(100%,430px)-24px)] -translate-x-1/2 items-center gap-1 rounded-[24px] p-1.5"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-[53px] min-w-0 items-center justify-center overflow-hidden rounded-[19px] text-[11px] font-semibold transition-[flex,color] duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
              active ? "flex-[1.5]" : "flex-[0.72]",
              active ? "text-white" : "text-white/45",
            )}
          >
            {active && (
              <motion.span
                layoutId="tab-highlight"
                className="absolute inset-0 rounded-[19px] border border-white/[0.11]"
                style={{
                  background: `linear-gradient(135deg, ${tab.color}2b, rgba(255,255,255,.075))`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,.14), 0 8px 26px ${tab.color}16`,
                }}
                transition={{ type: "spring", stiffness: 430, damping: 34 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center">
              {active && <span className="absolute h-8 w-8 rounded-full blur-xl" style={{ background: `${tab.color}55` }} />}
              <Icon className="relative h-[21px] w-[21px]" strokeWidth={active ? 2.7 : 2.1} style={active ? { color: tab.color } : undefined} />
            </span>
            <AnimatePresence initial={false}>
              {active && (
                <motion.span
                  initial={{ width: 0, opacity: 0, x: -5 }}
                  animate={{ width: "auto", opacity: 1, x: 0 }}
                  exit={{ width: 0, opacity: 0, x: -4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  className="relative z-10 ml-2 overflow-hidden whitespace-nowrap"
                >
                  {tab.label}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        );
      })}
    </motion.nav>
  );
}
