"use client";

import { motion, useInView, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { useRef, type ReactNode } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

/** Slide-up reveal for a block when it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  ...rest
}: { children: ReactNode; delay?: number; y?: number } & HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.9, ease, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Headline whose lines rise out of a mask one after another.
 * Pass each line as an array item; strings or nodes.
 * Visibility is tracked on the whole heading (not the hidden lines), so every line
 * is guaranteed to animate in once the heading scrolls into view.
 */
export function LineReveal({
  lines,
  className,
  lineClassName = "",
  delay = 0,
  as: Tag = "h2",
  animateOnMount = false,
  id,
}: {
  id?: string;
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p";
  animateOnMount?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const show = animateOnMount || inView;
  return (
    <Tag id={id} ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.06em] -mb-[0.06em]">
          <motion.span
            className={`block ${lineClassName}`}
            initial={{ y: "105%" }}
            animate={show || reduce ? { y: "0%" } : { y: "105%" }}
            transition={reduce ? { duration: 0 } : { duration: 1.05, ease, delay: delay + i * 0.11 }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Image wrapper that wipes open (clip-path) when it enters the viewport. */
export function ImageReveal({
  children,
  className,
  delay = 0,
  from = "bottom",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "bottom" | "left" | "right";
}) {
  const reduce = useReducedMotion();
  const hidden = {
    bottom: "inset(100% 0% 0% 0%)",
    left: "inset(0% 100% 0% 0%)",
    right: "inset(0% 0% 0% 100%)",
  }[from];
  return (
    <motion.div
      className={className}
      initial={{ clipPath: hidden }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 1.3, ease, delay }}
    >
      {children}
    </motion.div>
  );
}
