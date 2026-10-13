import { Check } from 'lucide-react';
import type { SkillGroup } from '../api';
import { BackgroundVideo } from '../components/BackgroundVideo';
import { Reveal, Section, SectionHeader } from '../components/Section';
import { ACCENT_VIDEO_URL } from '../lib/design';

export function Skills({ skills }: { skills: SkillGroup[] }) {
  if (!skills.length) return null;
  const total = skills.reduce((n, group) => n + group.items.length, 0);

  return (
    <Section id="skills" noise>
      <SectionHeader eyebrow="Skills" title="The tools I build with." subtitle="Languages, frameworks and fundamentals." />

      <div className="grid grid-cols-1 gap-3 sm:gap-2 md:grid-cols-2 md:gap-1 lg:grid-cols-3">
        <Reveal index={0} className="bg-cinematic relative min-h-[240px] overflow-hidden rounded-2xl lg:min-h-[280px]">
          <BackgroundVideo src={ACCENT_VIDEO_URL} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <p className="absolute bottom-0 left-0 p-6 text-lg leading-tight text-cream md:text-xl">
            {total} skills
            <br />
            <span className="text-cream/70">across {skills.length} areas.</span>
          </p>
        </Reveal>

        {skills.map((group, i) => (
          <Reveal key={group.category} index={i + 1} className="flex min-h-[240px] flex-col rounded-2xl bg-card p-6 lg:min-h-[280px]">
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <h3 className="text-lg text-cream md:text-xl">{group.category}.</h3>
              <span className="text-xs tabular-nums text-muted">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <ul className="mt-auto space-y-2.5">
              {group.items.map((skill) => (
                <li key={skill.id} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {skill.name}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
