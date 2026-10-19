"use client";

import { useEffect, useRef } from "react";

/** Full-bleed background photo that drifts slower than the page, with a slow push-in. */
export default function ParallaxImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const layer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.min(window.scrollY, window.innerHeight * 1.2) * 0.14;
      if (layer.current) layer.current.style.transform = `translate3d(0, ${y}px, 0)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
    };
  }, []);

  return (
    <div ref={layer} className="absolute inset-x-0 -top-[20%] h-[125%] will-change-transform">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={`animate-kenburns h-full w-full object-cover ${className}`} />
    </div>
  );
}
