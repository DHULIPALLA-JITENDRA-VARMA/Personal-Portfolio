import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/design';

const outer =
  'group inline-flex items-center gap-2 rounded-full bg-primary py-1 pl-5 pr-1 text-sm font-bold text-black transition-all duration-300 ease-expo hover:gap-3 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:text-base';
const circle =
  'flex h-9 w-9 items-center justify-center rounded-full bg-black text-cream transition-transform duration-300 ease-expo group-hover:scale-110 sm:h-10 sm:w-10';

interface Common {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}
type Props =
  | (Common & { href: string; onClick?: () => void; download?: boolean; external?: boolean; type?: never; disabled?: never })
  | (Common & { href?: undefined; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; download?: never; external?: never });

// Cream pill with a black circle holding an arrow: the primary call to action everywhere.
export function PillButton({ children, className, icon, href, onClick, type = 'button', disabled, download, external }: Props) {
  const content = (
    <>
      <span>{children}</span>
      <span className={circle}>{icon ?? <ArrowRight className="h-4 w-4" aria-hidden />}</span>
    </>
  );
  if (href !== undefined) {
    return (
      <a href={href} onClick={onClick} download={download} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={cn(outer, className)}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cn(outer, className)}>
      {content}
    </button>
  );
}
