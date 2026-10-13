import type { AnchorHTMLAttributes } from 'react';
import { trackOutbound } from '../api';

// External link that opens in a new tab and records an `outbound_click` event.
export function OutboundLink({ href, onClick, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        trackOutbound(href);
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
