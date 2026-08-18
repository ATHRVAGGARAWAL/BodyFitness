"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import type { ReactNode } from "react";

export function LargeTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  const { scrollY } = useScroll();
  const scale = useTransform(scrollY, [0, 72], [1, 0.9]);
  const opacity = useTransform(scrollY, [0, 90], [1, 0.72]);

  return (
    <motion.header style={{ scale, opacity, transformOrigin: "left top" }} className="mb-5 pt-1">
      <div className="flex items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="mb-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/40">
              {eyebrow}
            </p>
          )}
          <h1 className="m-0 text-[34px] font-bold leading-none tracking-[-0.045em]">{title}</h1>
        </div>
        {action}
      </div>
    </motion.header>
  );
}
