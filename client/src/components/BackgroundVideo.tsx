import { useReducedMotion } from 'framer-motion';
import { useState } from 'react';

// Purely decorative. Renders nothing (revealing the CSS gradient underneath) when no URL is
// configured, when the visitor prefers reduced motion, or when the file fails to load.
export function BackgroundVideo({ src }: { src: string }) {
  const reduceMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  if (!src || reduceMotion || failed) return null;
  return (
    <video
      aria-hidden
      tabIndex={-1}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      src={src}
      onError={() => setFailed(true)}
      onLoadedData={() => setReady(true)}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
