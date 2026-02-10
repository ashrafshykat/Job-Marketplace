'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export function useGSAP() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.from(containerRef.current.children, {
        opacity: 0,
        y: 30,
        stagger: 0.1,
        duration: 0.6,
        ease: 'power3.out'
      });
    }
  }, []);

  return containerRef;
}

export function useGSAPTimeline() {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    timelineRef.current = gsap.timeline();
    return () => {
      timelineRef.current?.kill();
    };
  }, []);

  return timelineRef;
}

