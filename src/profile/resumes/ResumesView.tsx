import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteResume, copyResume, exportResumePdf, exportResumeHtml, getResumes } from '../../api/resumesApi';
import type { Resume } from '../../api/resumesApi';
import NavBar from '../../components/NavBar';

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ResumesView() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [openExportMenuId, setOpenExportMenuId] = useState<number | null>(null);
  const [copyingId, setCopyingId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }
    loadResumes();
  }, [navigate]);

  const loadResumes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getResumes();
      setResumes(data);
    } catch (err) {
      console.error('Failed to load resumes:', err);
      setError('Failed to load resumes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (id: number) => {
    setCopyingId(id);
    setError(null);
    try {
      const created = await copyResume(id);
      setResumes((prev) => [...prev, created]);
    } catch (err) {
      console.error('Failed to copy resume:', err);
      setError('Failed to copy resume. Please try again.');
    } finally {
      setCopyingId(null);
    }
  };

  const handleExport = async (id: number, format: 'pdf' | 'html') => {
    setOpenExportMenuId(null);
    setExportingId(id);
    setExportError(null);
    try {
      if (format === 'pdf') await exportResumePdf(id);
      else await exportResumeHtml(id);
    } catch (err) {
      console.error(`Failed to export ${format.toUpperCase()}:`, err);
      setExportError(`Failed to export ${format.toUpperCase()}. Please try again.`);
    } finally {
      setExportingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteResume(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete resume:', err);
      setError('Failed to delete resume. Please try again.');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <NavBar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-12">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">My Resumes</h1>
            <p className="text-sm text-white/50 mt-1">Manage your resume profiles</p>
          </div>
          <button
            onClick={() => navigate('/profile/resumes/new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Resume
          </button>
        </div>

        {/* Error */}
        {(error || exportError) && (
          <div className="mb-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
            {error || exportError}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <svg className="w-8 h-8 text-white/30 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && resumes.length === 0 && (
          <div className="text-center py-20">
            <svg className="w-14 h-14 text-white/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-white/40 mb-4">No resumes yet</p>
            <button
              onClick={() => navigate('/profile/resumes/new')}
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              Create your first resume →
            </button>
          </div>
        )}

        {/* Resume list */}
        {!loading && resumes.length > 0 && (
          <ul className="space-y-3">
            {resumes.map((resume) => (
              <li
                key={resume.id}
                className="bg-gray-800 border border-gray-700 rounded-xl px-5 py-4 flex items-start sm:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">{resume.title || '(Untitled)'}</p>
                    {resume.language && (
                      <span className="shrink-0 text-xs font-medium uppercase tracking-wide bg-gray-700 text-white/60 px-1.5 py-0.5 rounded">
                        {resume.language}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/50 mt-0.5 truncate">{resume.full_name}</p>
                  {resume.updated_at && (
                    <p className="text-xs text-white/30 mt-1">Updated {formatDate(resume.updated_at)}</p>
                  )}
                </div>

                {confirmDeleteId === resume.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm text-white/60">Delete?</span>
                    <button
                      onClick={() => handleDelete(resume.id)}
                      disabled={deletingId === resume.id}
                      className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === resume.id ? 'Deleting…' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    {openExportMenuId !== null && (
                      <div className="fixed inset-0 z-10" onClick={() => setOpenExportMenuId(null)} />
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setOpenExportMenuId(openExportMenuId === resume.id ? null : resume.id)}
                        disabled={exportingId === resume.id}
                        className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        title="Export resume"
                      >
                        {exportingId === resume.id ? (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        Export
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openExportMenuId === resume.id && (
                        <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-20 min-w-28">
                          <button
                            onClick={() => handleExport(resume.id, 'pdf')}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PDF
                          </button>
                          <button
                            onClick={() => handleExport(resume.id, 'html')}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            HTML
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(resume.id)}
                      disabled={copyingId === resume.id}
                      className="flex items-center gap-1.5 text-sm text-yellow-400 hover:text-yellow-300 bg-yellow-900/20 hover:bg-yellow-900/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      title="Duplicate resume"
                    >
                      {copyingId === resume.id ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                      Copy
                    </button>
                    <button
                      onClick={() => navigate(`/profile/resumes/${resume.id}`)}
                      className="flex items-center gap-1.5 text-sm text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(resume.id)}
                      className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default ResumesView;
