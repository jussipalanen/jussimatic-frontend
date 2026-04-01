import { useEffect, useState } from 'react';
import { useLocaleNavigate } from './hooks/useLocaleNavigate';
import Header from './components/Header';
import Breadcrumb from './components/Breadcrumb';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from './i18n';
import type { Language } from './i18n';
import { PROFICIENCY_LEVELS } from './constants';

// ---------------------------------------------------------------------------
// Types (matching the API response shape)
// ---------------------------------------------------------------------------

interface WorkExperience {
  id: number;
  job_title: string;
  company_name: string;
  location?: string;
  start_date: string;
  end_date?: string | null;
  is_current?: boolean;
  description?: string;
}

interface Education {
  id: number;
  degree: string;
  field_of_study: string;
  institution_name: string;
  location?: string;
  graduation_year?: number;
  gpa?: string | number;
}

interface Skill {
  id: number;
  category: string;
  name: string;
  proficiency: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
  technologies?: string[];
  live_url?: string | null;
  github_url?: string | null;
}

interface Certification {
  id: number;
  name: string;
  issuing_organization: string;
  issue_date?: string;
}

interface ResumeLanguage {
  id: number;
  language: string;
  proficiency: string;
}

interface Award {
  id: number;
  title: string;
  issuer?: string;
  date?: string;
  description?: string;
}

interface Recommendation {
  id: number;
  full_name: string;
  title?: string;
  company?: string;
  recommendation: string;
}

interface Resume {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  github_url?: string;
  photo?: string | null;
  summary?: string;
  work_experiences?: WorkExperience[];
  educations?: Education[];
  skills?: Skill[];
  projects?: Project[];
  certifications?: Certification[];
  languages?: ResumeLanguage[];
  awards?: Award[];
  recommendations?: Recommendation[];
  lang?: string;
  show_skill_levels?: boolean;
  show_language_levels?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
}

