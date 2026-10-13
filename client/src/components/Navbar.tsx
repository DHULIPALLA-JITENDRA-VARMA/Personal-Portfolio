import { Link, useLocation } from 'react-router-dom';

export const NAV_ITEMS = [
  { label: 'About', hash: 'about' },
  { label: 'Skills', hash: 'skills' },
  { label: 'Projects', hash: 'projects' },
  { label: 'Experience', hash: 'experience' },
  { label: 'Contact', hash: 'contact' },
];

const linkClass =
  'whitespace-nowrap rounded py-1 text-[11px] text-cream/80 transition-colors duration-200 hover:text-cream sm:text-xs md:text-sm';

// Black pill that hangs from the top edge of the hero panel. On the home page the items are
// plain in-page anchors; elsewhere they route back to the home page section.
export function Navbar() {
  const onHome = useLocation().pathname === '/';
  return (
    <nav aria-label="Primary" className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
      <ul className="flex items-center gap-3 rounded-b-2xl bg-black px-4 py-2 sm:gap-6 md:gap-12 md:rounded-b-3xl md:px-8 lg:gap-14">
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
      </ul>
    </nav>
  );
}
