import { Children, PropsWithChildren } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function GlassCard({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  const reduceMotion = useReducedMotion();
  const items = Children.toArray(children);

  const container = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.08
      }
    }
  };

  const child = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <motion.div
      className={`rounded-2xl border border-white/30 bg-[var(--brand-card)] p-6 shadow-glass backdrop-blur-xl dark:border-slate-700/50 ${className}`}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "show"}
      viewport={{ once: true, amount: 0.25 }}
      variants={reduceMotion ? undefined : container}
    >
      {items.map((item, index) => (
        <motion.div key={`glass-item-${index}`} variants={reduceMotion ? undefined : child}>
          {item}
        </motion.div>
      ))}
    </motion.div>
  );
}
