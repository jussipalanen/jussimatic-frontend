import { useEffect, useMemo, useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllInvoices, updateInvoice, deleteInvoice, createInvoice, fetchInvoiceOptions } from '../../../api/invoicesApi';
import type { Invoice, UpdateInvoiceData, CreateInvoiceData, InvoiceStatusOption, InvoiceItemTypeOption } from '../../../api/invoicesApi';
import { fetchOrderById, fetchAllOrders } from '../../../api/ordersApi';
import type { Order } from '../../../api/ordersApi';
import { getMe } from '../../../api/authApi';
import { getRoleAccess, PERMISSION_MESSAGE } from '../../../utils/authUtils';
import { getCart } from '../../../utils/cartUtils';
import EcommerceHeader from '../components/EcommerceHeader';
import CountrySelect from '../../../components/CountrySelect';
import { getStoredLanguage, translations, DEFAULT_LANGUAGE, type Language } from '../../../i18n';
import { fetchTaxRates } from '../../../api/productsApi';
import type { TaxRate } from '../../../api/productsApi';

const ITEMS_PER_PAGE = 10;

const DEFAULT_STATUS_OPTIONS: InvoiceStatusOption[] = [
  { value: 'draft',     label: 'Draft',     color: 'gray' },
  { value: 'issued',    label: 'Issued',    color: 'blue' },
  { value: 'paid',      label: 'Paid',      color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
];

const DEFAULT_ITEM_TYPE_OPTIONS: InvoiceItemTypeOption[] = [
  { value: 'product',  label: 'Product' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'discount', label: 'Discount' },
  { value: 'fee',      label: 'Fee' },
  { value: 'other',    label: 'Other' },
];

type EditFormData = {
  invoice_number: string;
  status: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  billing_address_street: string;
  billing_address_city: string;
  billing_address_postal_code: string;
  billing_address_country: string;
  subtotal: string;
  total: string;
  notes: string;
};

type EditLineItem = {
  _key: string;
  id?: number;
  description: string;
  type: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
};

type ModalView = 'invoice' | 'order';

let _lineKeyCounter = 0;
function newLineKey() { return `line-${++_lineKeyCounter}`; }

function invoiceToFormData(invoice: Invoice): EditFormData {
  return {
    invoice_number: invoice.invoice_number ?? '',
    status: invoice.status ?? 'draft',
    customer_first_name: invoice.customer_first_name ?? '',
    customer_last_name: invoice.customer_last_name ?? '',
    customer_email: invoice.customer_email ?? '',
    customer_phone: invoice.customer_phone ?? '',
    billing_address_street: invoice.billing_address?.street ?? '',
    billing_address_city: invoice.billing_address?.city ?? '',
    billing_address_postal_code: invoice.billing_address?.postal_code ?? '',
    billing_address_country: invoice.billing_address?.country ?? '',
    subtotal: invoice.subtotal ?? '',
    total: invoice.total ?? '',
    notes: invoice.notes ?? '',
  };
}

function emptyFormData(): EditFormData {
  return {
    invoice_number: '',
    status: 'draft',
    customer_first_name: '',
    customer_last_name: '',
    customer_email: '',
    customer_phone: '',
    billing_address_street: '',
    billing_address_city: '',
    billing_address_postal_code: '',
    billing_address_country: '',
    subtotal: '',
    total: '',
    notes: '',
  };
}

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 90000) + 10000);
  return `INV-${year}-${num}`;
}

function invoiceToEditItems(invoice: Invoice): EditLineItem[] {
  return (invoice.items ?? []).map((item) => ({
    _key: newLineKey(),
    id: item.id,
    description: item.description ?? '',
    type: item.type ?? 'product',
    quantity: String(item.quantity ?? 1),
    unit_price: String(item.unit_price ?? '0'),
    tax_rate: String(item.tax_rate ?? '0'),
  }));
}

function computeLineTotal(qty: string, unitPrice: string): number {
  const q = parseFloat(qty) || 0;
  const p = parseFloat(unitPrice) || 0;
  return Math.round(q * p * 100) / 100;
}

function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '€0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '€0.00';
  return `€${num.toFixed(2)}`;
}

