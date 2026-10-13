import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { EASE_CARD, cn } from '../lib/design';
import { WordsPullUpMultiStyle } from './WordsPullUpMultiStyle';

export function Section({ id, children, className, noise = false }: { id: string; children: ReactNode; className?: string; noise?: boolean }) {
  return (
    <section id={id} className={cn('relative bg-black py-16 md:py-24', className)}>
      {noise && <div aria-hidden className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]" />}
      <div className="relative mx-auto max-w-7xl px-4 md:px-6">{children}</div>
    </section>
  );
}

// Two-tone heading: the title in cream, the supporting line in grey directly underneath.
export function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <header className="mb-8 md:mb-12">
      <p className="eyebrow mb-4">{eyebrow}</p>
      <h2 className="text-2xl font-normal leading-[1.1] sm:text-3xl lg:text-4xl">
        <WordsPullUpMultiStyle align="left" className="text-cream" segments={[{ text: title }]} />
        {subtitle && (
          <>
            <br />
            <WordsPullUpMultiStyle align="left" className="text-gray-500" segments={[{ text: subtitle }]} />
          </>
        )}
      </h2>
    </header>
  );
}

// Card entrance: scale up from 95% and fade in, staggered by `index`.
export function Reveal({ children, index = 0, className }: { children: ReactNode; index?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={inView ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.8, delay: Math.min(index, 5) * 0.15, ease: EASE_CARD }}
    >
      {children}
    </motion.div>
  );
}
