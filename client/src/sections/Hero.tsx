import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { RESUME_URL, type Profile } from '../api';
import { BackgroundVideo } from '../components/BackgroundVideo';
import { Navbar } from '../components/Navbar';
import { PillButton } from '../components/PillButton';
import { WordsPullUp } from '../components/WordsPullUp';
import { EASE_EXPO, HERO_VIDEO_URL } from '../lib/design';
import { firstSentence } from '../lib/format';

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: EASE_EXPO },
});

export function Hero({ profile }: { profile: Profile }) {
  return (
    <section id="top" className="h-[100svh] min-h-[620px] p-4 md:p-6">
      <div className="bg-cinematic relative h-full w-full overflow-hidden rounded-2xl md:rounded-[2rem]">
        <BackgroundVideo src={HERO_VIDEO_URL} />
        <div aria-hidden className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />

        <Navbar />

        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 lg:p-10">
          <div className="grid grid-cols-12 items-end gap-x-6 gap-y-6">
            <h1 className="col-span-12 text-[15.5vw] font-medium leading-[0.85] tracking-[-0.07em] text-cream sm:text-[13vw] lg:col-span-8 lg:text-[10.4vw]">
              <WordsPullUp text={profile.name} showAsterisk />
            </h1>

            <div className="col-span-12 flex flex-col items-start gap-4 sm:max-w-md lg:col-span-4 lg:max-w-none lg:gap-5 lg:pb-3">
              <motion.p {...fadeUp(0.4)} className="eyebrow">
                {profile.headline}
              </motion.p>
              <motion.p {...fadeUp(0.5)} className="text-xs text-primary/70 sm:text-sm md:text-base" style={{ lineHeight: 1.3 }}>
                {firstSentence(profile.summary)}
              </motion.p>
              <motion.div {...fadeUp(0.7)} className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <PillButton href="#contact">Get in touch</PillButton>
                {profile.has_resume && (
                  <a href={RESUME_URL} className="link-arrow text-cream/90">
                    <Download className="h-4 w-4" aria-hidden />
                    Download resume
                  </a>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
