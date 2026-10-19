"use client";

import { useEffect, useRef, useState } from "react";

type Line = string | { text: string; accent?: boolean };

/** Headline whose words rise out of a mask as it scrolls into view. */
export default function SplitHeading({
  lines,
  as = "h2",
  className = "",
  accentClassName = "bg-gradient-to-r from-solar-400 to-solar-600 bg-clip-text text-transparent",
  delay = 0,
}: {
  lines: Line[];
  as?: "h1" | "h2" | "h3";
  className?: string;
  accentClassName?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLHeadingElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  let index = 0;
  const children = lines.map((line, lineIndex) => {
    const text = typeof line === "string" ? line : line.text;
    const accent = typeof line === "string" ? false : Boolean(line.accent);
    return (
      <span key={lineIndex} className="block">
        {text
          .split(/\s+/)
          .filter(Boolean)
          .map((word, wordIndex) => {
            const wordDelay = delay + index++ * 70;
            return (
              <span key={wordIndex}>
                <span className="inline-block overflow-hidden align-top pb-[0.16em] -mb-[0.16em]">
                  <span
                    className={`split-word inline-block ${accent ? accentClassName : ""}`}
                    style={{ transitionDelay: `${wordDelay}ms` }}
                  >
                    {word}
                  </span>
                </span>{" "}
              </span>
            );
          })}
      </span>
    );
  });

  const Tag = as;
  return (
    <Tag ref={ref} className={`${className} ${seen ? "split-in" : ""}`}>
      {children}
    </Tag>
  );
}
