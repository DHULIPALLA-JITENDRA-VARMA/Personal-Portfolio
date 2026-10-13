import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Education, Experience } from '../api';
import { Reveal, Section, SectionHeader } from '../components/Section';
import { formatRange } from '../lib/format';

// Editorial two-column layout: sticky heading on the left, entries on the right.
function Split({ id, header, children }: { id: string; header: ReactNode; children: ReactNode }) {
  return (
    <Section id={id}>
      <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-10">{header}</div>
        </div>
        <div className="lg:col-span-8">{children}</div>
      </div>
    </Section>
  );
}

function Entry({ title, subtitle, meta, children, index }: { title: string; subtitle: string; meta?: string; children?: ReactNode; index: number }) {
  return (
    <Reveal index={index}>
      <article className="border-t border-white/10 py-7 md:py-9">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h3 className="text-xl text-cream md:text-2xl">{title}</h3>
          {meta && <p className="text-xs tabular-nums text-gray-400 md:text-sm">{meta}</p>}
        </div>
        <p className="mt-1.5 text-sm text-primary/70 md:text-base">{subtitle}</p>
        {children}
      </article>
    </Reveal>
  );
}

export function ExperienceSection({ experience }: { experience: Experience[] }) {
  if (!experience.length) return null;
  return (
    <Split id="experience" header={<SectionHeader eyebrow="Experience" title="Where I have worked." subtitle="Real clients, real requirements." />}>
      {experience.map((item, i) => (
        <Entry key={item.id} index={i} title={item.role} subtitle={item.company} meta={formatRange(item.start, item.end)}>
          {item.bullets.length > 0 && (
            <ul className="mt-5 space-y-3">
              {item.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-sm text-gray-400 md:text-base">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </Entry>
      ))}
    </Split>
  );
}

export function EducationSection({ education }: { education: Education[] }) {
  if (!education.length) return null;
  return (
    <Split id="education" header={<SectionHeader eyebrow="Education" title="Where I have studied." />}>
      {education.map((item, i) => (
        <Entry key={item.id} index={i} title={item.degree} subtitle={item.institution} meta={formatRange(item.start, item.end)}>
          {item.score && <p className="chip mt-4">{item.score}</p>}
        </Entry>
      ))}
    </Split>
  );
}