function formatProficiency(p: string): string {
  return p
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCategory(cat: string): string {
  const map: Record<string, string> = {
    programming_languages: 'Programming Languages',
    frameworks: 'Frameworks',
    databases: 'Databases',
    cloud: 'Cloud',
    tools: 'Tools',
    soft_skills: 'Soft Skills',
    orm_data_access: 'ORM / Data Access',
    testing: 'Testing',
    devops: 'DevOps',
    design: 'Design',
    other: 'Other',
  };
  return map[cat] ?? formatProficiency(cat);
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40 whitespace-nowrap">
        {label}
      </h2>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Proficiency dot indicator
// ---------------------------------------------------------------------------

function ProficiencyDots({ proficiency }: { proficiency: string }) {
  const level = PROFICIENCY_LEVELS[proficiency] ?? 3;
  return (
    <span className="flex items-center gap-0.5 ml-auto shrink-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= level ? 'bg-emerald-400' : 'bg-white/15'}`}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

import { buildImageUrl } from './constants';

function resolvePhoto(photo?: string | null): string | null {
  if (!photo) return null;
  if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
  return buildImageUrl(photo);
}

export default function CVView() {
  const navigate = useLocaleNavigate();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uiLanguage, setUiLanguage] = useState<Language>(() => getStoredLanguage());

  useEffect(() => {
    const handler = (event: Event) => {
      setUiLanguage((event as CustomEvent<Language>).detail);
    };
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  const cvLanguage = (resume?.lang ?? DEFAULT_LANGUAGE) as Language;
  const t = (translations[cvLanguage] ?? translations[DEFAULT_LANGUAGE]).cv;
  const tUi = (translations[uiLanguage] ?? translations[DEFAULT_LANGUAGE]).cv;

  useEffect(() => {
    const endpoint = import.meta.env.VITE_CV_ENDPOINT as string | undefined;
    if (!endpoint) {
      setError((translations[DEFAULT_LANGUAGE]).cv.errMissingEndpoint);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(endpoint, { headers: { Accept: 'application/json' } })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(`Failed to load CV: ${res.status}`);
        setResume(data as Resume);
      })
      .catch((err: unknown) => {
        console.error(err);
        setError((translations[DEFAULT_LANGUAGE]).cv.errLoad);
      })
      .finally(() => setLoading(false));
  }, []);

  // Group skills by category
  const skillsByCategory =
    resume?.skills?.reduce<Record<string, Skill[]>>((acc, skill) => {
      const key = skill.category || 'other';
      (acc[key] ??= []).push(skill);
      return acc;
    }, {}) ?? {};

  return (
    <div className="min-h-screen text-white">
      <Header />

      <main className="max-w-4xl mx-auto px-4 pt-24 md:pt-32 pb-20 sm:px-6">
        <div className="mb-8">
          <Breadcrumb
            items={[{ label: tUi.breadcrumbHome, onClick: () => navigate('/') }]}
            current={tUi.breadcrumbCurrent}
          />
        </div>
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-32 text-white/50">
            <svg className="w-12 h-12 mx-auto mb-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {/* CV Content */}
        {!loading && resume && (
          <article className="space-y-14">

            {/* ── Header ── */}
            <header className="flex flex-col sm:flex-row sm:items-start gap-6">
              {resolvePhoto(resume.photo) && (
                <img
                  src={resolvePhoto(resume.photo)!}
                  alt={resume.full_name}
                  className="w-24 h-24 rounded-2xl object-cover border border-white/10 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-1">
                  {resume.full_name}
                </h1>

                {/* Contact row */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-white/50">
                  {resume.email && (
                    <a href={`mailto:${resume.email}`} className="hover:text-white transition-colors flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {resume.email}
                    </a>
                  )}
                  {resume.phone && (
                    <a href={`tel:${resume.phone}`} className="hover:text-white transition-colors flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {resume.phone}
                    </a>
                  )}
                  {resume.location && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {resume.location}
                    </span>
                  )}
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-3 mt-3">
                  {resume.linkedin_url && (
                    <a href={resume.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                      LinkedIn
                    </a>
                  )}
                  {resume.github_url && (
                    <a href={resume.github_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      GitHub
                    </a>
                  )}
                  {resume.portfolio_url && (
                    <a href={resume.portfolio_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Portfolio
                    </a>
                  )}
                </div>
              </div>
            </header>

            {/* ── Summary ── */}
            {resume.summary && (
              <section>
                <SectionHeading label={t.sectionAbout} />
                <p className="text-white/70 leading-relaxed whitespace-pre-line">{resume.summary}</p>
              </section>
            )}

            {/* ── Work Experience ── */}
            {resume.work_experiences && resume.work_experiences.length > 0 && (
              <section>
                <SectionHeading label={t.sectionExperience} />
                <div className="space-y-8">
                  {resume.work_experiences.map((exp) => (
                    <div key={exp.id} className="relative pl-5 border-l border-white/10">
                      <div className="absolute -left-1 top-1.5 w-2 h-2 rounded-full bg-emerald-400/70" />
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 mb-1">
                        <h3 className="font-semibold text-white">{exp.job_title}</h3>
                        <span className="text-xs text-white/35 shrink-0">
                          {formatDate(exp.start_date)} – {exp.is_current ? t.present : formatDate(exp.end_date ?? undefined)}
                        </span>
                      </div>
                      <p className="text-sm text-emerald-400/80 mb-2">
                        {exp.company_name}{exp.location ? ` · ${exp.location}` : ''}
                      </p>
                      {exp.description && (
                        <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Education ── */}
            {resume.educations && resume.educations.length > 0 && (
              <section>
                <SectionHeading label={t.sectionEducation} />
                <div className="space-y-6">
                  {resume.educations.map((ed) => (
                    <div key={ed.id} className="relative pl-5 border-l border-white/10">
                      <div className="absolute -left-1 top-1.5 w-2 h-2 rounded-full bg-blue-400/70" />
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 mb-1">
                        <h3 className="font-semibold text-white">{ed.degree}</h3>
                        {ed.graduation_year && (
                          <span className="text-xs text-white/35 shrink-0">{ed.graduation_year}</span>
                        )}
                      </div>
                      <p className="text-sm text-blue-400/80">
                        {ed.field_of_study} · {ed.institution_name}
                        {ed.location ? `, ${ed.location}` : ''}
                      </p>
                      {ed.gpa && (
                        <p className="text-xs text-white/40 mt-1">{t.gpa}: {ed.gpa}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Skills ── */}
            {Object.keys(skillsByCategory).length > 0 && (
              <section>
                <SectionHeading label={t.sectionSkills} />
                <div className="space-y-5">
                  {Object.entries(skillsByCategory).map(([cat, skills]) => (
                    <div key={cat}>
                      <p className="text-xs text-white/35 uppercase tracking-wider mb-2">
                        {formatCategory(cat)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill) => (
                          <span
                            key={skill.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70"
                          >
                            {skill.name}
                            {resume.show_skill_levels && <ProficiencyDots proficiency={skill.proficiency} />}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Projects ── */}
            {resume.projects && resume.projects.length > 0 && (
              <section>
                <SectionHeading label={t.sectionProjects} />
                <div className="grid gap-4 sm:grid-cols-2">
                  {resume.projects.map((proj) => (
                    <div key={proj.id} className="rounded-xl border border-white/10 bg-white/3 p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-white">{proj.name}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          {proj.github_url && (
                            <a href={proj.github_url} target="_blank" rel="noopener noreferrer"
                              className="text-white/30 hover:text-white transition-colors"
                              aria-label="GitHub"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                              </svg>
                            </a>
                          )}
                          {proj.live_url && (
                            <a href={proj.live_url} target="_blank" rel="noopener noreferrer"
                              className="text-white/30 hover:text-emerald-400 transition-colors"
                              aria-label="Live site"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                      {proj.description && (
                        <p className="text-xs text-white/55 leading-relaxed">{proj.description}</p>
                      )}
                      {proj.technologies && proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                          {proj.technologies.map((tech) => (
                            <span key={tech} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/80">
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Certifications ── */}
            {resume.certifications && resume.certifications.length > 0 && (
              <section>
                <SectionHeading label={t.sectionCertifications} />
                <div className="space-y-3">
                  {resume.certifications.map((cert) => (
                    <div key={cert.id} className="flex items-baseline justify-between gap-4">
                      <div>
                        <span className="font-medium text-white/90 text-sm">{cert.name}</span>
                        <span className="text-white/40 text-sm"> · {cert.issuing_organization}</span>
                      </div>
                      {cert.issue_date && (
                        <span className="text-xs text-white/30 shrink-0">{formatDate(cert.issue_date)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Languages ── */}
            {resume.languages && resume.languages.length > 0 && (
              <section>
                <SectionHeading label={t.sectionLanguages} />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {resume.languages.map((lang) => (
                    <div key={lang.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/3 px-3 py-2">
                      <span className="text-sm text-white/80">{lang.language}</span>
                      {resume.show_language_levels && <ProficiencyDots proficiency={lang.proficiency} />}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Awards ── */}
            {resume.awards && resume.awards.length > 0 && (
              <section>
                <SectionHeading label={t.sectionAwards} />
                <div className="space-y-5">
                  {resume.awards.map((award) => (
                    <div key={award.id} className="relative pl-5 border-l border-white/10">
                      <div className="absolute -left-1 top-1.5 w-2 h-2 rounded-full bg-yellow-400/70" />
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 mb-1">
                        <h3 className="font-semibold text-white">{award.title}</h3>
                        {award.date && (
                          <span className="text-xs text-white/35 shrink-0">{formatDate(award.date)}</span>
                        )}
                      </div>
                      {award.issuer && <p className="text-sm text-yellow-400/70 mb-1">{award.issuer}</p>}
                      {award.description && (
                        <p className="text-sm text-white/55 leading-relaxed">{award.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Recommendations ── */}
            {resume.recommendations && resume.recommendations.length > 0 && (
              <section>
                <SectionHeading label={t.sectionRecommendations} />
                <div className="grid gap-4 sm:grid-cols-2">
                  {resume.recommendations.map((rec) => (
                    <blockquote key={rec.id} className="rounded-xl border border-white/10 bg-white/3 p-5 flex flex-col gap-3">
                      <p className="text-sm text-white/65 leading-relaxed italic">
                        &ldquo;{rec.recommendation}&rdquo;
                      </p>
                      <footer className="mt-auto">
                        <p className="text-sm font-semibold text-white/90">{rec.full_name}</p>
                        {(rec.title || rec.company) && (
                          <p className="text-xs text-white/40">
                            {[rec.title, rec.company].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </section>
            )}

          </article>
        )}
      </main>
    </div>
  );
}
