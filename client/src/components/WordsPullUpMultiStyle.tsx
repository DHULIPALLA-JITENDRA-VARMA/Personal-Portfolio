import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { EASE_EXPO, cn } from '../lib/design';

export interface Segment {
  text: string;
  className?: string;
}

interface Props {
  segments: Segment[];
  className?: string;
  align?: 'center' | 'left';
}

// Same pull-up as WordsPullUp, but every word keeps the class of the segment it came from,
// which lets one sentence mix the sans and the italic serif face.
export function WordsPullUpMultiStyle({ segments, className, align = 'center' }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const words = segments.flatMap((segment) =>
    segment.text.split(' ').filter(Boolean).map((word) => ({ word, className: segment.className })),
  );

  return (
    <span
      ref={ref}
      className={cn('inline-flex flex-wrap gap-x-[0.25em]', align === 'center' ? 'justify-center' : 'justify-start', className)}
    >
      {words.map(({ word, className: wordClass }, i) => (
        <motion.span
          key={`${word}-${i}`}
          className={cn('inline-block', wordClass)}
          initial={{ y: 20, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : undefined}
          transition={{ duration: 0.7, delay: Math.min(i * 0.08, 1.6), ease: EASE_EXPO }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
