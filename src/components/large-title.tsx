"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeRise, T } from "@/lib/motion";

export function LargeTitle({ eyebrow, title, action, description }: { eyebrow?: string; title: string; action?: ReactNode; description?: string }) {
  return (
    <motion.header variants={fadeRise} initial="hidden" animate="visible" transition={T.base} className="mb-8 md:mb-10">
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0">
          {eyebrow ? <p className="page-kicker mb-2">{eyebrow}</p> : null}
          <h1 className="page-title truncate">{title}</h1>
          {description ? <p className="mt-2 max-w-xl text-base text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2 pb-1">{action}</div> : null}
      </div>
    </motion.header>
  );
}
