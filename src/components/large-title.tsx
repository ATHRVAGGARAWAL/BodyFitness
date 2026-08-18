"use client";

import { motion } from "framer-motion";
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
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
      className="mb-7 pt-1"
    >
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="page-kicker m-0">{eyebrow}</p>}
          <h1 className="page-title truncate">{title}</h1>
        </div>
        {action}
      </div>
    </motion.header>
  );
}
