import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBlog } from '../api/blogsApi';
import type { Blog } from '../api/blogsApi';
import Header from '../components/Header';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';
import DOMPurify from 'dompurify';
import './blog-content.css';

const STORAGE_BASE_URL = (import.meta.env.VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

function buildImageUrl(path: string) {
  return `${STORAGE_BASE_URL}/${path.replace(/^\/+/, '')}`;
}

function BlogView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = translations[language] ?? translations[DEFAULT_LANGUAGE];

  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      setLanguage((event as CustomEvent<Language>).detail);
    };
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    if (!id) return;

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getBlog(id);
        if (!active) return;
        setBlog(res);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error && err.message === 'NOT_FOUND' ? 'NOT_FOUND' : (err instanceof Error ? err.message : t.blog.errorLoading));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [id, t.blog.errorLoading]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(new Date(dateStr));
  };

  const renderContent = (content: string) => {
    const isPlainText = !/<[a-z][\s\S]*>/i.test(content);
    const html = isPlainText
      ? content
          .split(/\n\n+/)
          .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
          .join('')
      : content
          // Collapse 3+ consecutive empty paragraphs to 2
          .replace(/(<p>(\s|&nbsp;)*<\/p>\s*){3,}/gi, '<p><br></p><p><br></p>')
          // Give single empty paragraphs a <br> so they render with visible height
          .replace(/<p>(\s|&nbsp;)*<\/p>/gi, '<p><br></p>');
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'b', 'strong', 'i', 'em', 's', 'p', 'br', 'a', 'blockquote', 'code', 'pre', 'img', 'hr'],
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt'],
    });
  };

  const parseTags = (tags: string[] | null | undefined): string[] => {
    if (!tags || tags.length === 0) return [];
    return tags;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col pt-20 md:pt-32">
      <Header />

      <main className="grow p-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/blogs')}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.blog.back}
          </button>

          {loading && (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-400">{t.blog.loading}</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
              <p className="text-red-400">{error === 'NOT_FOUND' ? t.blog.blogNotFound : error}</p>
            </div>
          )}

          {!loading && !error && blog && (
            <article className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              {/* Feature image */}
              {blog.featured_image && (
                <img
                  src={buildImageUrl(blog.featured_image)}
                  alt={blog.title}
                  className="w-full h-56 object-cover"
                />
              )}

              <div className="p-6">
                {/* Category */}
                {blog.category && (
                  <span className="inline-block bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-full px-3 py-0.5 text-xs font-medium mb-3">
                    {blog.category.name}
                  </span>
                )}

                <h1 className="text-2xl font-bold text-white mb-3">{blog.title}</h1>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-6">
                  {blog.author && (
                    <span>{blog.author.first_name} {blog.author.last_name}</span>
                  )}
                  {blog.created_at && (
                    <span>{formatDate(blog.created_at)}</span>
                  )}
                </div>

                {/* Content */}
                {blog.content ? (
                  <div
                    className="blog-content"
                    dangerouslySetInnerHTML={{ __html: renderContent(blog.content) }}
                  />
                ) : blog.excerpt ? (
                  <p className="text-gray-300 leading-relaxed">{blog.excerpt}</p>
                ) : null}

                {/* Tags */}
                {parseTags(blog.tags).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-gray-700">
                    {parseTags(blog.tags).map((tag) => (
                      <span key={tag} className="bg-gray-700 text-gray-300 rounded-full px-3 py-0.5 text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          )}
        </div>
      </main>
    </div>
  );
}

export default BlogView;
