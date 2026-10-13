import { MotionConfig } from 'framer-motion';
import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { trackPageView } from './api';
import { PageState } from './components/PageState';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

// The admin area (and its charting library) is a separate chunk that public visitors never download.
const AdminApp = lazy(() => import('./admin/AdminApp'));
// Carries the markdown renderer + sanitiser, which the home page does not need.
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));

function PageViewTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    // reducedMotion="user": transforms are skipped for visitors who ask for less motion.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <PageViewTracker />
        <Suspense fallback={<PageState title="Loading" loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects/:slug" element={<ProjectDetail />} />
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </MotionConfig>
  );
}
