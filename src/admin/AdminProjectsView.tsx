import { useEffect, useState } from 'react';
import { useLocaleNavigate } from '../hooks/useLocaleNavigate';
import { getAdminProjects, deleteProject } from '../api/projectsApi';
import type { Project } from '../api/projectsApi';
import { getMe } from '../api/authApi';
import { getRoleAccess, PERMISSION_MESSAGE } from '../utils/authUtils';
import Header from '../components/Header';
import { Pagination } from '../components/Pagination';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';
import { buildImageUrl } from '../constants';

const ITEMS_PER_PAGE = 10;

function getPageNumbers(currentPage: number, totalPages: number): number[] {
  const pages: number[] = [];
  const max = 5;
  if (totalPages <= max) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 3) {
    for (let i = 1; i <= 4; i++) pages.push(i);
    pages.push(-1);
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1);
    pages.push(-1);
    for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push(-1);
    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
    pages.push(-1);
    pages.push(totalPages);
  }
  return pages;
}

function AdminProjectsView() {
  const navigate = useLocaleNavigate();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminProjects;
  const tDash = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminDashboard;

  const [projects, setProjects] = useState<Project[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) { setAuthError(t.authErrLogin); setLoading(false); return; }
        const me = await getMe();
        const access = getRoleAccess(me);
        if (!access.isAdmin && !access.isVendor) { setAuthError(PERMISSION_MESSAGE); setLoading(false); return; }
      } catch {
        setAuthError(t.authErrLogin);
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loadProjects = async (page: number = currentPage) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminProjects(page, ITEMS_PER_PAGE);
      setProjects(res.data);
      setTotalPages(res.last_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authError) return;
    loadProjects(currentPage);
  }, [currentPage, authError]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openCreateForm = () => { setEditingProject(null); setShowForm(true); };
  const openEditForm = (project: Project) => { setEditingProject(project); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingProject(null); };

  const handleSaved = async () => {
    closeForm();
    await loadProjects(editingProject ? currentPage : 1);
    if (!editingProject) setCurrentPage(1);
  };

  const handleDeleteClick = (project: Project) => setProjectToDelete(project);
  const handleDeleteCancel = () => { if (!deleting) setProjectToDelete(null); };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteProject(projectToDelete.id);
      setProjectToDelete(null);
      const newPage = projects.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(newPage);
      await loadProjects(newPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errDelete);
      setProjectToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header
        title={t.title}
        backLabel={translations[language].adminDashboard.title}
        onBack={() => navigate('/admin')}
      />

      <main className="container mx-auto px-4 py-8">
        {authError && (
          <div className="mx-auto max-w-2xl rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-6 text-center">
            <p className="text-lg text-yellow-300 mb-4">{authError === PERMISSION_MESSAGE ? tDash.permissionDenied : authError}</p>
            {authError !== PERMISSION_MESSAGE && (
              <button
                onClick={() => navigate('/demo/ecommerce/products')}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {t.goToProducts}
              </button>
            )}
          </div>
        )}

        {loading && !authError && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
            <p className="mt-4 text-gray-300">{t.loading}</p>
          </div>
        )}

        {error && !loading && !authError && (
          <div className="mx-auto max-w-2xl rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 mb-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {!loading && !authError && (
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t.title}</h2>
              <button
                onClick={openCreateForm}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t.btnAdd}
              </button>
            </div>

            {!loading && !error && projects.length === 0 && (
              <div className="text-center py-10 text-gray-400">{t.empty}</div>
            )}

            {projects.length > 0 && (
              <div className="flex flex-col gap-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-start gap-4 rounded-xl border border-gray-700 bg-gray-800 px-5 py-4 hover:border-gray-600 transition-colors"
                  >
                    {project.feature_image && (
                      <img
                        src={buildImageUrl(project.feature_image)}
                        alt={project.title}
                        className="shrink-0 w-16 h-16 rounded-lg object-cover border border-gray-700"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-white truncate">{project.title}</span>
                        <span
                          className={`text-xs rounded-full px-2 py-0.5 font-medium ${project.visibility === 'show'
                            ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                            : 'bg-gray-700/50 text-gray-400 border border-gray-600/40'
                            }`}
                        >
                          {project.visibility === 'show' ? t.labelPublished : t.labelHidden}
                        </span>
                        {project.categories && project.categories.length > 0 && (
                          <span className="text-xs rounded-full px-2 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30">
                            {project.categories[0].title}
                          </span>
                        )}
                      </div>
                      {project.short_description && (
                        <p className="text-sm text-gray-400 truncate">{project.short_description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                        {project.tags && project.tags.length > 0 && (
                          <span>{project.tags.slice(0, 4).map((t) => t.title).join(', ')}{project.tags.length > 4 ? ` +${project.tags.length - 4}` : ''}</span>
                        )}
                        <span className="font-mono">#{project.id}</span>
                        {project.sort_order != null && (
                          <span>{t.labelSortOrder}: {project.sort_order}</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {project.live_url && (
                        <a
                          href={project.live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-blue-500/60 px-3 py-1.5 text-sm font-semibold text-blue-300 hover:bg-blue-600/20 transition-colors"
                        >
                          {t.btnView}
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditForm(project)}
                        className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-semibold text-gray-300 hover:bg-gray-700/60 transition-colors"
                      >
                        {t.btnEdit}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(project)}
                        className="rounded-lg border border-red-500/60 px-3 py-1.5 text-sm font-semibold text-red-300 hover:bg-red-600/20 transition-colors"
                      >
                        {t.btnDelete}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              pageNumbers={getPageNumbers(currentPage, totalPages)}
              previousLabel={t.previousPage}
              nextLabel={t.nextPage}
            />
          </div>
        )}
      </main>

      {showForm && (
        <ProjectFormModal
          project={editingProject}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-lg" role="dialog" aria-modal="true">
            <h2 className="text-xl font-semibold text-white">{t.deleteTitle}</h2>
            <p className="mt-3 text-sm text-gray-300">
              {t.deleteConfirm.replace('{title}', projectToDelete.title)}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? t.btnDeleting : t.btnConfirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProjectsView;
