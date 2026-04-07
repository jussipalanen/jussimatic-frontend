import { useEffect, useState } from 'react';
import { useLocaleNavigate } from '../../hooks/useLocaleNavigate';
import { reviewCV, type CVReviewResponse } from './api/cvReviewApi';
import {
  getStoredLanguage,
  translations,
} from '../../i18n';
import type { Language } from '../../i18n';
import Header from '../../components/Header';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];


function normalizeSummaryText(summary: string): string {
  return summary
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function AICVReviewView() {
  const navigate = useLocaleNavigate();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CVReviewResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const t = translations[language].cvReview;

  useEffect(() => {
    const handler = (event: Event) => setLanguage((event as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  const validateFile = (file: File): string | null => {
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return t.invalidType;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return t.fileTooLarge;
    }

    return null;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setError(null);
    setResult(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);
    setResult(null);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    // Update the file input element
    const fileInput = document.getElementById('cv-file-input') as HTMLInputElement;
    if (fileInput && e.dataTransfer.files) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedFile) {
      setError(t.selectFileFirst);
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const response = await reviewCV(selectedFile);
      setResult(response);
    } catch (err) {
      console.error('Failed to review CV:', err);
      setError(err instanceof Error ? err.message : t.reviewFailed);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setError(null);
    setResult(null);
    // Reset file input
    const fileInput = document.getElementById('cv-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Header
        title={t.title}
        language={language}
        onLanguageChange={setLanguage}
        backLabel={t.backToHome}
        onBack={() => navigate('/')}
      />

      {/* Main content */}
      <main className="grow p-6">
        <div className="max-w-4xl mx-auto">
          {/* Description */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-3">{t.uploadTitle}</h2>
            <p className="text-gray-300 mb-2">
              {t.uploadDescription}
            </p>
            <p className="text-sm text-gray-400">
              {t.supportedFormats}
            </p>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 mb-6">
            {/* Drag and Drop Area */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${
                isDragging
                  ? 'border-blue-500 bg-blue-900/20 scale-[1.02]'
                  : 'border-gray-600 bg-gray-900/40 hover:border-gray-500'
              } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input
                id="cv-file-input"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />

              <div className="flex flex-col items-center justify-center text-center pointer-events-none">
                {/* Upload Icon */}
                <div className={`mb-4 transition-colors ${isDragging ? 'text-blue-400' : 'text-gray-400'}`}>
                  <svg
                    className="w-16 h-16 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>

                {/* Text */}
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-green-400">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-semibold">{t.fileSelected}</span>
                    </div>
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-400">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {t.clickOrDragToReplace}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className={`text-lg font-semibold transition-colors ${
                      isDragging ? 'text-blue-400' : 'text-white'
                    }`}>
                      {isDragging ? t.dropHere : t.dragDropHere}
                    </p>
                    <p className="text-gray-400">{t.or}</p>
                    <p className="text-blue-400 font-medium">{t.clickToBrowse}</p>
                    <p className="text-xs text-gray-500 mt-3">
                      {t.supportedFormats}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-4 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105
                  disabled:hover:scale-100 shadow-lg"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t.analyzing}
                  </span>
                ) : (
                  t.reviewCV
                )}
              </button>
              {(selectedFile || result) && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={uploading}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105
                    disabled:hover:scale-100"
                >
                  {t.reset}
                </button>
              )}
            </div>
          </form>

          {/* Loading state */}
          {uploading && (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
              <p className="text-gray-300">{t.analyzingLong}</p>
            </div>
          )}

          {/* Results */}
          {result && !uploading && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-green-400">✓ {t.reviewComplete}</h2>

              {/* Summary */}
              {result.summary && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">{t.summary}</h3>
                  <div className="bg-gray-900/60 rounded-lg p-4">
                    {normalizeSummaryText(result.summary)
                      .split('\n\n')
                      .map((paragraph, idx) => (
                        <p key={`${paragraph}-${idx}`} className="text-gray-300 whitespace-pre-wrap mb-3 last:mb-0">
                          {paragraph}
                        </p>
                      ))}
                  </div>
                </div>
              )}

              {/* Stars and Rating */}
              {result.stars !== undefined && (
                <div className="mb-6">
                  <div className="flex items-center gap-4">
                    {/* Visual Stars */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-8 h-8 ${
                            star <= (result.stars || 0)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-600 fill-current'
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    {/* Rating Text */}
                    {result.rating_text && (
                      <span className="text-xl font-semibold text-white">{result.rating_text}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {result.strengths && result.strengths.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    {t.strengths}
                  </h3>
                  <ul className="space-y-2">
                    {result.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-3 bg-green-900/30 border border-green-700/50 rounded-lg p-3">
                        <span className="text-green-400 font-bold shrink-0">•</span>
                        <span className="text-gray-300">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {result.weaknesses && result.weaknesses.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <span className="text-orange-400">⚠</span>
                    {t.weaknesses}
                  </h3>
                  <ul className="space-y-2">
                    {result.weaknesses.map((weakness, index) => (
                      <li key={index} className="flex items-start gap-3 bg-orange-900/30 border border-orange-700/50 rounded-lg p-3">
                        <span className="text-orange-400 font-bold shrink-0">•</span>
                        <span className="text-gray-300">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!result.summary && !result.strengths && !result.weaknesses && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <p className="text-yellow-300">{t.noDetailedFeedback}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

    </div>
  );
}

export default AICVReviewView;
