import { useEffect, useState, type FormEvent } from 'react';
import { createCategory, updateCategory } from '../api/blogsApi';
import type { BlogCategory, BlogCategoryFormData } from '../api/blogsApi';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';

interface CategoryFormState {
    name: string;
    slug: string;
}

const EMPTY_FORM: CategoryFormState = {
    name: '',
    slug: '',
};

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

interface BlogCategoryModalProps {
    /** Pass a category to edit, null to create */
    category: BlogCategory | null;
    onClose: () => void;
    onSaved: () => void;
}

export function BlogCategoryModal({ category, onClose, onSaved }: BlogCategoryModalProps) {
    const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
    const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminBlogs;

    const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
        window.addEventListener('jussimatic-language-change', handler);
        return () => window.removeEventListener('jussimatic-language-change', handler);
    }, []);

    // Populate form when editing
    useEffect(() => {
        if (category) {
            setForm({
                name: category.name,
                slug: category.slug,
            });
        } else {
            setForm(EMPTY_FORM);
        }
        setFormError(null);
        setSlugManuallyEdited(false);
    }, [category]);

    // Auto-generate slug when name changes if slug hasn't been manually edited
    useEffect(() => {
        if (!slugManuallyEdited && form.name.trim()) {
            setForm((f) => ({ ...f, slug: generateSlug(f.name) }));
        }
    }, [form.name, slugManuallyEdited]);

    const close = () => {
        if (submitting) return;
        onClose();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setFormError(t.errTitleRequired);
            return;
        }
        setSubmitting(true);
        setFormError(null);
        try {
            const payload: BlogCategoryFormData = {
                name: form.name.trim(),
                slug: form.slug.trim() || undefined,
            };
            if (category) {
                await updateCategory(category.id, payload);
            } else {
                await createCategory(payload);
            }
            onSaved();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : t.errSave);
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls =
        'w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none';
    const labelCls = 'block text-sm font-medium text-gray-300 mb-1';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) close();
            }}
        >
            <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold text-white">
                        {category ? t.editCategoryTitle : t.createCategoryTitle}
                    </h2>
                    <button
                        type="button"
                        onClick={close}
                        disabled={submitting}
                        className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    {/* Name */}
                    <div>
                        <label className={labelCls}>
                            {t.labelCategoryName} <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            className={inputCls}
                            placeholder={t.placeholderCategoryName}
                            required
                        />
                    </div>

                    {/* Slug */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className={labelCls}>{t.labelSlug}</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setForm((f) => ({ ...f, slug: generateSlug(f.name) }));
                                    setSlugManuallyEdited(true);
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Auto-generate
                            </button>
                        </div>
                        <input
                            type="text"
                            value={form.slug}
                            onChange={(e) => {
                                setForm((f) => ({ ...f, slug: e.target.value }));
                                setSlugManuallyEdited(true);
                            }}
                            className={inputCls}
                            placeholder={t.placeholderSlug}
                        />
                    </div>

                    {formError && (
                        <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3">
                            <p className="text-sm text-red-300">{formError}</p>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={close}
                            disabled={submitting}
                            className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
                        >
                            {t.btnCancel}
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                        >
                            {submitting ? t.btnSaving : category ? t.btnUpdate : t.btnCreate}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
