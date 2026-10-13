import { ArrowRight, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Achievement, Certification } from '../api';
import { OutboundLink } from '../components/OutboundLink';
import { Reveal, Section, SectionHeader } from '../components/Section';

function ListCard({ id, title, number, index, children }: { id: string; title: string; number: string; index: number; children: ReactNode }) {
  return (
    <Reveal index={index} className="h-full">
      <section id={id} aria-labelledby={`${id}-title`} className="flex h-full flex-col rounded-2xl bg-card p-6 md:p-8">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <h3 id={`${id}-title`} className="text-xl text-cream md:text-2xl">
            {title}.
          </h3>
          <span className="text-xs tabular-nums text-muted">{number}</span>
        </div>
        <ul className="space-y-5">{children}</ul>
      </section>
    </Reveal>
  );
}

function Item({ title, detail, url }: { title: string; detail?: string; url?: string }) {
  return (
    <li className="flex items-start gap-3">
      <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="text-sm text-cream md:text-base">
          {url ? (
            <OutboundLink href={url} className="inline-flex items-center gap-1.5 hover:text-white">
              {title} <ArrowRight className="h-3.5 w-3.5 -rotate-45" aria-hidden />
            </OutboundLink>
          ) : (
            title
          )}
        </p>
        {detail && <p className="mt-0.5 text-sm text-gray-400">{detail}</p>}
      </div>
    </li>
  );
}

export function Credentials({ certifications, achievements }: { certifications: Certification[]; achievements: Achievement[] }) {
  if (!certifications.length && !achievements.length) return null;
  return (
    <Section id="credentials" noise>
      <SectionHeader eyebrow="Credentials" title="Certifications and achievements." subtitle="Learning beyond the classroom." />
      <div className="grid grid-cols-1 gap-3 sm:gap-2 md:grid-cols-2 md:gap-1">
        {certifications.length > 0 && (
          <ListCard id="certifications" title="Certifications" number="01" index={0}>
            {certifications.map((c) => (
              <Item key={c.id} title={c.title} detail={c.issuer} url={c.url} />
            ))}
          </ListCard>
        )}
        {achievements.length > 0 && (
          <ListCard id="achievements" title="Achievements" number="02" index={1}>
            {achievements.map((a) => (
              <Item key={a.id} title={a.title} detail={a.description} />
            ))}
          </ListCard>
        )}
      </div>
    </Section>
  );
}
