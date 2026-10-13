import { ArrowRight, GitFork, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRepos, type ReposResponse } from '../api';
import { OutboundLink } from '../components/OutboundLink';
import { Section, SectionHeader } from '../components/Section';
import { formatDate } from '../lib/format';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: ReposResponse };

export function Repos({ githubUrl }: { githubUrl: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    getRepos(controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((err: Error) => err.name !== 'AbortError' && setState({ status: 'error' }));
    return () => controller.abort();
  }, []);

  const profileLink = githubUrl && (
    <OutboundLink href={githubUrl} className="link-arrow">
      View GitHub profile <ArrowRight className="h-4 w-4 -rotate-45" aria-hidden />
    </OutboundLink>
  );

  return (
    <Section id="github">
      <div className="flex flex-wrap items-end justify-between gap-x-8">
        <SectionHeader eyebrow="GitHub" title="Open source." subtitle="Public repositories, live from GitHub." />
        <div className="mb-8 md:mb-12">{profileLink}</div>
      </div>

      <div className="panel overflow-hidden" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && (
          <ul aria-label="Loading repositories">
            {[0, 1, 2].map((i) => (
              <li key={i} className="border-b border-white/[0.06] p-5 last:border-0 md:px-8">
                <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
                <div className="mt-3 h-3 w-72 max-w-full animate-pulse rounded bg-white/5" />
              </li>
            ))}
          </ul>
        )}

        {state.status === 'error' && (
          <p className="p-6 text-sm text-gray-400 md:px-8">GitHub repositories could not be loaded right now. Please try again later.</p>
        )}

        {state.status === 'ready' && state.data.repos.length === 0 && (
          <p className="p-6 text-sm text-gray-400 md:px-8">No public repositories yet.</p>
        )}

        {state.status === 'ready' && state.data.repos.length > 0 && (
          <ul>
            {state.data.repos.map((repo) => (
              <li key={repo.name} className="border-b border-white/[0.06] last:border-0">
                <OutboundLink
                  href={repo.url}
                  className="group grid grid-cols-1 gap-x-8 gap-y-3 p-5 transition-colors duration-200 hover:bg-white/[0.03] md:grid-cols-[1fr_auto] md:items-center md:px-8"
                >
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 break-all text-base text-cream md:text-lg">
                      {repo.name}
                      <ArrowRight className="h-4 w-4 shrink-0 -rotate-45 text-gray-500 transition-colors duration-200 group-hover:text-cream" aria-hidden />
                    </h3>
                    {repo.description && <p className="mt-1 line-clamp-2 text-sm text-gray-400">{repo.description}</p>}
                  </div>
                  <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-400">
                    {repo.language && (
                      <div className="flex items-center gap-1.5">
                        <dt className="sr-only">Language</dt>
                        <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />
                        <dd>{repo.language}</dd>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <dt><Star className="h-3.5 w-3.5" aria-label="Stars" /></dt>
                      <dd className="tabular-nums">{repo.stars}</dd>
                    </div>
                    <div className="flex items-center gap-1">
                      <dt><GitFork className="h-3.5 w-3.5" aria-label="Forks" /></dt>
                      <dd className="tabular-nums">{repo.forks}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Last updated</dt>
                      <dd>Updated {formatDate(repo.updated_at)}</dd>
                    </div>
                  </dl>
                </OutboundLink>
              </li>
            ))}
          </ul>
        )}
      </div>

      {state.status === 'ready' && state.data.stale && (
        <p className="mt-3 text-xs text-gray-500">GitHub is unreachable right now, so this list may be slightly out of date.</p>
      )}
    </Section>
  );
}
