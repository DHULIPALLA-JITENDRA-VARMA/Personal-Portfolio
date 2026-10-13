import { ArrowRight, ArrowUp, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RESUME_URL, type Profile } from '../api';
import { OutboundLink } from '../components/OutboundLink';

export function Footer({ profile }: { profile: Profile }) {
  return (
    <footer className="bg-black pb-8 pt-10">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col gap-8 border-t border-white/10 pt-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-2xl text-cream md:text-3xl">{profile.name}</p>
            <p className="mt-2 text-sm text-gray-400">{profile.headline}</p>
          </div>
          <ul className="flex flex-wrap items-center gap-x-7 gap-y-3">
            {profile.linkedin_url && (
              <li>
                <OutboundLink href={profile.linkedin_url} className="link-arrow">
                  LinkedIn <ArrowRight className="h-4 w-4 -rotate-45" aria-hidden />
                </OutboundLink>
              </li>
            )}
            {profile.github_url && (
              <li>
                <OutboundLink href={profile.github_url} className="link-arrow">
                  GitHub <ArrowRight className="h-4 w-4 -rotate-45" aria-hidden />
                </OutboundLink>
              </li>
            )}
            {profile.has_resume && (
              <li>
                <a href={RESUME_URL} className="link-arrow">
                  Download Resume <Download className="h-4 w-4" aria-hidden />
                </a>
              </li>
            )}
          </ul>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 text-xs text-muted">
          <p>
            © {new Date().getFullYear()} {profile.name}
          </p>
          <div className="flex items-center gap-6">
            <Link to="/admin" className="-my-3 py-3 transition-colors duration-200 hover:text-cream">
              Admin
            </Link>
            <a href="#top" className="-my-3 inline-flex items-center gap-1.5 py-3 transition-colors duration-200 hover:text-cream">
              Back to top <ArrowUp className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
