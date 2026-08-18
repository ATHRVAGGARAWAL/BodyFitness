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
  const scale = useTransform(scrollY, [0, 84], [1, 0.91]);
  const opacity = useTransform(scrollY, [0, 110], [1, 0.68]);
  const y = useTransform(scrollY, [0, 84], [0, -7]);

  return (
    <motion.header style={{ scale, opacity, y, transformOrigin: "left top" }} className="mb-6 pt-1">
      <div className="flex min-h-14 items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="section-kicker mb-2">
              {eyebrow}
            </p>
          )}
          <h1 className="m-0 text-[37px] font-bold leading-[0.92] tracking-[-0.052em]">{title}</h1>
        </div>
        {action}
      </div>
    </motion.header>
  );
}
