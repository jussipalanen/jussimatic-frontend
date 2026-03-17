import { useEffect, useState } from 'react';
import { getCategories, deleteCategory } from '../api/blogsApi';
import type { BlogCategory } from '../api/blogsApi';
import { getMe } from '../api/authApi';
import { getRoleAccess } from '../utils/authUtils';
import { BlogCategoryModal } from '../components/BlogCategoryModal';
import NavBar from '../components/NavBar';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';

function BlogCategoriesView() {
    const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
    const t = translations[language] ?? translations[DEFAULT_LANGUAGE];

    const [categories, setCategories] = useState<BlogCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Modal state: undefined = closed, null = creating, BlogCategory = editing
    const [editingCategory, setEditingCategory] = useState<BlogCategory | null | undefined>(undefined);

    // Delete confirmation
    const [categoryToDelete, setCategoryToDelete] = useState<BlogCategory | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const handler = (event: Event) => {
            setLanguage((event as CustomEvent<Language>).detail);
        };
        window.addEventListener('jussimatic-language-change', handler);
        return () => window.removeEventListener('jussimatic-language-change', handler);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        getMe()
            .then((me) => setIsAdmin(getRoleAccess(me).isAdmin))
            .catch(() => { });
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getCategories();
            setCategories(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : t.adminBlogs.errLoad);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleDelete = async () => {
        if (!categoryToDelete) return;
        setDeleting(true);
        try {
            await deleteCategory(categoryToDelete.id);
            setCategoryToDelete(null);
            await loadCategories();
        } catch (err) {
            setError(err instanceof Error ? err.message : t.adminBlogs.errDelete);
        } finally {
            setDeleting(false);
        }
    };

    const handleSaved = () => {
        setEditingCategory(null);
        loadCategories();
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gray-950">
                <NavBar />
                <main className="container mx-auto px-4 py-8 mt-20">
                    <div className="mx-auto max-w-2xl rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-6 text-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="mx-auto h-16 w-16 text-yellow-500 mb-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                        <p className="text-lg text-yellow-300">{t.adminBlogs.authErrLogin}</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950">
            <NavBar />
            <div className="container mx-auto px-4 py-8 mt-20">
                <div className="mx-auto max-w-4xl">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white">{t.adminBlogs.categoryListTitle}</h1>
                            <p className="text-gray-400 mt-1">{t.adminBlogs.blogCategoriesDesc}</p>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={() => setEditingCategory(null)}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors whitespace-nowrap"
                            >
                                {t.adminBlogs.btnAddCategory}
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3">
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-12">
                            <p className="text-gray-400">{t.adminBlogs.loading}</p>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="rounded-lg border border-gray-700 bg-gray-900 px-6 py-12 text-center">
                            <p className="text-gray-400">{t.adminBlogs.empty}</p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-gray-700 bg-gray-900 shadow-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-700 bg-gray-800">
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">
                                                {t.adminBlogs.lblCategoryName}
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">
                                                {t.adminBlogs.labelSlug}
                                            </th>
                                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-200">
                                                {t.adminBlogs.actions}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {categories.map((category) => (
                                            <tr key={category.id} className="hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-white font-medium">{category.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-400 font-mono">{category.slug}</td>
                                                <td className="px-6 py-4 text-right text-sm">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingCategory(category)}
                                                            className="rounded px-3 py-2 text-xs font-medium text-blue-400 hover:bg-blue-900/30 transition-colors"
                                                        >
                                                            {t.adminBlogs.btnEdit}
                                                        </button>
                                                        <button
                                                            onClick={() => setCategoryToDelete(category)}
                                                            className="rounded px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-900/30 transition-colors"
                                                        >
                                                            {t.adminBlogs.btnDelete}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit/Create Modal */}
            {editingCategory !== undefined && (
                <BlogCategoryModal
                    category={editingCategory}
                    onClose={() => setEditingCategory(undefined)}
                    onSaved={handleSaved}
                />
            )}

            {/* Delete Confirmation */}
            {categoryToDelete && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !deleting) setCategoryToDelete(null);
                    }}
                >
                    <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
                        <div className="border-b border-gray-700 px-6 py-4">
                            <h2 className="text-lg font-semibold text-white">{t.adminBlogs.deleteTitle}</h2>
                        </div>
                        <div className="px-6 py-4">
                            <p className="text-sm text-gray-300">
                                {t.adminBlogs.deleteConfirm.replace('{title}', categoryToDelete.name)}
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-gray-700 px-6 py-4">
                            <button
                                onClick={() => setCategoryToDelete(null)}
                                disabled={deleting}
                                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
                            >
                                {t.adminBlogs.btnCancel}
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                            >
                                {deleting ? t.adminBlogs.btnDeleting : t.adminBlogs.btnConfirmDelete}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BlogCategoriesView;
