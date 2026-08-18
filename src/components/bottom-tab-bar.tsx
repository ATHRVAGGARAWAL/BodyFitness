"use client";

import { motion } from "framer-motion";
import { Activity, Camera, ChartNoAxesCombined, Dumbbell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/snap-diet", label: "Snap Diet", icon: Camera },
  { href: "/progress", label: "Progress", icon: ChartNoAxesCombined },
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
      className="glass fixed bottom-[max(10px,var(--safe-bottom))] left-1/2 z-50 flex h-[72px] w-[calc(min(100%,430px)-24px)] -translate-x-1/2 items-center justify-around rounded-[25px] px-2"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative flex h-[58px] min-w-[74px] flex-col items-center justify-center gap-0.5 rounded-[19px] text-[10px] font-semibold transition-colors focus:outline-none focus-visible:bg-white/[0.12] focus-visible:text-white",
              active ? "text-white" : "text-white/45",
            )}
          >
            {active && (
              <motion.span
                layoutId="tab-highlight"
                className="absolute inset-1 rounded-[17px] bg-white/[0.09]"
                transition={{ type: "spring", stiffness: 430, damping: 34 }}
              />
            )}
            <Icon className="relative z-10 h-[22px] w-[22px]" strokeWidth={active ? 2.6 : 2.1} />
            <span className="relative z-10">{tab.label}</span>
          </Link>
        );
      })}
    </motion.nav>
  );
}
