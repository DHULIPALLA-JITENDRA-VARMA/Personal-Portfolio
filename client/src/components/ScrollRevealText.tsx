import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useRef } from 'react';

function AnimatedLetter({ char, index, total, progress }: { char: string; index: number; total: number; progress: MotionValue<number> }) {
  const at = index / total;
  const opacity = useTransform(progress, [at - 0.1, at + 0.05], [0.2, 1]);
  return <motion.span style={{ opacity }}>{char}</motion.span>;
}

// Scroll-linked reveal: each character brightens from 20% to 100% opacity as the paragraph
// travels up the viewport. Characters are grouped per word so lines only break between words,
// and screen readers get the plain sentence instead of hundreds of single-letter spans.
export function ScrollRevealText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.95', 'end 0.8'] });

  if (reduceMotion) return <p className={className}>{text}</p>;

  const words = text.split(' ');
  let cursor = 0;
  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, w) => {
          const start = cursor;
          cursor += word.length + 1;
          return (
            <span key={w}>
              <span className="inline-block whitespace-nowrap">
                {[...word].map((char, c) => (
                  <AnimatedLetter key={c} char={char} index={start + c} total={text.length} progress={scrollYProgress} />
                ))}
              </span>{' '}
            </span>
          );
        })}
      </span>
    </p>
  );
}
