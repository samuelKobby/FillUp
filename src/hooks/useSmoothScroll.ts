import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface UseSmoothScrollOptions {
  enabled?: boolean;
  // When true, Lenis will use the window scroll instead of capturing nested scroll containers.
  // This makes overflow-y-auto layouts (like dashboards) scroll reliably.
  useWindowScroll?: boolean;
}

export const useSmoothScroll = (options: UseSmoothScrollOptions = {}) => {
  const { enabled = true, useWindowScroll = true } = options;
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Initialize Lenis with custom easing
    // Important: when wrapper/window scroll is used, Lenis should not hijack wheel for nested scrollables.
    // We also explicitly disable smoothWheel to restore native wheel behavior in your dashboard containers.
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: false,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      wrapper: useWindowScroll ? window : undefined,
    } as any);


    lenisRef.current = lenis;

    // Synchronize Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };

    // Add Lenis to GSAP ticker
    gsap.ticker.add(tick);

    // Prevent lagSmoothing issues
    gsap.ticker.lagSmoothing(0);

    // Cleanup on unmount
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled, useWindowScroll]);

  return lenisRef;
};

