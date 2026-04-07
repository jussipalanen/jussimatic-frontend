import { useEffect, useState, type FormEvent } from 'react';
import { createProjectTag, updateProjectTag } from '../api/projectsApi';
import type { ProjectTagItem, ProjectTagFormData } from '../api/projectsApi';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../i18n';
import type { Language } from '../i18n';

interface TagFormState {
  title: string;
  color: string;
}

const EMPTY_FORM: TagFormState = { title: '', color: '' };

interface ProjectTagModalProps {
  tag: ProjectTagItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProjectTagModal({ tag, onClose, onSaved }: ProjectTagModalProps) {
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminProjects;

  const [form, setForm] = useState<TagFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    if (tag) {
      setForm({ title: tag.title, color: tag.color });
    } else {
      setForm(EMPTY_FORM);
    }
    setFormError(null);
  }, [tag]);

  const close = () => { if (!submitting) onClose(); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError(t.errTitleRequired); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: ProjectTagFormData = {
        title: form.title.trim(),
        color: form.color.trim(),
      };
      if (tag) {
        await updateProjectTag(tag.id, payload);
      } else {
        await createProjectTag(payload);
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
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {tag ? t.editTagTitle : t.createTagTitle}
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
          <div>
            <label className={labelCls}>
              {t.labelTagName} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={inputCls}
              placeholder={t.placeholderTagName}
              required
            />
          </div>

          <div>
            <label className={labelCls}>{t.labelColor}</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color || '#6b7280'}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-9 w-12 cursor-pointer rounded border border-gray-600 bg-gray-900 p-0.5"
              />
              <input
                type="text"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className={inputCls}
                placeholder={t.placeholderColor}
                maxLength={50}
              />
            </div>
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
              {submitting ? t.btnSaving : tag ? t.btnUpdate : t.btnCreate}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
