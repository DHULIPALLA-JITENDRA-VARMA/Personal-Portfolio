import type { Profile } from '../api';
import { ScrollRevealText } from '../components/ScrollRevealText';
import { WordsPullUpMultiStyle, type Segment } from '../components/WordsPullUpMultiStyle';

// "I am <name>, <first headline part in italic serif> · <remaining parts>" - built from the profile.
function headingSegments(profile: Profile): Segment[] {
  const [first, ...rest] = profile.headline.split('·').map((part) => part.trim()).filter(Boolean);
  const segments: Segment[] = [{ text: `I am ${profile.name},`, className: 'font-normal' }];
  if (first) segments.push({ text: rest.length ? first : `${first}.`, className: 'font-serif italic' });
  rest.forEach((part, i) => segments.push({ text: `& ${part}${i === rest.length - 1 ? '.' : ''}`, className: 'font-normal' }));
  return segments;
}

export function About({ profile }: { profile: Profile }) {
  return (
    <section id="about" className="bg-black px-4 py-10 md:px-6 md:py-16">
      <div className="mx-auto max-w-6xl rounded-2xl bg-surface px-6 py-16 text-center sm:px-10 md:rounded-[2rem] md:py-24 lg:py-28">
        <p className="eyebrow mb-8 md:mb-10">{profile.location || 'About'}</p>
        <h2 className="mx-auto max-w-4xl text-3xl leading-[1] text-cream sm:text-4xl sm:leading-[0.95] md:text-5xl lg:text-6xl">
          <WordsPullUpMultiStyle segments={headingSegments(profile)} />
        </h2>
        <ScrollRevealText
          text={profile.summary}
          className="mx-auto mt-10 max-w-xl text-sm leading-relaxed text-primary md:mt-14 md:text-base"
        />
      </div>
    </section>
  );
}
