import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { EASE_EXPO, cn } from '../lib/design';

interface Props {
  text: string;
  className?: string;
  /** Adds a superscript asterisk to the last word when it ends in "a". */
  showAsterisk?: boolean;
  delay?: number;
}

// Each word slides up 20px and fades in, 80ms after the previous one, the first time it is seen.
export function WordsPullUp({ text, className, showAsterisk = false, delay = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const words = text.split(' ').filter(Boolean);

  return (
    <span ref={ref} className={cn('inline-flex flex-wrap gap-x-[0.22em]', className)}>
      {words.map((word, i) => {
        const asterisk = showAsterisk && i === words.length - 1 && word.endsWith('a');
        return (
          <motion.span
            key={`${word}-${i}`}
            className="relative inline-block"
            initial={{ y: 20, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : undefined}
            transition={{ duration: 0.7, delay: delay + i * 0.08, ease: EASE_EXPO }}
          >
            {word}
            {asterisk && (
              <span aria-hidden className="absolute -right-[0.3em] top-[0.65em] text-[0.31em] leading-none">
                *
              </span>
            )}
          </motion.span>
        );
      })}
    </span>
  );
}
