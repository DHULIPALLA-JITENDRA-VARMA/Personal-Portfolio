import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { EASE_EXPO } from '../lib/design';

export const NAV_ITEMS = [
  { label: 'About', hash: 'about' },
  { label: 'Skills', hash: 'skills' },
  { label: 'Projects', hash: 'projects' },
  { label: 'Experience', hash: 'experience' },
  { label: 'Contact', hash: 'contact' },
];

const pillClass = 'flex items-center gap-3 bg-black px-4 sm:gap-6 md:gap-12 md:px-8 lg:gap-14';
const linkClass =
  'inline-flex min-h-[44px] items-center whitespace-nowrap rounded text-[11px] text-cream/80 transition-colors duration-200 hover:text-cream min-[380px]:text-xs md:text-sm';

function NavLinks() {
  const onHome = useLocation().pathname === '/';
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <li key={item.hash}>
          {onHome ? (
            <a href={`#${item.hash}`} className={linkClass}>
              {item.label}
            </a>
          ) : (
            <Link to={`/#${item.hash}`} className={linkClass}>
              {item.label}
            </Link>
          )}
        </li>
      ))}
    </>
  );
}

// Black pill that hangs from the top edge of the hero panel. On the home page the items are
// plain in-page anchors; elsewhere they route back to the home page section.
export function Navbar() {
  return (
    <>
      <nav aria-label="Primary" className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
        <ul className={`${pillClass} rounded-b-2xl md:rounded-b-3xl`}>
          <NavLinks />
        </ul>
      </nav>
      <FloatingNav />
    </>
  );
}

// The hero pill scrolls away with the hero, so once it is out of view the same pill drops in
// from the top of the viewport and stays there. Only one of the two is ever on screen.
function FloatingNav() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 120);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        // Centred with flexbox on a wrapper: the animation owns `transform`, so a translate-x
        // utility on the same element would be overwritten.
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center">
        <motion.nav
          aria-label="Sections"
          className="pointer-events-auto"
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: 0.4, ease: EASE_EXPO }}
        >
          <ul className={`${pillClass} rounded-b-2xl border-x border-b border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.6)] md:rounded-b-3xl`}>
            <NavLinks />
          </ul>
        </motion.nav>
        </div>
      )}
    </AnimatePresence>
  );
}
