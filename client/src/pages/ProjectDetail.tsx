import DOMPurify from 'dompurify';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { marked } from 'marked';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, getProject, trackProjectClick, type Project } from '../api';
import { Navbar } from '../components/Navbar';
import { OutboundLink } from '../components/OutboundLink';
import { PageState } from '../components/PageState';
import { PillButton } from '../components/PillButton';
import { Seo } from '../components/Seo';
import { WordsPullUp } from '../components/WordsPullUp';
import { trackOutbound } from '../api';
import { usePageTitle } from '../lib/usePageTitle';
import { usePortfolio } from '../lib/usePortfolio';
import { Footer } from '../sections/Footer';

type State = { status: 'loading' } | { status: 'missing' } | { status: 'error'; message: string } | { status: 'ready'; project: Project };

// Markdown is authored by the admin, but it is still sanitised: the output is injected as HTML.
function renderMarkdown(md: string) {
  const html = marked.parse(md, { async: false, gfm: true, breaks: false });
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ['target', 'rel'] });
}

export default function ProjectDetail() {
  const { slug = '' } = useParams();
  const portfolio = usePortfolio();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    window.scrollTo(0, 0);
    getProject(slug, controller.signal)
      .then((project) => setState({ status: 'ready', project }))
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setState(err instanceof ApiError && err.status === 404 ? { status: 'missing' } : { status: 'error', message: err.message });
      });
    return () => controller.abort();
  }, [slug]);

  usePageTitle(state.status === 'missing' ? 'Project not found' : null, state.status === 'missing');

  const html = useMemo(() => (state.status === 'ready' ? renderMarkdown(state.project.description_md) : ''), [state]);

  if (state.status === 'loading') return <PageState title="Loading project" loading />;
  if (state.status !== 'ready') {
    return (
      <PageState title={state.status === 'missing' ? 'Project not found.' : 'This project could not be loaded.'}>
        {state.status === 'error' && <p>{state.message}</p>}
        <Link to="/#projects" className="btn-ghost mt-6">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to projects
        </Link>
      </PageState>
    );
  }

  const { project } = state;
  const others = (portfolio.data?.projects ?? []).filter((p) => p.slug !== project.slug);

  return (
    <>
      {portfolio.data && <Seo profile={portfolio.data.profile} title={project.title} description={project.tagline} image={project.image} />}
      <main>
        <section className="p-4 md:p-6">
          <div className="bg-cinematic relative overflow-hidden rounded-2xl md:rounded-[2rem]">
            <div aria-hidden className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/75" />
            <Navbar />
            <div className="relative px-5 pb-8 pt-28 sm:px-8 sm:pt-36 lg:px-10 lg:pb-10 lg:pt-44">
              <Link to="/#projects" className="link-arrow mb-8 text-cream/80">
                <ArrowLeft className="h-4 w-4" aria-hidden /> All projects
              </Link>
              <div className="grid grid-cols-12 items-end gap-x-6 gap-y-6">
                <h1 className="col-span-12 text-[13vw] font-medium leading-[0.9] tracking-[-0.06em] text-cream sm:text-[10vw] lg:col-span-8 lg:text-[7.2vw]">
                  <WordsPullUp text={project.title} />
                </h1>
                <div className="col-span-12 flex flex-col items-start gap-5 lg:col-span-4 lg:pb-2">
                  {project.tagline && <p className="text-sm text-primary/80 md:text-base" style={{ lineHeight: 1.3 }}>{project.tagline}</p>}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    {project.live_url && (
                      <PillButton external href={project.live_url} onClick={() => trackOutbound(project.live_url)} icon={<ArrowRight className="h-4 w-4 -rotate-45" aria-hidden />}>
                        Live demo
                      </PillButton>
                    )}
                    {project.repo_url && (
                      <OutboundLink href={project.repo_url} className="link-arrow">
                        Source code <ArrowRight className="h-4 w-4 -rotate-45" aria-hidden />
                      </OutboundLink>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-x-10 gap-y-10 px-4 py-12 md:px-6 md:py-20 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-10">
              <h2 className="eyebrow mb-5">Tech stack</h2>
              <ul className="flex flex-wrap gap-1.5">
                {project.tech_stack.map((tech) => (
                  <li key={tech} className="chip">
                    {tech}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          <article className="lg:col-span-8">
            {project.image && <img src={project.image} alt={`${project.title} screenshot`} className="mb-10 w-full rounded-2xl" />}
            <h2 className="eyebrow mb-5">Overview</h2>
            <div className="prose-portfolio max-w-2xl" dangerouslySetInnerHTML={{ __html: html }} />
          </article>
        </section>

        {others.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6" aria-labelledby="more-projects">
            <h2 id="more-projects" className="eyebrow mb-5">
              More projects
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:gap-2 md:grid-cols-2 md:gap-1">
              {others.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/projects/${p.slug}`}
                    onClick={() => trackProjectClick(p.slug)}
                    className="group flex h-full items-center justify-between gap-6 rounded-2xl bg-card p-6 transition-colors duration-200 hover:bg-[#2a2a2a] md:p-8"
                  >
                    <span>
                      <span className="block text-xl text-cream md:text-2xl">{p.title}.</span>
                      {p.tagline && <span className="mt-1.5 block text-sm text-gray-400">{p.tagline}</span>}
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0 text-muted transition-colors duration-200 group-hover:text-cream" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      {portfolio.data && <Footer profile={portfolio.data.profile} />}
    </>
  );
}