function StatusBadge({ status, label, color }: { status: string; label?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    gray:  'bg-gray-600 text-gray-200',
    blue:  'bg-blue-600 text-blue-100',
    green: 'bg-green-600 text-green-100',
    red:   'bg-red-700 text-red-100',
  };
  const legacyColors: Record<string, string> = {
    draft:     'bg-gray-600 text-gray-200',
    issued:    'bg-blue-600 text-blue-100',
    paid:      'bg-green-600 text-green-100',
    cancelled: 'bg-red-700 text-red-100',
  };
  const cls = (color ? colorMap[color] : legacyColors[status]) ?? 'bg-gray-600 text-gray-200';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function AdminInvoicesView() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [searchInvoiceId, setSearchInvoiceId] = useState('');
  const [searchOrderId, setSearchOrderId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const t = (translations[language] ?? translations[DEFAULT_LANGUAGE]).adminInvoices;
  const [statusOptions, setStatusOptions] = useState<InvoiceStatusOption[]>(DEFAULT_STATUS_OPTIONS);
  const [itemTypeOptions, setItemTypeOptions] = useState<InvoiceItemTypeOption[]>(DEFAULT_ITEM_TYPE_OPTIONS);

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent<Language>).detail);
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  useEffect(() => {
    fetchInvoiceOptions(language).then((opts) => {
      setStatusOptions(opts.statuses);
      setItemTypeOptions(opts.item_types);
    }).catch(() => { /* keep defaults */ });
  }, [language]);

  const getStatusOption = (value: string) => statusOptions.find((o) => o.value === value);

  // Tax rate combobox state (shared across edit + create)
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [taxSearches, setTaxSearches] = useState<Record<string, string>>({});
  const [taxDropdownOpen, setTaxDropdownOpen] = useState<Record<string, boolean>>({});
  const taxRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetchTaxRates(language).then(setTaxRates).catch(() => setTaxRates([]));
  }, [language]);

  const setTaxForItem = (key: string, rate: string, label: string) => {
    setTaxSearches((prev) => ({ ...prev, [key]: label }));
    setTaxDropdownOpen((prev) => ({ ...prev, [key]: false }));
    return rate;
  };

  const clearTaxForItem = (key: string) => {
    setTaxSearches((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setTaxDropdownOpen((prev) => ({ ...prev, [key]: false }));
  };

  function TaxRateCombobox({
    itemKey,
    value,
    onChange,
    inputCls,
  }: {
    itemKey: string;
    value: string;
    onChange: (val: string) => void;
    inputCls: string;
  }) {
    const effectiveRate = (r: number | string) => {
      const n = typeof r === 'string' ? parseFloat(r) : r;
      return n > 1 ? n / 100 : n;
    };
    const pctLabel = (r: number | string) => `${parseFloat((effectiveRate(r) * 100).toPrecision(10))}%`;

    if (taxRates.length === 0) {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step="0.01" min="0" max="1"
          className={inputCls}
        />
      );
    }

    const searchVal = taxSearches[itemKey] ?? (() => {
      if (!value || value === '0') return '';
      const itemR = parseFloat(value);
      const eff = itemR > 1 ? itemR / 100 : itemR;
      const match = taxRates.find((tr) => Math.abs(effectiveRate(tr.rate) - eff) < 0.0001);
      return match ? (match.label ?? match.name ?? match.code) : value;
    })();

    const q = (taxSearches[itemKey] ?? '').toLowerCase();
    const filtered = taxRates.filter((tr) =>
      (tr.label ?? tr.name ?? tr.code).toLowerCase().includes(q) ||
      String(tr.rate).includes(q) ||
      tr.code.toLowerCase().includes(q)
    );

    const hasClear = !!(taxSearches[itemKey] || (value && value !== '0'));

    return (
      <div className="relative" ref={(el) => { taxRefs.current[itemKey] = el; }}>
        <input
          type="text"
          value={searchVal}
          onChange={(e) => {
            setTaxSearches((prev) => ({ ...prev, [itemKey]: e.target.value }));
            setTaxDropdownOpen((prev) => ({ ...prev, [itemKey]: true }));
          }}
          onFocus={() => setTaxDropdownOpen((prev) => ({ ...prev, [itemKey]: true }))}
          onBlur={() => setTimeout(() => setTaxDropdownOpen((prev) => ({ ...prev, [itemKey]: false })), 150)}
          placeholder="Search or enter…"
          className={inputCls + ' pr-6'}
        />
        {taxDropdownOpen[itemKey] && filtered.length > 0 && (
          <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-600 bg-gray-800 shadow-lg">
            {filtered.map((tr) => (
              <li
                key={tr.code}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const r = String(effectiveRate(tr.rate));
                  const lbl = tr.label ?? tr.name ?? tr.code;
                  onChange(setTaxForItem(itemKey, r, lbl));
                }}
                className="flex items-center justify-between gap-2 cursor-pointer px-3 py-2 text-xs text-white hover:bg-gray-700"
              >
                <span>{tr.label ?? tr.name ?? tr.code}</span>
                <span className="text-gray-400">
                  {tr.code !== 'ZERO' ? pctLabel(tr.rate) : '0%'}
                </span>
              </li>
            ))}
          </ul>
        )}
        {hasClear && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange('0');
              clearTaxForItem(itemKey);
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
            aria-label="Clear tax"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  // Invoice modal state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [modalView, setModalView] = useState<ModalView>('invoice');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);
  const [editItems, setEditItems] = useState<EditLineItem[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Order view state
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Create invoice modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<EditFormData>(emptyFormData());
  const [createItems, setCreateItems] = useState<EditLineItem[]>([]);
  const [createOrdersList, setCreateOrdersList] = useState<Order[]>([]);
  const [createOrdersLoading, setCreateOrdersLoading] = useState(false);
  const [createSelectedOrderId, setCreateSelectedOrderId] = useState<string>('');
  const [createSaveLoading, setCreateSaveLoading] = useState(false);
  const [createSaveError, setCreateSaveError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoices = async () => {
      setLoading(true);
      setAuthError(null);
      setInvoicesError(null);

      try {
        const token = localStorage.getItem('auth_token');

        if (!token) {
          setAuthError(t.authErrLogin);
          setLoading(false);
          return;
        }

        const user = await getMe();
        const access = getRoleAccess(user);

        if (!access.isAdmin && !access.isVendor) {
          setAuthError(PERMISSION_MESSAGE);
          setLoading(false);
          return;
        }

        try {
          const data = await fetchAllInvoices(token);
          setInvoices(data);
        } catch (err) {
          console.error('Failed to load invoices:', err);
          setInvoicesError(t.errLoad);
          setInvoices([]);
        }
      } catch (err) {
        console.error('Authentication failed:', err);
        setAuthError(t.authErrLogin);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [navigate]);

  const filteredInvoices = useMemo(() => {
    const invoiceIdTerm = searchInvoiceId.trim().toLowerCase();
    const orderIdTerm = searchOrderId.trim().toLowerCase();

    return invoices.filter((invoice: Invoice) => {
      if (invoiceIdTerm) {
        const matchesNumericId = String(invoice.id).includes(invoiceIdTerm);
        const matchesInvoiceNumber = invoice.invoice_number.toLowerCase().includes(invoiceIdTerm);
        if (!matchesNumericId && !matchesInvoiceNumber) return false;
      }

      if (orderIdTerm) {
        if (!String(invoice.order_id).includes(orderIdTerm)) return false;
      }

      return true;
    });
  }, [invoices, searchInvoiceId, searchOrderId]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE));

  const pagedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCurrentPage(1);
  };

  const handleSearchReset = () => {
    setSearchInvoiceId('');
    setSearchOrderId('');
    setCurrentPage(1);
  };

  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    if (totalPages <= 5) {
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
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Modal handlers
  const openModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setModalView('invoice');
    setIsEditing(false);
    setEditForm(null);
    setEditItems([]);
    setSaveError(null);
    setDeleteConfirm(false);
    setOrderData(null);
    setOrderError(null);
  };

  const closeModal = () => {
    if (saveLoading || deleteLoading) return;
    setSelectedInvoice(null);
    setModalView('invoice');
    setIsEditing(false);
    setEditForm(null);
    setEditItems([]);
    setSaveError(null);
    setDeleteConfirm(false);
    setSaveLoading(false);
    setDeleteLoading(false);
    setOrderData(null);
    setOrderError(null);
  };

  const startEditing = () => {
    if (!selectedInvoice) return;
    setEditForm(invoiceToFormData(selectedInvoice));
    setEditItems(invoiceToEditItems(selectedInvoice));
    setIsEditing(true);
    setSaveError(null);
    setDeleteConfirm(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm(null);
    setEditItems([]);
    setSaveError(null);
  };

  const handleEditChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index: number, field: keyof Omit<EditLineItem, '_key' | 'id'>, value: string) => {
    setEditItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setEditItems((prev) => [
      ...prev,
      { _key: newLineKey(), description: '', type: 'product', quantity: '1', unit_price: '0', tax_rate: '0' },
    ]);
  };

  const removeItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !editForm) return;
    setSaveLoading(true);
    setSaveError(null);
    const token = localStorage.getItem('auth_token') ?? undefined;
    const payload: UpdateInvoiceData = {
      invoice_number: editForm.invoice_number || undefined,
      status: editForm.status,
      customer_first_name: editForm.customer_first_name,
      customer_last_name: editForm.customer_last_name,
      customer_email: editForm.customer_email,
      customer_phone: editForm.customer_phone,
      billing_address: {
        street: editForm.billing_address_street,
        city: editForm.billing_address_city,
        postal_code: editForm.billing_address_postal_code,
        country: editForm.billing_address_country,
      },
      subtotal: editForm.subtotal,
      total: editForm.total,
      notes: editForm.notes || null,
      items: editItems.map((item) => ({
        ...(item.id !== undefined ? { id: item.id } : {}),
        description: item.description,
        type: item.type,
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        tax_rate: parseFloat(item.tax_rate) || 0,
        total: computeLineTotal(item.quantity, item.unit_price),
      })),
    };
    try {
      const updated = await updateInvoice(selectedInvoice.id, payload, token);
      setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
      setSelectedInvoice(updated);
      setIsEditing(false);
      setEditForm(null);
      setEditItems([]);
    } catch (err) {
      console.error('Failed to update invoice:', err);
      setSaveError(t.errUpdate);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInvoice) return;
    setDeleteLoading(true);
    const token = localStorage.getItem('auth_token') ?? undefined;
    try {
      await deleteInvoice(selectedInvoice.id, token);
      setInvoices((prev) => prev.filter((inv) => inv.id !== selectedInvoice.id));
      closeModal();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      setSaveError(t.errDelete);
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  };

  const handleOpenOrder = async () => {
    if (!selectedInvoice?.order_id) return;
    setModalView('order');
    setOrderLoading(true);
    setOrderError(null);
    const token = localStorage.getItem('auth_token') ?? undefined;
    try {
      const order = await fetchOrderById(selectedInvoice.order_id, token);
      setOrderData(order);
    } catch (err) {
      console.error('Failed to load order:', err);
      setOrderError(t.errLoad);
    } finally {
      setOrderLoading(false);
    }
  };

  // Create invoice handlers
  const handleOpenCreate = async () => {
    setCreateForm(emptyFormData());
    setCreateItems([]);
    setCreateSelectedOrderId('');
    setCreateSaveError(null);
    setCreateOpen(true);
    setCreateOrdersLoading(true);
    const token = localStorage.getItem('auth_token') ?? undefined;
    try {
      const orders = await fetchAllOrders(token);
      setCreateOrdersList(orders);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setCreateOrdersList([]);
    } finally {
      setCreateOrdersLoading(false);
    }
  };

  const handleCreateOrderSelect = (orderId: string) => {
    setCreateSelectedOrderId(orderId);
    if (!orderId) {
      setCreateForm(emptyFormData());
      setCreateItems([]);
      return;
    }
    const order = createOrdersList.find((o) => String(o.id) === orderId);
    if (!order) return;

    // Sum order items for subtotal / total
    const subtotal = (order.items ?? []).reduce((s, item) => {
      const v = parseFloat(String(item.subtotal ?? item.unit_price ?? 0));
      return s + (isNaN(v) ? 0 : v * (item.quantity ?? 1));
    }, 0);
    const total = parseFloat(String(order.total_amount ?? order.total ?? subtotal)) || subtotal;

    setCreateForm({
      invoice_number: '',
      status: 'draft',
      customer_first_name: order.customer_first_name ?? '',
      customer_last_name: order.customer_last_name ?? '',
      customer_email: order.customer_email ?? '',
      customer_phone: order.customer_phone ?? '',
      billing_address_street: order.billing_address?.street ?? '',
      billing_address_city: order.billing_address?.city ?? '',
      billing_address_postal_code: order.billing_address?.postal_code ?? '',
      billing_address_country: order.billing_address?.country ?? '',
      subtotal: String(subtotal),
      total: String(total),
      notes: '',
    });

    setCreateItems(
      (order.items ?? []).map((item) => ({
        _key: newLineKey(),
        description: item.product_title ?? `Product #${item.product_id}`,
        type: 'product',
        quantity: String(item.quantity ?? 1),
        unit_price: String(item.unit_price ?? item.sale_price ?? '0'),
        tax_rate: '0',
      }))
    );
  };

  const handleCreateFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setCreateForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateItemChange = (index: number, field: keyof Omit<EditLineItem, '_key' | 'id'>, value: string) => {
    setCreateItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addCreateItem = () => {
    setCreateItems((prev) => [
      ...prev,
      { _key: newLineKey(), description: '', type: 'product', quantity: '1', unit_price: '0', tax_rate: '0' },
    ]);
  };

  const removeCreateItem = (index: number) => {
    setCreateItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateSave = async (e: FormEvent) => {
    e.preventDefault();
    setCreateSaveLoading(true);
    setCreateSaveError(null);
    const token = localStorage.getItem('auth_token') ?? undefined;
    const orderId = createSelectedOrderId ? parseInt(createSelectedOrderId, 10) : undefined;
    const payload: CreateInvoiceData = {
      ...(orderId !== undefined ? { order_id: orderId } : {}),
      ...(createForm.invoice_number ? { invoice_number: createForm.invoice_number } : {}),
      status: createForm.status,
      customer_first_name: createForm.customer_first_name,
      customer_last_name: createForm.customer_last_name,
      customer_email: createForm.customer_email,
      customer_phone: createForm.customer_phone,
      billing_address: {
        street: createForm.billing_address_street,
        city: createForm.billing_address_city,
        postal_code: createForm.billing_address_postal_code,
        country: createForm.billing_address_country,
      },
      subtotal: createForm.subtotal,
      total: createForm.total,
      notes: createForm.notes || null,
      items: createItems.map((item) => ({
        description: item.description,
        type: item.type,
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        tax_rate: parseFloat(item.tax_rate) || 0,
        total: computeLineTotal(item.quantity, item.unit_price),
      })),
    };
    try {
      const created = await createInvoice(payload, token);
      setInvoices((prev) => [created, ...prev]);
      setCreateOpen(false);
    } catch (err) {
      console.error('Failed to create invoice:', err);
      setCreateSaveError(t.errCreate);
    } finally {
      setCreateSaveLoading(false);
    }
  };

  const closeCreateModal = () => {
    if (createSaveLoading) return;
    setCreateOpen(false);
  };

  const cartCount = getCart().reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <EcommerceHeader
        title={t.title}
        backTo="/demo/ecommerce/admin"
        backLabel={translations[language].adminDashboard.title}
        cartCount={cartCount}
        activeNav="admin-dashboard"
      />

      <main className="container mx-auto px-4 py-8">
        {authError && (
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
            <p className="text-lg text-yellow-300 mb-4">{authError}</p>
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
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-gray-300">{t.loading}</p>
          </div>
        )}

        {invoicesError && !loading && !authError && (
          <div className="mx-auto max-w-2xl rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-center">
            <p className="text-red-300">{invoicesError}</p>
          </div>
        )}

        {!loading && !authError && !invoicesError && (
          <>
            {/* Toolbar */}
            <div className="mx-auto mb-4 max-w-5xl flex justify-end">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                {t.btnNewInvoice}
              </button>
            </div>

            {/* Search form */}
            <form
              onSubmit={handleSearchSubmit}
              className="mx-auto mb-6 max-w-5xl rounded-lg border border-gray-700 bg-gray-800 px-4 py-4 sm:px-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                <div className="flex-1">
                  <label htmlFor="search-invoice-id" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {t.searchInvoiceIdLabel}
                  </label>
                  <input
                    id="search-invoice-id"
                    type="text"
                    value={searchInvoiceId}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => { setSearchInvoiceId(e.target.value); setCurrentPage(1); }}
                    placeholder={t.searchInvoicePlaceholder}
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="search-order-id" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {t.searchOrderIdLabel}
                  </label>
                  <input
                    id="search-order-id"
                    type="text"
                    value={searchOrderId}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => { setSearchOrderId(e.target.value); setCurrentPage(1); }}
                    placeholder={t.searchOrderPlaceholder}
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 transition-colors sm:flex-none"
                  >
                    {t.btnSearch}
                  </button>
                  <button
                    type="button"
                    onClick={handleSearchReset}
                    className="flex-1 rounded-lg border border-gray-600 px-5 py-2 font-semibold text-gray-300 hover:bg-gray-700 transition-colors sm:flex-none"
                  >
                    {t.btnReset}
                  </button>
                </div>
              </div>
            </form>

            {filteredInvoices.length === 0 ? (
              <div className="text-center py-10 text-gray-400">{t.empty}</div>
            ) : (
              <>
                {/* Mobile: card list */}
                <div className="mx-auto max-w-5xl space-y-3 md:hidden">
                  {pagedInvoices.map((invoice) => (
                    <button
                      key={invoice.id}
                      onClick={() => openModal(invoice)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-4 text-left hover:border-gray-600 hover:bg-gray-750 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-semibold text-blue-300">{invoice.invoice_number}</span>
                        <StatusBadge status={invoice.status} label={getStatusOption(invoice.status)?.label} color={getStatusOption(invoice.status)?.color} />
                      </div>
                      <p className="mt-1 text-sm text-gray-200">
                        {invoice.customer_first_name} {invoice.customer_last_name}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                        <span>{t.cardSubtotal} <span className="text-gray-200">{formatPrice(invoice.subtotal)}</span></span>
                        <span>{t.cardTotal} <span className="text-gray-200">{formatPrice(invoice.total)}</span></span>
                        {invoice.issued_at && (
                          <span>{t.cardIssued} <span className="text-gray-200">{new Date(invoice.issued_at).toLocaleDateString()}</span></span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="mx-auto hidden max-w-5xl overflow-hidden rounded-lg border border-gray-700 bg-gray-800 md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="border-b border-gray-700">
                        <tr className="text-xs uppercase tracking-wider text-gray-400">
                          <th className="px-5 py-3">{t.colInvoice}</th>
                          <th className="px-5 py-3">{t.colCustomer}</th>
                          <th className="px-5 py-3">{t.colStatus}</th>
                          <th className="px-5 py-3">{t.colIssued}</th>
                          <th className="px-5 py-3">{t.colSubtotal}</th>
                          <th className="px-5 py-3">{t.colTotal}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {pagedInvoices.map((invoice) => (
                          <tr
                            key={invoice.id}
                            onClick={() => openModal(invoice)}
                            className="cursor-pointer hover:bg-gray-700/50 transition-colors"
                          >
                            <td className="px-5 py-4 font-mono text-sm text-blue-300">{invoice.invoice_number}</td>
                            <td className="px-5 py-4 text-gray-200">
                              {invoice.customer_first_name} {invoice.customer_last_name}
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge status={invoice.status} label={getStatusOption(invoice.status)?.label} color={getStatusOption(invoice.status)?.color} />
                            </td>
                            <td className="px-5 py-4 text-gray-400 text-sm">
                              {invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : <span className="text-gray-600">—</span>}
                            </td>
                            <td className="px-5 py-4 text-gray-300">{formatPrice(invoice.subtotal)}</td>
                            <td className="px-5 py-4 text-gray-300">{formatPrice(invoice.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mx-auto mt-2 max-w-5xl px-1">
                  <p className="text-sm text-gray-500">
                    {t.showingOf
                      .replace('{start}', String((currentPage - 1) * ITEMS_PER_PAGE + 1))
                      .replace('{end}', String(Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)))
                      .replace('{total}', String(filteredInvoices.length))}
                  </p>
                </div>

                {totalPages > 1 && (
                  <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                      aria-label="Previous page"
                    >
                      ←
                    </button>

                    {getPageNumbers().map((page, index) =>
                      page === -1 ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 rounded transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                      aria-label="Next page"
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Invoice / Order modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} aria-hidden="true" />
          <div className="relative w-full sm:max-w-2xl max-h-[92dvh] rounded-t-2xl sm:rounded-2xl bg-gray-800 border border-gray-700 shadow-2xl flex flex-col overflow-hidden">

            {modalView === 'order' ? (
              /* ── Order view ── */
              <>
                <div className="flex shrink-0 items-center gap-3 border-b border-gray-700 px-5 py-4">
                  <button
                    onClick={() => setModalView('invoice')}
                    className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                    aria-label="Back to invoice"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Order #{selectedInvoice.order_id}</p>
                    <h2 className="text-sm font-bold text-white leading-tight">{t.sectionOrderInfo}</h2>
                  </div>
                  <button
                    onClick={closeModal}
                    className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="overflow-y-auto px-5 py-5 space-y-5">
                  {orderLoading && (
                    <div className="flex justify-center py-10">
                      <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                  {orderError && (
                    <p className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">{orderError}</p>
                  )}
                  {!orderLoading && !orderError && orderData && (
                    <>
                      {/* Order meta */}
                      <section>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionOrderInfo}</h3>
                        <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                          <p className="text-gray-300"><span className="text-gray-500">ID: </span>#{orderData.id}</p>
                          {orderData.status && (
                            <p className="flex items-center gap-1.5 text-gray-300">
                              <span className="text-gray-500">Status: </span>
                              <StatusBadge status={orderData.status} label={getStatusOption(orderData.status)?.label} color={getStatusOption(orderData.status)?.color} />
                            </p>
                          )}
                          <p className="text-gray-300 col-span-2">
                            <span className="text-gray-500">{t.labelOrderCustomer} </span>
                            {orderData.customer_first_name} {orderData.customer_last_name}
                          </p>
                          {orderData.created_at && (
                            <p className="text-gray-300"><span className="text-gray-500">{t.labelOrderCreated} </span>{new Date(orderData.created_at).toLocaleDateString()}</p>
                          )}
                          {orderData.total !== undefined && (
                            <p className="text-gray-300">
                              <span className="text-gray-500">{t.labelOrderTotal} </span>
                              <span className="font-semibold text-white">{formatPrice(orderData.total)}</span>
                            </p>
                          )}
                        </div>
                      </section>

                      {/* Shipping address */}
                      {orderData.shipping_address && (
                        <section>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionShipping}</h3>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            {orderData.shipping_address.street}<br />
                            {orderData.shipping_address.postal_code} {orderData.shipping_address.city}<br />
                            {orderData.shipping_address.country}
                          </p>
                        </section>
                      )}

                      {/* Order items */}
                      {orderData.items && orderData.items.length > 0 && (
                        <section>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                            {t.sectionOrderItems} ({orderData.items.length})
                          </h3>
                          <div className="space-y-2">
                            {orderData.items.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 px-3 py-3">
                                {item.featured_image ? (
                                  <img
                                    src={item.featured_image as string}
                                    alt={item.product_title ?? ''}
                                    className="h-10 w-10 shrink-0 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 shrink-0 rounded bg-gray-700 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{item.product_title ?? `Product #${item.product_id}`}</p>
                                  <p className="text-xs text-gray-400">
                                    {t.labelItemQty} {item.quantity} &middot; {formatPrice(item.unit_price ?? item.price ?? item.sale_price)}
                                  </p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold text-white">{formatPrice(item.subtotal)}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {orderData.notes && (
                        <section>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionOrderNotes}</h3>
                        </section>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : isEditing && editForm ? (
              /* ── Edit form ── */
              <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex shrink-0 items-center justify-between border-b border-gray-700 px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-base font-bold text-blue-300 truncate">{selectedInvoice.invoice_number}</span>
                    <span className="text-xs text-gray-400">{t.editingLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saveLoading}
                    className="ml-2 shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                    aria-label="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                  {/* Invoice Number */}
                  <fieldset>
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionInvoiceNumber}</legend>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="invoice_number"
                        value={editForm.invoice_number}
                        onChange={handleEditChange}
                        placeholder={t.invoiceNumPlaceholder}
                        className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white font-mono text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setEditForm(prev => prev ? { ...prev, invoice_number: generateInvoiceNumber() } : prev)}
                        className="shrink-0 rounded-lg border border-gray-600 px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        title={t.titleGenerateNumber}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </fieldset>

                  {/* Status */}
                  <fieldset>
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionStatus}</legend>
                    <select
                      name="status"
                      value={editForm.status}
                      onChange={handleEditChange}
                      className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {statusOptions.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </fieldset>

                  {/* Customer */}
                  <fieldset>
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionCustomerEdit}</legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">{t.labelFirstName}</label>
                        <input type="text" name="customer_first_name" value={editForm.customer_first_name} onChange={handleEditChange}
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">{t.labelLastName}</label>
                        <input type="text" name="customer_last_name" value={editForm.customer_last_name} onChange={handleEditChange}
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">{t.labelEmailEdit}</label>
                        <input type="email" name="customer_email" value={editForm.customer_email} onChange={handleEditChange}
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">{t.labelPhoneEdit}</label>
                        <input type="tel" name="customer_phone" value={editForm.customer_phone} onChange={handleEditChange}
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </div>
                  </fieldset>

                  {/* Billing address */}
                  <fieldset>
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionBillingEdit}</legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-gray-400">{t.labelStreet}</label>
                        <input type="text" name="billing_address_street" value={editForm.billing_address_street} onChange={handleEditChange}
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">{t.labelCity}</label>
                        <input type="text" name="billing_address_city" value={editForm.billing_address_city} onChange={handleEditChange}
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">{t.labelPostalCode}</label>
                        <input type="text" name="billing_address_postal_code" value={editForm.billing_address_postal_code} onChange={handleEditChange}
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">{t.labelCountry}</label>
                        <CountrySelect name="billing_address_country" value={editForm.billing_address_country} onChange={handleEditChange}
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </div>
                  </fieldset>

                  {/* Invoice lines */}
                  <fieldset>
                    <div className="mb-2 flex items-center justify-between">
                      <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionLinesEdit}</legend>
                      <button
                        type="button"
                        onClick={addItem}
                        className="flex items-center gap-1 rounded-lg border border-gray-600 px-3 py-1 text-xs font-semibold text-gray-300 hover:bg-gray-700 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        {t.btnAddLine}
                      </button>
                    </div>
                    {editItems.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-gray-600 py-6 text-center text-sm text-gray-500">
                        {t.emptyLines}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {editItems.map((item, index) => (
                          <div key={item._key} className="rounded-lg border border-gray-600 bg-gray-900 p-3">
                            {/* Row 1: type + description + remove */}
                            <div className="flex gap-2 mb-2">
                              <select
                                value={item.type}
                                onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                                className="w-28 shrink-0 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                              >
                                {itemTypeOptions.map((t) => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder={t.descriptionPlaceholder}
                                value={item.description}
                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                className="flex-1 min-w-0 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-red-900/40 hover:text-red-400 transition-colors"
                                aria-label="Remove line"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                            {/* Row 2: qty + unit price + tax rate + auto total */}
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <div>
                                <label className="mb-0.5 block text-xs text-gray-500">{t.labelQty}</label>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                  step="1"
                                  className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="mb-0.5 block text-xs text-gray-500">{t.labelUnitPrice}</label>
                                <input
                                  type="number"
                                  value={item.unit_price}
                                  onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                  step="0.01"
                                  className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="mb-0.5 block text-xs text-gray-500">{t.labelTaxRate}</label>
                                <TaxRateCombobox
                                  itemKey={item._key}
                                  value={item.tax_rate}
                                  onChange={(val) => handleItemChange(index, 'tax_rate', val)}
                                  inputCls="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="mb-0.5 block text-xs text-gray-500">{t.labelTotalAuto}</label>
                                <div className="rounded border border-gray-700 bg-gray-800/50 px-2 py-1.5 text-xs text-gray-300">
                                  {formatPrice(computeLineTotal(item.quantity, item.unit_price))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </fieldset>

                  {/* Amounts */}
                  <fieldset>
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionAmountsEdit}</legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">{t.labelSubtotalEdit}</label>
                        <input type="number" name="subtotal" value={editForm.subtotal} onChange={handleEditChange}
                          step="0.01" min="0"
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">{t.labelTotalEdit}</label>
                        <input type="number" name="total" value={editForm.total} onChange={handleEditChange}
                          step="0.01" min="0"
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    </div>
                  </fieldset>

                  {/* Notes */}
                  <fieldset>
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionNotesEdit}</legend>
                    <textarea name="notes" value={editForm.notes} onChange={handleEditChange}
                      rows={3}
                      className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                  </fieldset>

                  {saveError && (
                    <p className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">{saveError}</p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2 border-t border-gray-700 px-5 py-4">
                  <button type="button" onClick={cancelEditing} disabled={saveLoading}
                    className="flex-1 rounded-lg border border-gray-600 py-2.5 font-semibold text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50">
                    {t.btnCancelEdit}
                  </button>
                  <button type="submit" disabled={saveLoading}
                    className="flex-1 rounded-lg bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {saveLoading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    {saveLoading ? t.btnSaving : t.btnSaveChanges}
                  </button>
                </div>
              </form>
            ) : (
              /* ── View mode ── */
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex shrink-0 items-center justify-between border-b border-gray-700 px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-base font-bold text-blue-300 truncate">{selectedInvoice.invoice_number}</span>
                    <StatusBadge status={selectedInvoice.status} label={getStatusOption(selectedInvoice.status)?.label} color={getStatusOption(selectedInvoice.status)?.color} />
                  </div>
                  <button
                    onClick={closeModal}
                    disabled={saveLoading || deleteLoading}
                    className="ml-2 shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                    aria-label="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                  {/* Customer info */}
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionCustomer}</h3>
                    <div className="grid grid-cols-1 gap-y-1 text-sm sm:grid-cols-2 sm:gap-x-6">
                      <p className="text-gray-300"><span className="text-gray-500">{t.labelName} </span>{selectedInvoice.customer_first_name} {selectedInvoice.customer_last_name}</p>
                      <p className="text-gray-300"><span className="text-gray-500">{t.labelEmail} </span>{selectedInvoice.customer_email || '\u2014'}</p>
                      <p className="text-gray-300"><span className="text-gray-500">{t.labelPhone} </span>{selectedInvoice.customer_phone || '\u2014'}</p>
                    </div>
                  </section>

                  {/* Billing address */}
                  {selectedInvoice.billing_address && (
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionBilling}</h3>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {selectedInvoice.billing_address.street}<br />
                        {selectedInvoice.billing_address.postal_code} {selectedInvoice.billing_address.city}<br />
                        {selectedInvoice.billing_address.country}
                      </p>
                    </section>
                  )}

                  {/* Invoice line items */}
                  {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {t.sectionLines} ({selectedInvoice.items.length})
                      </h3>
                      <div className="rounded-lg border border-gray-700 overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="border-b border-gray-700 bg-gray-900/50">
                            <tr className="text-gray-500">
                              <th className="px-3 py-2 text-left font-medium">{t.colDescription}</th>
                              <th className="px-3 py-2 text-right font-medium">{t.colQty}</th>
                              <th className="px-3 py-2 text-right font-medium">{t.colUnit}</th>
                              <th className="px-3 py-2 text-right font-medium">{t.colTotal}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700/50">
                            {selectedInvoice.items.map((item) => (
                              <tr key={item.id} className="bg-gray-900">
                                <td className="px-3 py-2">
                                  <span className="text-gray-300">{item.description}</span>
                                  <span className="ml-1.5 text-gray-600 capitalize">({item.type})</span>
                                </td>
                                <td className="px-3 py-2 text-right text-gray-400">{item.quantity}</td>
                                <td className="px-3 py-2 text-right text-gray-400">{formatPrice(item.unit_price)}</td>
                                <td className="px-3 py-2 text-right font-medium text-gray-200">{formatPrice(item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {/* Amounts */}
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionAmounts}</h3>
                    <div className="flex gap-8 text-sm">
                      <p className="text-gray-300"><span className="text-gray-500">{t.labelSubtotal} </span>{formatPrice(selectedInvoice.subtotal)}</p>
                      <p className="text-gray-300"><span className="text-gray-500">{t.labelTotal} </span><span className="font-semibold text-white">{formatPrice(selectedInvoice.total)}</span></p>
                    </div>
                  </section>

                  {/* Other */}
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionOther}</h3>
                    <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{t.labelOrderId}</span>
                        {selectedInvoice.order_id ? (
                          <button
                            type="button"
                            onClick={handleOpenOrder}
                            className="font-medium text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
                          >
                            #{selectedInvoice.order_id}
                          </button>
                        ) : (
                          <span className="text-gray-300">\u2014</span>
                        )}
                      </div>
                      <p className="text-gray-300"><span className="text-gray-500">{t.labelUserId} </span>{selectedInvoice.user_id}</p>
                      {selectedInvoice.issued_at && (
                        <p className="text-gray-300"><span className="text-gray-500">{t.labelIssued} </span>{new Date(selectedInvoice.issued_at).toLocaleDateString()}</p>
                      )}
                      {selectedInvoice.paid_at && (
                        <p className="text-gray-300"><span className="text-gray-500">{t.labelPaid} </span>{new Date(selectedInvoice.paid_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </section>

                  {selectedInvoice.notes && (
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionNotes}</h3>
                    </section>
                  )}

                  {saveError && (
                    <p className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">{saveError}</p>
                  )}

                  {deleteConfirm && (
                    <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
                      <p className="mb-3 text-sm font-medium text-red-300">{t.deleteConfirm}</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setDeleteConfirm(false)} disabled={deleteLoading}
                          className="flex-1 rounded-lg border border-gray-600 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50">
                          Cancel
                        </button>
                        <button type="button" onClick={handleDelete} disabled={deleteLoading}
                          className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                          {deleteLoading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                          {deleteLoading ? 'Deleting\u2026' : 'Yes, delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 gap-2 border-t border-gray-700 px-5 py-4">
                  <button type="button" onClick={() => setDeleteConfirm(true)} disabled={deleteLoading || deleteConfirm}
                    className="rounded-lg border border-red-700/60 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-50">
                    {t.btnDelete}
                  </button>
                  <button type="button" onClick={startEditing}
                    className="flex-1 rounded-lg bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 transition-colors">
                    {t.btnEdit}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Invoice modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeCreateModal} aria-hidden="true" />
          <div className="relative w-full sm:max-w-2xl max-h-[92dvh] rounded-t-2xl sm:rounded-2xl bg-gray-800 border border-gray-700 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-700 px-5 py-4">
              <h2 className="text-base font-bold text-white">{t.createTitle}</h2>
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={createSaveLoading}
                className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

                {/* Order selector */}
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionLinkOrder}</legend>
                  {createOrdersLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                      {t.loadingOrders}
                    </div>
                  ) : (
                    <select
                      value={createSelectedOrderId}
                      onChange={(e) => handleCreateOrderSelect(e.target.value)}
                      className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">{t.noOrder}</option>
                      {createOrdersList.map((order) => (
                        <option key={order.id} value={String(order.id)}>
                          {order.order_number ?? `#${order.id}`}
                          {order.customer_first_name ? ` — ${order.customer_first_name} ${order.customer_last_name ?? ''}` : ''}
                          {order.total_amount ? ` (${formatPrice(order.total_amount)})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {createSelectedOrderId && (
                    <p className="mt-1.5 text-xs text-green-400">{t.autoPopulated}</p>
                  )}
                </fieldset>

                {/* Invoice Number */}
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionInvoiceNumber}</legend>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="invoice_number"
                      value={createForm.invoice_number}
                      onChange={handleCreateFormChange}
                      placeholder={t.invoiceNumPlaceholder}
                      className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white font-mono text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setCreateForm(prev => ({ ...prev, invoice_number: generateInvoiceNumber() }))}
                      className="shrink-0 rounded-lg border border-gray-600 px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      title={t.titleGenerateNumber}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </fieldset>

                {/* Status */}
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionStatus}</legend>
                  <select
                    name="status"
                    value={createForm.status}
                    onChange={handleCreateFormChange}
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {statusOptions.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </fieldset>

                {/* Customer */}
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionCustomerEdit}</legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">{t.labelFirstName}</label>
                      <input type="text" name="customer_first_name" value={createForm.customer_first_name} onChange={handleCreateFormChange}
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">{t.labelLastName}</label>
                      <input type="text" name="customer_last_name" value={createForm.customer_last_name} onChange={handleCreateFormChange}
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">{t.labelEmailEdit}</label>
                      <input type="email" name="customer_email" value={createForm.customer_email} onChange={handleCreateFormChange}
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">{t.labelPhoneEdit}</label>
                      <input type="tel" name="customer_phone" value={createForm.customer_phone} onChange={handleCreateFormChange}
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                </fieldset>

                {/* Billing address */}
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionBillingEdit}</legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-gray-400">{t.labelStreet}</label>
                      <input type="text" name="billing_address_street" value={createForm.billing_address_street} onChange={handleCreateFormChange}
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">{t.labelCity}</label>
                      <input type="text" name="billing_address_city" value={createForm.billing_address_city} onChange={handleCreateFormChange}
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">{t.labelPostalCode}</label>
                      <input type="text" name="billing_address_postal_code" value={createForm.billing_address_postal_code} onChange={handleCreateFormChange}
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">{t.labelCountry}</label>
                      <CountrySelect name="billing_address_country" value={createForm.billing_address_country} onChange={handleCreateFormChange}
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                </fieldset>

                {/* Invoice lines */}
                <fieldset>
                  <div className="mb-2 flex items-center justify-between">
                    <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionLinesEdit}</legend>
                    <button
                      type="button"
                      onClick={addCreateItem}
                      className="flex items-center gap-1 rounded-lg border border-gray-600 px-3 py-1 text-xs font-semibold text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      {t.btnAddLine}
                    </button>
                  </div>
                  {createItems.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-600 py-6 text-center text-sm text-gray-500">
                      {t.emptyCreateLines}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {createItems.map((item, index) => (
                        <div key={item._key} className="rounded-lg border border-gray-600 bg-gray-900 p-3">
                          <div className="flex gap-2 mb-2">
                            <select
                              value={item.type}
                              onChange={(e) => handleCreateItemChange(index, 'type', e.target.value)}
                              className="w-28 shrink-0 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                            >
                              {itemTypeOptions.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder={t.descriptionPlaceholder}
                              value={item.description}
                              onChange={(e) => handleCreateItemChange(index, 'description', e.target.value)}
                              className="flex-1 min-w-0 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeCreateItem(index)}
                              className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-red-900/40 hover:text-red-400 transition-colors"
                              aria-label="Remove line"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div>
                              <label className="mb-0.5 block text-xs text-gray-500">{t.labelQty}</label>
                              <input type="number" value={item.quantity} onChange={(e) => handleCreateItemChange(index, 'quantity', e.target.value)}
                                step="1"
                                className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none" />
                            </div>
                            <div>
                              <label className="mb-0.5 block text-xs text-gray-500">{t.labelUnitPrice}</label>
                              <input type="number" value={item.unit_price} onChange={(e) => handleCreateItemChange(index, 'unit_price', e.target.value)}
                                step="0.01"
                                className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none" />
                            </div>
                            <div>
                              <label className="mb-0.5 block text-xs text-gray-500">{t.labelTaxRate}</label>
                              <TaxRateCombobox
                                itemKey={item._key}
                                value={item.tax_rate}
                                onChange={(val) => handleCreateItemChange(index, 'tax_rate', val)}
                                inputCls="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-0.5 block text-xs text-gray-500">{t.labelTotalAuto}</label>
                              <div className="rounded border border-gray-700 bg-gray-800/50 px-2 py-1.5 text-xs text-gray-300">
                                {formatPrice(computeLineTotal(item.quantity, item.unit_price))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </fieldset>

                {/* Amounts */}
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionAmountsEdit}</legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">{t.labelSubtotalEdit}</label>
                      <input type="number" name="subtotal" value={createForm.subtotal} onChange={handleCreateFormChange}
                        step="0.01" min="0"
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">{t.labelTotalEdit}</label>
                      <input type="number" name="total" value={createForm.total} onChange={handleCreateFormChange}
                        step="0.01" min="0"
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                </fieldset>

                {/* Notes */}
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{t.sectionNotesEdit}</legend>
                  <textarea name="notes" value={createForm.notes} onChange={handleCreateFormChange}
                    rows={3}
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                </fieldset>

                {createSaveError && (
                  <p className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">{createSaveError}</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex shrink-0 gap-2 border-t border-gray-700 px-5 py-4">
                <button type="button" onClick={closeCreateModal} disabled={createSaveLoading}
                  className="flex-1 rounded-lg border border-gray-600 py-2.5 font-semibold text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50">
                  {t.btnCancelEdit}
                </button>
                <button type="submit" disabled={createSaveLoading}
                  className="flex-1 rounded-lg bg-green-600 py-2.5 font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {createSaveLoading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {createSaveLoading ? t.btnCreating : t.btnCreate}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInvoicesView;
