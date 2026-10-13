import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackProjectClick, type Project } from '../api';
import { OutboundLink } from '../components/OutboundLink';
import { Reveal, Section, SectionHeader } from '../components/Section';
import { cn } from '../lib/design';

export function ProjectLinks({ project }: { project: Project }) {
  return (
    <>
      {project.live_url && (
        <OutboundLink href={project.live_url} className="link-arrow text-gray-400">
          Live demo <ArrowRight className="h-4 w-4 -rotate-45" aria-hidden />
        </OutboundLink>
      )}
      {project.repo_url && (
        <OutboundLink href={project.repo_url} className="link-arrow text-gray-400">
          Source code <ArrowRight className="h-4 w-4 -rotate-45" aria-hidden />
        </OutboundLink>
      )}
    </>
  );
}

function ProjectCard({ project, index, wide }: { project: Project; index: number; wide: boolean }) {
  const number = String(index + 1).padStart(2, '0');
  const to = `/projects/${project.slug}`;
  const onOpen = () => trackProjectClick(project.slug);

  return (
    <Reveal index={index} className={cn(wide && 'lg:col-span-2')}>
      <article className={cn('grid h-full overflow-hidden rounded-2xl bg-card', wide && 'lg:grid-cols-2')}>
        <div className="flex min-h-[300px] flex-col p-6 md:p-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <span className="text-xs tabular-nums text-muted">{number}</span>
            {project.featured && <span className="chip border-primary/30 text-primary">Featured</span>}
          </div>

          <h3 className={cn('text-cream', wide ? 'text-3xl md:text-4xl lg:text-5xl' : 'text-2xl md:text-3xl')}>
            <Link to={to} onClick={onOpen} className="transition-colors duration-200 hover:text-white">
              {project.title}.
            </Link>
          </h3>
          {project.tagline && <p className="mt-3 max-w-md text-sm text-gray-400 md:text-base">{project.tagline}</p>}

          <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Tech stack">
            {project.tech_stack.map((tech) => (
              <li key={tech} className="chip">
                {tech}
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 pt-8">
            <Link to={to} onClick={onOpen} className="link-arrow" aria-label={`View project: ${project.title}`}>
              View project <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <ProjectLinks project={project} />
          </div>
        </div>

        {wide && (
          <Link
            to={to}
            onClick={onOpen}
            tabIndex={-1}
            aria-hidden
            className="bg-cinematic group relative hidden min-h-[320px] overflow-hidden lg:block"
          >
            {project.image ? (
              <img src={project.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-expo group-hover:scale-[1.03]" />
            ) : (
              <>
                <div className="noise-overlay absolute inset-0 opacity-60 mix-blend-overlay" />
                <span className="font-serif absolute -bottom-[0.18em] right-6 text-[15rem] italic leading-none text-cream/90 transition-transform duration-700 ease-expo group-hover:-translate-y-2">
                  {number}
                </span>
              </>
            )}
          </Link>
        )}
      </article>
    </Reveal>
  );
}

export function Projects({ projects }: { projects: Project[] }) {
  if (!projects.length) return null;
  // Featured projects lead, each keeping the order chosen in the admin dashboard.
  const ordered = [...projects.filter((p) => p.featured), ...projects.filter((p) => !p.featured)];
  return (
    <Section id="projects">
      <SectionHeader eyebrow="Projects" title="Selected work." subtitle="Things I have designed and built." />
      <div className="grid grid-cols-1 gap-3 sm:gap-2 md:gap-1 lg:grid-cols-2">
        {ordered.map((project, i) => (
          <ProjectCard key={project.id} project={project} index={i} wide={i === 0 && project.featured} />
        ))}
      </div>
    </Section>
  );
}
