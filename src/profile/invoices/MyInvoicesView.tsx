import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyInvoices, getInvoice, exportInvoicePdf, exportInvoiceHtml } from '../../api/invoicesApi';
import type { Invoice } from '../../api/invoicesApi';
import Header from '../../components/Header';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../../i18n';
import type { Language } from '../../i18n';

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '€0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '€0.00';
  return `€${num.toFixed(2)}`;
}

const STATUS_COLORS: Record<string, string> = {
  paid:      'bg-green-500/15 border-green-500/40 text-green-400',
  issued:    'bg-blue-500/15 border-blue-500/40 text-blue-400',
  draft:     'bg-gray-500/15 border-gray-500/40 text-gray-400',
  cancelled: 'bg-red-500/15 border-red-500/40 text-red-400',
  unpaid:    'bg-orange-500/15 border-orange-500/40 text-orange-400',
  overdue:   'bg-rose-500/15 border-rose-600/50 text-rose-400',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'bg-gray-500/15 border-gray-500/40 text-gray-400';
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border ${cls}`}>
      {status}
    </span>
  );
}

export default function MyInvoicesView() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).invoices;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [modalInvoice, setModalInvoice] = useState<Invoice | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Export
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [openExportMenuId, setOpenExportMenuId] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  // Export inside modal
  const [modalExporting, setModalExporting] = useState(false);
  const [modalExportMenuOpen, setModalExportMenuOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/', { replace: true });
      return;
    }
    loadInvoices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyInvoices();
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError(t.errLoad);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id: number) => {
    setModalError(null);
    setModalInvoice(null);
    setModalLoading(true);
    try {
      const invoice = await getInvoice(id);
      setModalInvoice(invoice);
    } catch (err) {
      console.error('Failed to load invoice:', err);
      setModalError(t.errLoadSingle);
    } finally {
      setModalLoading(false);
    }
  };

  const handleExport = async (id: number, format: 'pdf' | 'html', isModal = false) => {
    if (isModal) {
      setModalExportMenuOpen(false);
      setModalExporting(true);
    } else {
      setOpenExportMenuId(null);
      setExportingId(id);
    }
    setExportError(null);
    try {
      if (format === 'pdf') await exportInvoicePdf(id, language);
      else await exportInvoiceHtml(id, language);
    } catch (err) {
      console.error(`Failed to export invoice ${format.toUpperCase()}:`, err);
      setExportError(t.errExport);
    } finally {
      if (isModal) setModalExporting(false);
      else setExportingId(null);
    }
  };

  const closeModal = () => {
    setModalInvoice(null);
    setModalError(null);
    setModalExportMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 md:pt-32 pb-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{t.pageTitle}</h1>
          <p className="text-sm text-white/50 mt-1">{t.pageSubtitle}</p>
        </div>

        {/* Errors */}
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

        {/* Empty */}
        {!loading && !error && invoices.length === 0 && (
          <div className="text-center py-20">
            <svg className="w-14 h-14 text-white/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            </svg>
            <p className="text-white/40">{t.emptyState}</p>
          </div>
        )}

        {/* Invoice list */}
        {!loading && invoices.length > 0 && (
          <ul className="space-y-3">
            {invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="bg-gray-800 border border-gray-700 rounded-xl px-5 py-4 flex flex-col gap-3"
              >
                {/* Top: number + status + date */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-white font-medium">#{invoice.invoice_number}</span>
                  <StatusBadge status={invoice.status} />
                  {invoice.issued_at && (
                    <span className="text-xs text-white/40">{t.issued} {formatDate(invoice.issued_at)}</span>
                  )}
                  {invoice.due_date && (
                    <span className="text-xs text-white/40">{t.due} {formatDate(invoice.due_date)}</span>
                  )}
                </div>

                {/* Customer name */}
                <p className="text-sm text-white/60">
                  {invoice.customer_first_name} {invoice.customer_last_name}
                  {invoice.customer_email && (
                    <span className="ml-2 text-white/40">{invoice.customer_email}</span>
                  )}
                </p>

                {/* Total + actions */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-white font-semibold">{formatPrice(invoice.total)}</span>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Export dropdown */}
                    {openExportMenuId !== null && openExportMenuId !== invoice.id && (
                      <div className="fixed inset-0 z-10" onClick={() => setOpenExportMenuId(null)} />
                    )}
                    {openExportMenuId === invoice.id && (
                      <div className="fixed inset-0 z-10" onClick={() => setOpenExportMenuId(null)} />
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setOpenExportMenuId(openExportMenuId === invoice.id ? null : invoice.id)}
                        disabled={exportingId === invoice.id}
                        className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        title={t.export}
                      >
                        {exportingId === invoice.id ? (
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        <span className="hidden sm:inline">{exportingId === invoice.id ? t.exporting : t.export}</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openExportMenuId === invoice.id && (
                        <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-20 min-w-28">
                          <button
                            onClick={() => handleExport(invoice.id, 'pdf')}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PDF
                          </button>
                          <button
                            onClick={() => handleExport(invoice.id, 'html')}
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

                    {/* View button */}
                    <button
                      onClick={() => handleView(invoice.id)}
                      className="flex items-center gap-1.5 text-sm text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="hidden sm:inline">{t.viewInvoice}</span>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Invoice detail modal */}
      {(modalLoading || modalInvoice || modalError) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
              <h2 className="text-lg font-semibold text-white">
                {modalInvoice ? `${t.invoiceNumber} #${modalInvoice.invoice_number}` : t.viewInvoice}
              </h2>
              <div className="flex items-center gap-2">
                {/* Export inside modal */}
                {modalInvoice && (
                  <div className="relative">
                    {modalExportMenuOpen && (
                      <div className="fixed inset-0 z-10" onClick={() => setModalExportMenuOpen(false)} />
                    )}
                    <button
                      onClick={() => setModalExportMenuOpen((o) => !o)}
                      disabled={modalExporting}
                      className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {modalExporting ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <span className="hidden sm:inline">{modalExporting ? t.exporting : t.export}</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {modalExportMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-20 min-w-28">
                        <button
                          onClick={() => handleExport(modalInvoice.id, 'pdf', true)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          PDF
                        </button>
                        <button
                          onClick={() => handleExport(modalInvoice.id, 'html', true)}
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
                )}
                <button
                  onClick={closeModal}
                  className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                  aria-label={t.close}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
              {modalLoading && (
                <div className="flex justify-center py-10">
                  <svg className="w-8 h-8 text-white/30 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              )}

              {modalError && (
                <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
                  {modalError}
                </div>
              )}

              {modalInvoice && (
                <>
                  {/* Status + dates */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <StatusBadge status={modalInvoice.status} />
                    {modalInvoice.issued_at && (
                      <span className="text-white/50">{t.issued}: <span className="text-white">{formatDate(modalInvoice.issued_at)}</span></span>
                    )}
                    {modalInvoice.paid_at && (
                      <span className="text-white/50">{t.paid}: <span className="text-green-400">{formatDate(modalInvoice.paid_at)}</span></span>
                    )}
                    {modalInvoice.due_date && (
                      <span className="text-white/50">{t.due}: <span className="text-white">{formatDate(modalInvoice.due_date)}</span></span>
                    )}
                  </div>

                  {/* Customer */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-2">{t.labelCustomer}</p>
                    <p className="text-white text-sm">{modalInvoice.customer_first_name} {modalInvoice.customer_last_name}</p>
                    {modalInvoice.customer_email && <p className="text-sm text-white/60">{modalInvoice.customer_email}</p>}
                    {modalInvoice.customer_phone && <p className="text-sm text-white/60">{modalInvoice.customer_phone}</p>}
                  </div>

                  {/* Billing address */}
                  {modalInvoice.billing_address && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-2">{t.labelBilling}</p>
                      <p className="text-sm text-white/80">{modalInvoice.billing_address.street}</p>
                      <p className="text-sm text-white/80">{modalInvoice.billing_address.postal_code} {modalInvoice.billing_address.city}</p>
                      <p className="text-sm text-white/80">{modalInvoice.billing_address.country}</p>
                    </div>
                  )}

                  {/* Line items */}
                  {modalInvoice.items && modalInvoice.items.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-2">{t.labelItems}</p>
                      <div className="overflow-x-auto rounded-lg border border-gray-700">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-700 bg-gray-800/50">
                              <th className="text-left px-3 py-2 text-white/50 font-medium">{t.colDescription}</th>
                              <th className="text-right px-3 py-2 text-white/50 font-medium">{t.colQty}</th>
                              <th className="text-right px-3 py-2 text-white/50 font-medium">{t.colUnit}</th>
                              <th className="text-right px-3 py-2 text-white/50 font-medium">{t.colTax}</th>
                              <th className="text-right px-3 py-2 text-white/50 font-medium">{t.colTotal}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modalInvoice.items.map((item) => (
                              <tr key={item.id} className="border-b border-gray-700/50 last:border-0">
                                <td className="px-3 py-2 text-white">{item.description}</td>
                                <td className="px-3 py-2 text-white/70 text-right">{item.quantity}</td>
                                <td className="px-3 py-2 text-white/70 text-right">{formatPrice(item.unit_price)}</td>
                                <td className="px-3 py-2 text-white/70 text-right">{item.tax_rate}%</td>
                                <td className="px-3 py-2 text-white text-right font-medium">{formatPrice(item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="flex flex-col items-end gap-1 text-sm border-t border-gray-700 pt-4">
                    <div className="flex gap-8 text-white/60">
                      <span>{t.subtotal}</span>
                      <span className="text-white min-w-20 text-right">{formatPrice(modalInvoice.subtotal)}</span>
                    </div>
                    <div className="flex gap-8 text-white font-semibold text-base">
                      <span>{t.total}</span>
                      <span className="min-w-20 text-right">{formatPrice(modalInvoice.total)}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {modalInvoice.notes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/40 mb-2">{t.labelNotes}</p>
                      <p className="text-sm text-white/70 whitespace-pre-line">{modalInvoice.notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
