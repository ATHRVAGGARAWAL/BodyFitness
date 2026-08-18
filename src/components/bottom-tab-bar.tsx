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
      initial={{ y: 48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 48, opacity: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 31 }}
      aria-label="Main navigation"
      className="tab-bar fixed bottom-0 left-1/2 z-50 flex w-full max-w-[430px] -translate-x-1/2 items-start justify-around px-2 pt-1.5"
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
              "tab-item relative flex h-[54px] min-w-[74px] flex-col items-center justify-center gap-0.5 rounded-[13px] text-[10px] font-semibold transition-colors focus:outline-none focus-visible:bg-white/[0.08]",
              active && "tab-active",
            )}
          >
            <Icon className="relative z-10 h-[22px] w-[22px]" strokeWidth={active ? 2.6 : 2.1} />
            <span className="relative z-10">{tab.label}</span>
          </Link>
        );
      })}
    </motion.nav>
  );
}
