import { useSearchParams, useLocation } from 'react-router-dom';
import { useLocaleNavigate } from './hooks/useLocaleNavigate';
import { useEffect, useState } from 'react';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from './i18n';
import type { Language } from './i18n';
import { getVisitorsToday, getVisitorsTotal, trackVisitor } from './api/visitorsApi';
import AuthModal from './modals/AuthModal';
import Header from './components/Header';
const faceJa = '/profile_image.webp';
import ShootingStars from './components/ShootingStars';
import { getProjects } from './api/projectsApi';
import type { Project } from './api/projectsApi';

function LandingView() {
  const navigate = useLocaleNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const [adminDenied, setAdminDenied] = useState(() => !!(location.state as { adminAccessDenied?: boolean } | null)?.adminAccessDenied);

  useEffect(() => {
    if (adminDenied) {
      window.history.replaceState({}, '', location.pathname + location.search);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const t = translations[language] ?? translations[DEFAULT_LANGUAGE];
  const [isModalOpen, setIsModalOpen] = useState(() => searchParams.get('auth') === 'login');
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [demosViewMode, setDemosViewMode] = useState<'list' | 'grid'>('list');
  const [portfolioProjects, setPortfolioProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(false);
  const [visitorsCount, setVisitorsCount] = useState<number | null>(null);
  const [visitorsTotalCount, setVisitorsTotalCount] = useState<number | null>(null);
  const [visitorsError, setVisitorsError] = useState<string | null>(null);
  const isLoggedIn = !!localStorage.getItem('auth_token');

  // Keep language in sync when NavBar dispatches language-change events
  useEffect(() => {
    const handler = (event: Event) => {
      const lang = (event as CustomEvent<Language>).detail;
      setLanguage(lang);
    };
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    let active = true;

    const loadVisitorsStats = async () => {
      try {
        const [todayData, totalData] = await Promise.all([
          getVisitorsToday(),
          getVisitorsTotal(),
        ]);
        if (!active) return;
        setVisitorsCount(todayData.visitors);
        setVisitorsTotalCount(totalData.visitors);
      } catch (error) {
        console.error('Failed to load visitors count:', error);
        if (!active) return;
        setVisitorsError('Visitors count unavailable');
      }
    };

    let idleId: ReturnType<typeof setTimeout>;
    if (typeof requestIdleCallback !== 'undefined') {
      idleId = requestIdleCallback(() => { if (active) loadVisitorsStats(); }) as unknown as ReturnType<typeof setTimeout>;
    } else {
      idleId = setTimeout(() => { if (active) loadVisitorsStats(); }, 1000);
    }

    return () => {
      active = false;
      if (typeof requestIdleCallback !== 'undefined') cancelIdleCallback(idleId as unknown as number);
      else clearTimeout(idleId);
    };
  }, []);

  // Track visitor on first visit (once per session)
  useEffect(() => {
    const sessionKey = 'visitor_tracked';
    const alreadyTracked = sessionStorage.getItem(sessionKey);

    if (alreadyTracked) return;

    const trackVisit = async () => {
      try {
        await trackVisitor();
        sessionStorage.setItem(sessionKey, 'true');
      } catch (error) {
        console.error('Failed to track visitor:', error);
      }
    };

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => trackVisit());
    } else {
      setTimeout(trackVisit, 1000);
    }
  }, []);

  useEffect(() => {
    if (!showProjectsModal) return;
    setProjectsLoading(true);
    setProjectsError(false);
    getProjects(1, 50, 'sort_order', 'asc', language)
      .then((res) => { setPortfolioProjects(res.data.filter((p) => p.visibility === 'show')); setProjectsLoading(false); })
      .catch(() => { setProjectsError(true); setProjectsLoading(false); });
  }, [showProjectsModal, language]);

  useEffect(() => {
    if (searchParams.get('auth') !== 'login') return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('auth');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <ShootingStars />
      <Header onLoginClick={() => setIsModalOpen(true)} />

      {adminDenied && (
        <div className="fixed top-20 md:top-32 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-start gap-3 w-full max-w-lg rounded-lg border border-red-500/40 bg-red-900/80 backdrop-blur-sm px-4 py-3 text-sm text-red-200 shadow-lg">
            <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="flex-1">{t.landing.adminAccessDenied}</span>
            <button onClick={() => setAdminDenied(false)} className="text-red-400 hover:text-red-200 transition-colors" aria-label="Dismiss">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <header className="grow flex items-center justify-center px-4 py-12 sm:py-16 mt-20 md:mt-32">
        <div className="text-center w-full max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-bold mb-6">{t.landing.title}</h1>

          {/* ── Spinning coin ── */}
          <div className="flex justify-center mb-8">
            <button
              type="button"
              className="coin-orbit"
              aria-label="View CV"
              title="View CV"
              onClick={() => navigate('/cv')}
            >
              <div className="coin-wrapper">
                <div className="coin-face">
                  <svg viewBox="0 0 140 140" className="absolute inset-0 w-full h-full" fill="none" aria-hidden="true">
                    <circle cx="70" cy="70" r="62" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
                    <circle cx="70" cy="70" r="50" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
                    <circle cx="70" cy="70" r="38" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                  </svg>
                  <span
                    className="relative z-10 font-black select-none"
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '2.4rem',
                      color: 'rgba(120,53,15,0.92)',
                      textShadow: '0 1px 4px rgba(255,255,255,0.45)',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    JA
                  </span>
                  <div className="coin-shine" aria-hidden="true" />
                </div>
                <div className="coin-back" aria-hidden="true">
                  <img src={faceJa} alt="" className="coin-back-photo" />
                  <div className="coin-back-overlay" />
                  <div className="coin-back-rings" />
                  <div className="coin-shine" aria-hidden="true" />
                </div>
              </div>
            </button>
          </div>
          <p className="text-xs text-white/30 -mt-5 mb-8 flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
            </svg>
            {t.landing.coinHint}
          </p>

          <p className="text-lg sm:text-xl text-white/90 mb-2">{t.landing.subtitle}</p>
          <p className="text-base sm:text-lg text-white/60 mb-8">{t.landing.subtitleSecond}</p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 justify-center">
            <button
              onClick={() => navigate('/chat')}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2"
            >
              {/* Chat bubble icon */}
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {t.landing.cta}
            </button>
            {/* Blogs */}
            <button
              onClick={() => navigate('/blogs')}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2zM9 12h6M9 16h4" /></svg>
              {t.blog.blogsCta}
            </button>
            {/* Projects / Demos modal trigger */}
            <button
              onClick={() => setShowProjectsModal(true)}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              {t.landing.projectsCta}
            </button>

            {/* Auth-aware CTA buttons */}
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => navigate('/profile/resumes')}
                  className="w-full sm:w-auto border border-white/30 hover:border-white/60 text-white/80 hover:text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  {t.landing.myResumes}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto border border-white/30 hover:border-white/60 text-white/80 hover:text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                {t.auth.tabLogin}
              </button>
            )}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-sm text-white/60">{t.landing.visitorsDescription}</p>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
              {visitorsError ? (
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70">
                  {visitorsError}
                </div>
              ) : (
                <>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70">
                    {visitorsCount === null ? 'Loading...' : `${t.landing.visitorsToday}: ${visitorsCount}`}
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70">
                    {visitorsTotalCount === null ? 'Loading...' : `${t.landing.visitorsAllTime}: ${visitorsTotalCount}`}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Social Links */}
          <div className="flex justify-center items-center gap-6 mt-8">
            <a
              href="https://github.com/jussipalanen/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <svg
                className="w-8 h-8"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/jussi-alanen-38628a75/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <svg
                className="w-8 h-8"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Projects & Demos modal */}
      {showProjectsModal && (
        <div
          className="fixed inset-0 z-50 flex flex-col lg:flex-row lg:items-center lg:justify-center lg:p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowProjectsModal(false); }}
        >
          <div className="relative w-full flex-1 lg:flex-none lg:max-w-2xl lg:max-h-[85vh] bg-gray-800 lg:border lg:border-gray-700 rounded-none lg:rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-700 shrink-0">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                {t.landing.projectsCta}
              </h2>
              <div className="flex items-center gap-1">
                {/* View mode toggle */}
                <div className="flex items-center rounded-lg border border-white/10 overflow-hidden mr-2">
                  <button
                    onClick={() => setDemosViewMode('list')}
                    className={`flex items-center justify-center w-8 h-8 transition-colors cursor-pointer ${
                      demosViewMode === 'list' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                    aria-label="List view"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                  </button>
                  <button
                    onClick={() => setDemosViewMode('grid')}
                    className={`flex items-center justify-center w-8 h-8 transition-colors cursor-pointer ${
                      demosViewMode === 'grid' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                    aria-label="Grid view"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  </button>
                </div>
                <button
                  onClick={() => setShowProjectsModal(false)}
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Modal body */}
            {projectsLoading ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-sm text-white/40">{t.landing.projectsLoading}</p>
              </div>
            ) : projectsError ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-sm text-red-400">{t.landing.projectsError}</p>
              </div>
            ) : portfolioProjects.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-sm text-white/40">{t.landing.projectsEmpty}</p>
              </div>
            ) : demosViewMode === 'list' ? (
              <div className="overflow-y-auto flex-1 divide-y divide-gray-700">
                {portfolioProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => { if (project.live_url) { window.open(project.live_url, '_blank', 'noopener,noreferrer'); } setShowProjectsModal(false); }}
                    disabled={!project.live_url}
                    className="w-full text-left px-4 sm:px-6 py-4 text-sm text-white hover:bg-gray-700/60 flex flex-col gap-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-default"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 shrink-0 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <div className="flex flex-col">
                        <span className="font-semibold text-base">{project.title}</span>
                        {project.short_description && (
                          <span className="text-xs text-gray-400">{project.short_description}</span>
                        )}
                      </div>
                      {project.live_url && (
                        <svg className="w-4 h-4 ml-auto text-white/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      )}
                    </div>
                    {((project.categories && project.categories.length > 0) || (project.tags && project.tags.length > 0)) && (
                      <div className="flex flex-wrap gap-1.5 pl-8">
                        {project.categories?.map((cat) => (
                          <span key={cat.id} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-teal-500/15 text-teal-300 font-medium">
                            {cat.title}
                          </span>
                        ))}
                        {project.tags?.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: tag.color + '26', color: tag.color, border: `1px solid ${tag.color}55` }}
                          >
                            {tag.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 p-4 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {portfolioProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => { if (project.live_url) { window.open(project.live_url, '_blank', 'noopener,noreferrer'); } setShowProjectsModal(false); }}
                      disabled={!project.live_url}
                      className="flex flex-col items-start gap-3 p-4 bg-gray-700/40 hover:bg-gray-700/80 border border-white/5 hover:border-white/15 rounded-xl transition-colors cursor-pointer text-left disabled:opacity-60 disabled:cursor-default"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-teal-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-sm text-white leading-tight">{project.title}</span>
                        {project.short_description && (
                          <span className="text-xs text-gray-400 leading-tight">{project.short_description}</span>
                        )}
                      </div>
                      {((project.categories && project.categories.length > 0) || (project.tags && project.tags.length > 0)) && (() => {
                        const tagSlice = project.tags?.slice(0, 2) ?? [];
                        const overflow = (project.tags?.length ?? 0) - tagSlice.length + (project.categories && project.categories.length > 1 ? project.categories.length - 1 : 0);
                        return (
                          <div className="flex flex-wrap gap-1">
                            {project.categories && project.categories.length > 0 && (
                              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs bg-teal-500/15 text-teal-300 font-medium">
                                {project.categories[0].title}
                              </span>
                            )}
                            {tagSlice.map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium"
                                style={{ backgroundColor: tag.color + '26', color: tag.color, border: `1px solid ${tag.color}55` }}
                              >
                                {tag.title}
                              </span>
                            ))}
                            {overflow > 0 && (
                              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs bg-white/10 text-white/40">
                                +{overflow}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialTab="login" />
    </div>
  );
}

export default LandingView;
