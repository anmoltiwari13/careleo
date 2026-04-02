import { CSSProperties, PropsWithChildren, useMemo, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const easeOut = [0.22, 1, 0.36, 1];

export function PageFade({ children, className = "", style }: PropsWithChildren<{ className?: string; style?: CSSProperties }>) {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const yPrimary = useTransform(scrollY, [0, 1600], reduceMotion ? [0, 0] : [0, -140]);
  const ySecondary = useTransform(scrollY, [0, 1600], reduceMotion ? [0, 0] : [0, -260]);
  const yOrbLeft = useTransform(scrollY, [0, 1600], reduceMotion ? [0, 0] : [0, -90]);
  const yOrbRight = useTransform(scrollY, [0, 1600], reduceMotion ? [0, 0] : [0, -180]);

  return (
    <motion.main
      className={`relative isolate overflow-hidden ${className}`}
      style={style}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div className="arogya-parallax-layer arogya-parallax-layer--aurora" style={{ y: yPrimary }} />
        <motion.div className="arogya-parallax-layer arogya-parallax-layer--mesh" style={{ y: ySecondary }} />
        <motion.div className="arogya-parallax-orb arogya-parallax-orb--left" style={{ y: yOrbLeft }} />
        <motion.div className="arogya-parallax-orb arogya-parallax-orb--right" style={{ y: yOrbRight }} />
        <motion.div
          className="arogya-parallax-grid"
          animate={reduceMotion ? undefined : { backgroundPositionX: ["0%", "100%"], opacity: [0.14, 0.2, 0.14] }}
          transition={reduceMotion ? undefined : { duration: 18, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </motion.main>
  );
}

export function Float({ children, className = "" }: PropsWithChildren<{ className?: string }>) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
      transition={reduceMotion ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

export function MotionText({
  text,
  className = "",
  as = "span",
  delay = 0,
  style
}: {
  text: string;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3";
  delay?: number;
  style?: CSSProperties;
}) {
  const reduceMotion = useReducedMotion();
  const words = useMemo(() => text.split(" "), [text]);
  const Tag = motion[as];

  return (
    <Tag
      className={className}
      style={style}
      initial={reduceMotion ? false : "hidden"}
      animate={reduceMotion ? undefined : "show"}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.04,
            delayChildren: delay
          }
        }
      }}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="inline-block"
          variants={{
            hidden: { opacity: 0, y: 14 },
            show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } }
          }}
        >
          {word}
          {index < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </Tag>
  );
}

export function Parallax({
  children,
  className = "",
  strength = 40
}: PropsWithChildren<{ className?: string; strength?: number }>) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-strength, strength]);

  return (
    <motion.div ref={ref} className={className} style={{ y: reduceMotion ? 0 : y }}>
      {children}
    </motion.div>
  );
}
