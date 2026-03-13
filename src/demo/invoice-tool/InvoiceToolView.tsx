import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_LANGUAGE, getStoredLanguage, translations } from '../../i18n';
import type { Language } from '../../i18n';
import { exportInvoicePdfPublic, exportInvoiceHtmlPublic, fetchInvoiceOptions, sendInvoiceEmailPublic } from '../../api/invoicesApi';
import type { InvoiceExportPayload, InvoiceStatusOption, InvoiceItemTypeOption } from '../../api/invoicesApi';
import { fetchTaxRates } from '../../api/productsApi';
import type { TaxRate } from '../../api/productsApi';
import NavBar from '../../components/NavBar';
import CountrySelect from '../../components/CountrySelect';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INPUT_CLS =
  'w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const LABEL_CLS = 'block text-sm font-medium text-white/70 mb-1';

const FALLBACK_STATUS_OPTIONS: InvoiceStatusOption[] = [
  { value: 'draft',     label: 'Draft',     color: 'gray' },
  { value: 'issued',    label: 'Issued',    color: 'blue' },
  { value: 'paid',      label: 'Paid',      color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
];
const FALLBACK_ITEM_TYPES: InvoiceItemTypeOption[] = [
  { value: 'product',  label: 'Product' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'discount', label: 'Discount' },
  { value: 'fee',      label: 'Fee' },
  { value: 'other',    label: 'Other' },
];
const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fi', label: 'Suomi' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const uid = () => Math.random().toString(36).slice(2);

interface LineItem {
  _id: string;
  type: string;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
}

interface FormData {
  lang: string;
  invoice_number: string;
  status: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  billing_street: string;
  billing_city: string;
  billing_postal_code: string;
  billing_country: string;
  subtotal: string;
  total: string;
  notes: string;
  items: LineItem[];
}

const EMPTY_FORM: FormData = {
  lang: 'en',
  invoice_number: '',
  status: 'issued',
  customer_first_name: '',
  customer_last_name: '',
  customer_email: '',
  customer_phone: '',
  billing_street: '',
  billing_city: '',
  billing_postal_code: '',
  billing_country: '',
  subtotal: '',
  total: '',
  notes: '',
  items: [],
};

function newItem(): LineItem {
  return { _id: uid(), type: 'product', description: '', quantity: '1', unit_price: '0', tax_rate: '0' };
}

function computeItemTotal(qty: string, unitPrice: string): number {
  const q = parseFloat(qty) || 0;
  const p = parseFloat(unitPrice) || 0;
  return Math.round(q * p * 100) / 100;
}

function computeItemGross(qty: string, unitPrice: string, taxRate: string): number {
  const net = computeItemTotal(qty, unitPrice);
  const r = parseFloat(taxRate) || 0;
  const effectiveRate = r > 1 ? r / 100 : r;
  return Math.round(net * (1 + effectiveRate) * 100) / 100;
}

function formatTaxPct(taxRate: string): string {
  const r = parseFloat(taxRate) || 0;
  const effectiveRate = r > 1 ? r / 100 : r;
  const pct = parseFloat((effectiveRate * 100).toPrecision(10));
  return `${pct.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 90000) + 10000);
  return `INV-${year}-${num}`;
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export default function InvoiceToolView() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const tInv = (translations[language] ?? translations[DEFAULT_LANGUAGE]).invoices;

  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [taxSearches, setTaxSearches] = useState<Record<string, string>>({});
  const [taxDropdownOpen, setTaxDropdownOpen] = useState<Record<string, boolean>>({});
  const taxRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [subtotalAuto, setSubtotalAuto] = useState(true);
  const [totalAuto, setTotalAuto] = useState(true);
  const [statusOptions, setStatusOptions] = useState<InvoiceStatusOption[]>(FALLBACK_STATUS_OPTIONS);
  const [itemTypes, setItemTypes] = useState<InvoiceItemTypeOption[]>(FALLBACK_ITEM_TYPES);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    fetchTaxRates(form.lang).then(setTaxRates).catch(() => setTaxRates([]));
  }, [form.lang]);

  useEffect(() => {
    fetchInvoiceOptions(language)
      .then((opts) => {
        if (opts.statuses?.length) setStatusOptions(opts.statuses);
        if (opts.item_types?.length) setItemTypes(opts.item_types);
      })
      .catch(() => { /* keep fallbacks */ });
  }, [language]);

  // Auto-calculate subtotal (net) and total (gross incl. VAT) from line items
  useEffect(() => {
    if (!subtotalAuto && !totalAuto) return;
    const net = form.items.reduce(
      (sum, it) => sum + computeItemTotal(it.quantity, it.unit_price), 0,
    );
    const gross = form.items.reduce(
      (sum, it) => sum + computeItemGross(it.quantity, it.unit_price, it.tax_rate), 0,
    );
    const hasItems = form.items.length > 0;
    setForm((prev) => ({
      ...prev,
      ...(subtotalAuto ? { subtotal: hasItems ? net.toFixed(2) : '' } : {}),
      ...(totalAuto ? { total: hasItems ? gross.toFixed(2) : '' } : {}),
    }));
  }, [form.items, subtotalAuto, totalAuto]);

  // Persist to sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('demo-invoice-form');
    if (saved) {
      try { setForm(JSON.parse(saved) as FormData); } catch { /* ignore */ }
    }
  }, []);
  useEffect(() => {
    sessionStorage.setItem('demo-invoice-form', JSON.stringify(form));
  }, [form]);

  const patch = (partial: Partial<FormData>) => setForm((prev) => ({ ...prev, ...partial }));

  const field = (
    key: keyof Omit<FormData, 'items'>,
    label: string,
    type = 'text',
    placeholder = '',
  ) => (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <input
        type={type}
        value={String(form[key] ?? '')}
        onChange={(e) => patch({ [key]: e.target.value })}
        placeholder={placeholder}
        className={INPUT_CLS}
      />
    </div>
  );

  // ---- Item helpers ----------------------------------------------------------
  const addItem = () => patch({ items: [...form.items, newItem()] });
  const removeItem = (id: string) => {
    patch({ items: form.items.filter((it) => it._id !== id) });
    setTaxSearches((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setTaxDropdownOpen((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };
  const updateItem = (id: string, partial: Partial<LineItem>) =>
    patch({ items: form.items.map((it) => (it._id === id ? { ...it, ...partial } : it)) });
  const moveItem = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= form.items.length) return;
    const copy = [...form.items];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    patch({ items: copy });
  };

  // ---- Export ----------------------------------------------------------------
  const buildPayload = (): InvoiceExportPayload => ({
    lang: form.lang || 'en',
    invoice_number: form.invoice_number,
    customer_first_name: form.customer_first_name,
    customer_last_name: form.customer_last_name,
    customer_email: form.customer_email || undefined,
    customer_phone: form.customer_phone || undefined,
    billing_address: {
      street: form.billing_street,
      city: form.billing_city,
      postal_code: form.billing_postal_code,
      country: form.billing_country,
    },
    subtotal: parseFloat(form.subtotal) || 0,
    total: parseFloat(form.total) || 0,
    status: form.status,
    notes: form.notes || undefined,
    items: form.items.map((it) => ({
      type: it.type,
      description: it.description,
      quantity: parseFloat(it.quantity) || 0,
      unit_price: parseFloat(it.unit_price) || 0,
      tax_rate: parseFloat(it.tax_rate) || 0,
      total: computeItemTotal(it.quantity, it.unit_price),
    })),
  });

  const handleExport = async (format: 'pdf' | 'html') => {
    setExportMenuOpen(false);
    setExporting(true);
    setError(null);
    try {
      const payload = buildPayload();
      if (format === 'pdf') await exportInvoicePdfPublic(payload);
      else await exportInvoiceHtmlPublic(payload);
    } catch (err) {
      console.error('Export failed:', err);
      setError(tInv.errExportFailed);
    } finally {
      setExporting(false);
    }
  };

  const handleOpenSendModal = () => {
    setSendEmail(form.customer_email || '');
    setSendError(null);
    setSendSuccess(false);
    setShowSendModal(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      await sendInvoiceEmailPublic({ ...buildPayload(), to_email: sendEmail });
      setSendSuccess(true);
    } catch (err) {
      console.error('Send failed:', err);
      setSendError(tInv.errSendFailed);
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => {
    setForm({ ...EMPTY_FORM });
    sessionStorage.removeItem('demo-invoice-form');
    setShowClearConfirm(false);
    setError(null);
    setSubtotalAuto(true);
    setTotalAuto(true);
  };

  const itemsNetTotal = form.items.reduce(
    (sum, it) => sum + computeItemTotal(it.quantity, it.unit_price),
    0,
  );
  const itemsVatTotal = form.items.reduce(
    (sum, it) => sum + (computeItemGross(it.quantity, it.unit_price, it.tax_rate) - computeItemTotal(it.quantity, it.unit_price)),
    0,
  );
  const itemsGrossTotal = itemsNetTotal + itemsVatTotal;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <NavBar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-12">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-white/50 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {tInv.demoBackToHome}
            </button>
            <span className="text-white/30">/</span>
            <h1 className="text-lg font-semibold text-white">{tInv.demoPageTitle}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-600/20 border border-green-500/30 text-green-300 font-medium">
              {tInv.demoBadge}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Send button */}
            <button
              type="button"
              onClick={handleOpenSendModal}
              className="flex items-center gap-2 border border-gray-600 hover:border-gray-500 text-white/70 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">{tInv.sendBtn}</span>
            </button>

            {/* Clear button */}
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 border border-gray-600 hover:border-gray-500 text-white/70 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">{tInv.demoClearBtn}</span>
            </button>

            {/* Export button */}
            <div className="relative">
              {exportMenuOpen && (
                <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
              )}
              <button
                type="button"
                onClick={() => setExportMenuOpen((o) => !o)}
                disabled={exporting}
                className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {exporting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="hidden sm:inline">{tInv.exporting}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="hidden sm:inline">{tInv.export}</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 z-20 min-w-28">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF
                  </button>
                  <button
                    onClick={() => handleExport('html')}
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
          </div>
        </div>

        {/* Demo notice */}
        <div className="mb-5 rounded-lg border border-blue-500/30 bg-blue-900/20 px-4 py-3 text-sm text-blue-300 flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{tInv.demoNotice}</span>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Form — single scrollable card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl divide-y divide-gray-700">

          {/* Invoice Info */}
          <section className="p-5">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">{tInv.sectionInvoiceInfo}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={LABEL_CLS}>{tInv.fieldInvoiceNumber}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.invoice_number}
                    onChange={(e) => patch({ invoice_number: e.target.value })}
                    placeholder={tInv.fieldInvoiceNumberPlaceholder}
                    className={INPUT_CLS + ' flex-1 font-mono'}
                  />
                  <button
                    type="button"
                    onClick={() => patch({ invoice_number: generateInvoiceNumber() })}
                    title="Generate invoice number"
                    className="shrink-0 rounded-lg border border-gray-600 px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <label className={LABEL_CLS}>{tInv.fieldStatus}</label>
                <select value={form.status} onChange={(e) => patch({ status: e.target.value })} className={INPUT_CLS}>
                  {statusOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>{tInv.fieldLang}</label>
                <select value={form.lang} onChange={(e) => patch({ lang: e.target.value })} className={INPUT_CLS}>
                  {LANG_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Customer */}
          <section className="p-5">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">{tInv.sectionCustomer}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('customer_first_name', tInv.fieldFirstName)}
              {field('customer_last_name', tInv.fieldLastName)}
              {field('customer_email', tInv.fieldEmail, 'email')}
              {field('customer_phone', tInv.fieldPhone, 'tel')}
            </div>
          </section>

          {/* Billing Address */}
          <section className="p-5">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">{tInv.sectionBilling}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">{field('billing_street', tInv.fieldStreet)}</div>
              {field('billing_city', tInv.fieldCity)}
              {field('billing_postal_code', tInv.fieldPostalCode)}
              <div>
                <label className={LABEL_CLS}>{tInv.fieldCountry}</label>
                <CountrySelect
                  name="billing_country"
                  value={form.billing_country}
                  onChange={(e) => patch({ billing_country: e.target.value })}
                  className={INPUT_CLS}
                />
              </div>
            </div>
          </section>

          {/* Line Items */}
          <section className="p-5">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">{tInv.sectionItems}</h2>
            <div className="space-y-4">
              {form.items.length === 0 && (
                <p className="text-sm text-white/40 text-center py-4">{tInv.emptyState}</p>
              )}
              {form.items.map((item, index) => (
                <div key={item._id} className="border border-gray-600 rounded-xl p-4 relative">
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition-colors"
                      aria-label="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === form.items.length - 1}
                      className="p-1 text-white/40 hover:text-white disabled:opacity-20 transition-colors"
                      aria-label="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item._id)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      aria-label="Remove item"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="pr-20 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLS}>{tInv.fieldItemDescription}</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item._id, { description: e.target.value })}
                        className={INPUT_CLS}
                        placeholder="e.g. Wireless Headphones"
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{tInv.fieldItemType}</label>
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(item._id, { type: e.target.value })}
                        className={INPUT_CLS}
                      >
                        {itemTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{tInv.fieldItemQty}</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item._id, { quantity: e.target.value })}
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{tInv.fieldItemUnitPrice}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(item._id, { unit_price: e.target.value })}
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLS}>{tInv.fieldItemTaxRate}</label>
                      {taxRates.length > 0 ? (
                        <div
                          className="relative"
                          ref={(el) => { taxRefs.current[item._id] = el; }}
                        >
                          <input
                            type="text"
                            value={taxSearches[item._id] ?? (() => {
                              const match = taxRates.find((tr) => {
                                const r = typeof tr.rate === 'string' ? parseFloat(tr.rate) : tr.rate;
                                const effectiveR = r > 1 ? r / 100 : r;
                                const itemR = parseFloat(item.tax_rate) || 0;
                                const effectiveItem = itemR > 1 ? itemR / 100 : itemR;
                                return Math.abs(effectiveR - effectiveItem) < 0.0001 && item.tax_rate !== '0' && item.tax_rate !== '';
                              });
                              return match ? (match.label ?? match.name ?? match.code) : (item.tax_rate && item.tax_rate !== '0' ? item.tax_rate : '');
                            })()}
                            onChange={(e) => {
                              setTaxSearches((prev) => ({ ...prev, [item._id]: e.target.value }));
                              setTaxDropdownOpen((prev) => ({ ...prev, [item._id]: true }));
                            }}
                            onFocus={() => setTaxDropdownOpen((prev) => ({ ...prev, [item._id]: true }))}
                            onBlur={() => setTimeout(() => setTaxDropdownOpen((prev) => ({ ...prev, [item._id]: false })), 150)}
                            placeholder="Search or type value…"
                            className={INPUT_CLS}
                          />
                          {taxDropdownOpen[item._id] && (() => {
                            const q = (taxSearches[item._id] ?? '').toLowerCase();
                            const filtered = taxRates.filter((tr) =>
                              (tr.label ?? tr.name ?? tr.code).toLowerCase().includes(q) ||
                              String(tr.rate).includes(q) ||
                              tr.code.toLowerCase().includes(q)
                            );
                            return filtered.length > 0 ? (
                              <ul className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-600 bg-gray-800 shadow-lg">
                                {filtered.map((tr) => {
                                  const r = typeof tr.rate === 'string' ? parseFloat(tr.rate) : tr.rate;
                                  const effectiveR = r > 1 ? r / 100 : r;
                                  const pct = `${parseFloat((effectiveR * 100).toPrecision(10))}%`;
                                  const displayLabel = tr.label ?? tr.name ?? tr.code;
                                  const isZero = tr.code === 'ZERO';
                                  return (
                                    <li
                                      key={tr.code}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        updateItem(item._id, { tax_rate: String(effectiveR) });
                                        setTaxSearches((prev) => ({ ...prev, [item._id]: displayLabel }));
                                        setTaxDropdownOpen((prev) => ({ ...prev, [item._id]: false }));
                                      }}
                                      className="flex items-center justify-between gap-2 cursor-pointer px-3 py-2 text-sm text-white hover:bg-gray-700"
                                    >
                                      <span>{displayLabel}{!isZero && <span className="ml-1 text-xs text-gray-400">{pct}</span>}</span>
                                      {isZero && <span className="text-xs text-gray-500">0%</span>}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null;
                          })()}
                          {(taxSearches[item._id] || (item.tax_rate && item.tax_rate !== '0')) && (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                updateItem(item._id, { tax_rate: '0' });
                                setTaxSearches((prev) => { const n = { ...prev }; delete n[item._id]; return n; });
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                              aria-label="Clear tax"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={item.tax_rate}
                          onChange={(e) => updateItem(item._id, { tax_rate: e.target.value })}
                          className={INPUT_CLS}
                          placeholder="0.24"
                        />
                      )}
                    </div>
                    <div className="flex items-end pb-0.5">
                      <span className="text-sm text-white/50">
                        {tInv.fieldItemTotal}:{' '}
                        {parseFloat(item.tax_rate) > 0 ? (
                          <>
                            <span className="text-green-400 font-medium">
                              €{computeItemGross(item.quantity, item.unit_price, item.tax_rate).toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">
                              (net €{computeItemTotal(item.quantity, item.unit_price).toFixed(2)} + {formatTaxPct(item.tax_rate)} VAT)
                            </span>
                          </>
                        ) : (
                          <span className="text-white font-medium">
                            €{computeItemTotal(item.quantity, item.unit_price).toFixed(2)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 border border-dashed border-blue-600/50 hover:border-blue-400 rounded-xl px-4 py-3 w-full justify-center transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {tInv.addItem}
              </button>
            </div>
          </section>

          {/* Totals & Notes */}
          <section className="p-5">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">{tInv.sectionSummary}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-white/70">{tInv.fieldSubtotal}</label>
                    {subtotalAuto ? (
                      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 border border-green-700/40 px-1.5 py-0.5 rounded">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Auto
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSubtotalAuto(true)}
                        title="Reset to auto-calculated value"
                        className="flex items-center gap-1 text-xs text-white/40 hover:text-white/80 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset to auto
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.subtotal}
                    onChange={(e) => { setSubtotalAuto(false); patch({ subtotal: e.target.value }); }}
                    placeholder="0.00"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-white/70">{tInv.fieldTotal}</label>
                    {totalAuto ? (
                      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/30 border border-green-700/40 px-1.5 py-0.5 rounded">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Auto
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTotalAuto(true)}
                        title="Reset to auto-calculated value"
                        className="flex items-center gap-1 text-xs text-white/40 hover:text-white/80 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset to auto
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.total}
                    onChange={(e) => { setTotalAuto(false); patch({ total: e.target.value }); }}
                    placeholder="0.00"
                    className={INPUT_CLS}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL_CLS}>{tInv.fieldNotes}</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => patch({ notes: e.target.value })}
                    rows={4}
                    className={INPUT_CLS + ' resize-y'}
                    placeholder="Thank you for your business."
                  />
                </div>
              </div>

              {form.items.length > 0 && (
                <div className="rounded-lg border border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800/60 border-b border-gray-700">
                        <th className="text-left px-3 py-2 text-white/50 font-medium">{tInv.colDescription}</th>
                        <th className="text-right px-3 py-2 text-white/50 font-medium">{tInv.colQty}</th>
                        <th className="text-right px-3 py-2 text-white/50 font-medium">{tInv.colUnit}</th>
                        <th className="text-right px-3 py-2 text-white/50 font-medium">{tInv.colTax}</th>
                        <th className="text-right px-3 py-2 text-white/50 font-medium">{tInv.fieldItemTotal}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item) => {
                        const net = computeItemTotal(item.quantity, item.unit_price);
                        const gross = computeItemGross(item.quantity, item.unit_price, item.tax_rate);
                        const hasTax = parseFloat(item.tax_rate) > 0;
                        return (
                          <tr key={item._id} className="border-b border-gray-700/50 last:border-0">
                            <td className="px-3 py-2 text-white">{item.description || '—'}</td>
                            <td className="px-3 py-2 text-white/70 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-white/70 text-right">€{(parseFloat(item.unit_price) || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 text-white/60 text-right text-xs">
                              {hasTax ? formatTaxPct(item.tax_rate) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {hasTax ? (
                                <>
                                  <div className="text-green-400 font-medium">€{gross.toFixed(2)}</div>
                                  <div className="text-xs text-gray-500">net €{net.toFixed(2)}</div>
                                </>
                              ) : (
                                <span className="text-white font-medium">€{net.toFixed(2)}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-700/50">
                        <td colSpan={4} className="px-3 py-1.5 text-white/50 text-right text-xs">{tInv.subtotal} (net)</td>
                        <td className="px-3 py-1.5 text-white/70 text-right text-xs">€{itemsNetTotal.toFixed(2)}</td>
                      </tr>
                      {itemsVatTotal > 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-1.5 text-white/50 text-right text-xs">VAT</td>
                          <td className="px-3 py-1.5 text-white/70 text-right text-xs">€{itemsVatTotal.toFixed(2)}</td>
                        </tr>
                      )}
                      <tr className="border-t border-gray-700 bg-gray-800/60">
                        <td colSpan={4} className="px-3 py-2 text-white/60 text-right text-sm">
                          {itemsVatTotal > 0 ? `${tInv.subtotal} (incl. VAT)` : tInv.subtotal}
                        </td>
                        <td className="px-3 py-2 text-white font-semibold text-right">€{itemsGrossTotal.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>

      {/* Send email modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-lg" role="dialog" aria-modal="true">
            <h2 className="text-lg font-semibold text-white">{tInv.sendModalTitle}</h2>
            {sendSuccess ? (
              <>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-900/40 border border-green-700 px-4 py-3 text-sm text-green-300">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {tInv.sendModalSuccess}
                </div>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSendModal(false)}
                    className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
                  >
                    {tInv.close}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSendEmail}>
                <div className="mt-4">
                  <label className={LABEL_CLS}>{tInv.sendModalLabel}</label>
                  <input
                    type="email"
                    required
                    value={sendEmail}
                    onChange={(e) => setSendEmail(e.target.value)}
                    placeholder={tInv.sendModalPlaceholder}
                    className={INPUT_CLS + ' mt-1'}
                    autoFocus
                  />
                </div>
                {sendError && (
                  <div className="mt-3 rounded-lg bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-300">
                    {sendError}
                  </div>
                )}
                <div className="mt-5 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSendModal(false)}
                    disabled={sending}
                    className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
                  >
                    {tInv.sendModalCancel}
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sending ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        {tInv.sendModalSending}
                      </>
                    ) : tInv.sendModalSubmit}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Clear confirm dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-lg" role="dialog" aria-modal="true">
            <h2 className="text-lg font-semibold text-white">{tInv.clearDialogTitle}</h2>
            <p className="mt-2 text-sm text-gray-300">{tInv.clearDialogBody}</p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
              >
                {tInv.close}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {tInv.clearAll}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
