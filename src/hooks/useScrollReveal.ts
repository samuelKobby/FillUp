import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type RevealType = 'fadeUp' | 'fadeIn' | 'slideLeft' | 'slideRight' | 'scaleUp';

interface UseScrollRevealOptions {
  type?: RevealType;
  duration?: number;
  delay?: number;
  stagger?: number;
  start?: string;
  ease?: string;
  animateChildren?: boolean;
}

const getRevealAnimation = (type: RevealType) => {
  const animations: Record<RevealType, Record<string, number>> = {
    fadeUp: { opacity: 0, y: 40 },
    fadeIn: { opacity: 0 },
    slideLeft: { opacity: 0, x: -60 },
    slideRight: { opacity: 0, x: 60 },
    scaleUp: { opacity: 0, scale: 0.88 },
  };
  return animations[type];
};

export const useScrollReveal = (options: UseScrollRevealOptions = {}) => {
  const {
    type = 'fadeUp',
    duration = 0.8,
    delay = 0,
    stagger = 0.12,
    start = 'top 85%',
    ease = 'power3.out',
    animateChildren = false,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const contextRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      const element = ref.current;
      if (!element) return;

      const fromAnimation = getRevealAnimation(type);
      const targets = animateChildren ? Array.from(element.children) : element;

      gsap.from(targets, {
        ...fromAnimation,
        duration,
        delay,
        stagger: animateChildren ? stagger : 0,
        ease,
        scrollTrigger: {
          trigger: element,
          start,
          once: true,
        },
      });
    });

    contextRef.current = ctx;

    return () => {
      if (contextRef.current) {
        contextRef.current.revert();
        contextRef.current = null;
      }
    };
  }, [type, duration, delay, stagger, start, ease, animateChildren]);

  return ref;
};

interface UseStaggerRevealOptions extends Omit<UseScrollRevealOptions, 'animateChildren'> {
  stagger?: number;
}

export const useStaggerReveal = (options: UseStaggerRevealOptions = {}) => {
  return useScrollReveal({
    ...options,
    animateChildren: true,
  });
};
