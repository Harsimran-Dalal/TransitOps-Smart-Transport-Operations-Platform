import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

export function AnimatedNumber({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => `${v.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

export const pageVariants = {
  initial: { opacity: 0, y: 24, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -12, filter: "blur(4px)", transition: { duration: 0.25 } }
};

export const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } }
};

export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="skeleton-kpi" />
      ))}
    </div>
  );
}
