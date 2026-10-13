import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PageState } from '../components/PageState';
import { Seo } from '../components/Seo';
import { usePortfolio } from '../lib/usePortfolio';
import { About } from '../sections/About';
import { Contact } from '../sections/Contact';
import { Credentials } from '../sections/Credentials';
import { Footer } from '../sections/Footer';
import { Hero } from '../sections/Hero';
import { Projects } from '../sections/Projects';
import { Repos } from '../sections/Repos';
import { Skills } from '../sections/Skills';
import { EducationSection, ExperienceSection } from '../sections/Timeline';

export default function Home() {
  const { data, error, loading, retry } = usePortfolio();
  const { hash } = useLocation();

  // Arriving from another route with /#section: scroll once the sections exist.
  const interacted = useRef(false);
  const scrollToHash = useCallback(() => {
    if (!hash || interacted.current) return;
    requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'auto' }));
  }, [hash]);

  useEffect(() => {
    if (data) scrollToHash();
  }, [data, scrollToHash]);

  // Late-loading content (the GitHub list) shifts the page, so the target is re-anchored once it
  // settles - unless the visitor has already started scrolling on their own.
  useEffect(() => {
    const stop = () => {
      interacted.current = true;
    };
    const events = ['wheel', 'touchmove', 'keydown', 'mousedown'] as const;
    events.forEach((e) => window.addEventListener(e, stop, { passive: true, once: true }));
    return () => events.forEach((e) => window.removeEventListener(e, stop));
  }, []);

  if (loading) return <PageState title="Loading portfolio" loading />;
  if (error || !data) {
    return (
      <PageState title="The portfolio could not be loaded.">
        <p>{error}</p>
        <button type="button" className="btn-ghost mt-6" onClick={retry}>
          Try again
        </button>
      </PageState>
    );
  }

  const { profile } = data;
  return (
    <>
      <Seo profile={profile} />
      <a href="#about" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-black">
        Skip to content
      </a>
      <main>
        <Hero profile={profile} />
        <About profile={profile} />
        <Skills skills={data.skills} />
        <Projects projects={data.projects} />
        <Repos githubUrl={profile.github_url} onSettled={scrollToHash} />
        <ExperienceSection experience={data.experience} />
        <EducationSection education={data.education} />
        <Credentials certifications={data.certifications} achievements={data.achievements} />
        <Contact profile={profile} />
      </main>
      <Footer profile={profile} />
    </>
  );
}
