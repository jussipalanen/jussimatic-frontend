const API_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_JUSSILOG_BACKEND_API_BASE_URL environment variable is not set');
}

function buildUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  return `${base}/${endpoint}`;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  order_item_id: number | null;
  type: string;
  description: string;
  quantity: number;
  unit_price: string;
  tax_rate: string;
  total: string;
}

export interface Invoice {
  id: number;
  order_id: number;
  user_id: number;
  invoice_number: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  billing_address: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
  subtotal: string;
  total: string;
  status: string;
  issued_at: string | null;
  paid_at: string | null;
  notes: string | null;
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface InvoicesListResponse {
  data?: Invoice[];
  [key: string]: unknown;
}

export interface UpdateInvoiceItemData {
  id?: number;
  description: string;
  type: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
}

export interface UpdateInvoiceData {
  invoice_number?: string;
  status?: string;
  customer_first_name?: string;
  customer_last_name?: string;
  customer_email?: string;
  customer_phone?: string;
  billing_address?: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
  subtotal?: string;
  total?: string;
  notes?: string | null;
  items?: UpdateInvoiceItemData[];
}

export async function fetchAllInvoices(token?: string): Promise<Invoice[]> {
  const url = buildUrl('invoices');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as InvoicesListResponse;
  if (data && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

export async function updateInvoice(id: number, data: UpdateInvoiceData, token?: string): Promise<Invoice> {
  const url = buildUrl(`invoices/${id}`);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const responseData = (await response.json()) as unknown;
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    const wrapped = (responseData as { data?: Invoice }).data;
    if (wrapped) return wrapped;
  }
  if (responseData && typeof responseData === 'object') {
    return responseData as Invoice;
  }
  throw new Error('Invalid response format when updating invoice');
}

export async function deleteInvoice(id: number, token?: string): Promise<void> {
  const url = buildUrl(`invoices/${id}`);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { method: 'DELETE', headers });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

export interface CreateInvoiceData {
  order_id?: number;
  invoice_number?: string;
  status: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  billing_address: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
  subtotal: string | number;
  total: string | number;
  notes?: string | null;
  items?: UpdateInvoiceItemData[];
}

export async function createInvoice(data: CreateInvoiceData, token?: string, lang?: string): Promise<Invoice> {
  const url = lang ? buildUrl(`invoices?lang=${encodeURIComponent(lang)}`) : buildUrl('invoices');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const responseData = (await response.json()) as unknown;
  if (responseData && typeof responseData === 'object' && 'data' in responseData) {
    const wrapped = (responseData as { data?: Invoice }).data;
    if (wrapped) return wrapped;
  }
  if (responseData && typeof responseData === 'object') {
    return responseData as Invoice;
  }
  throw new Error('Invalid response format when creating invoice');
}

function getAuthToken(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface InvoiceStatusOption {
  value: string;
  label: string;
  color: string;
}

export interface InvoiceItemTypeOption {
  value: string;
  label: string;
}

export interface InvoiceOptionsResponse {
  statuses: InvoiceStatusOption[];
  item_types: InvoiceItemTypeOption[];
}

export async function fetchInvoiceOptions(lang?: string): Promise<InvoiceOptionsResponse> {
  const path = lang ? `invoices/options?lang=${encodeURIComponent(lang)}` : 'invoices/options';
  const response = await fetch(buildUrl(path), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch invoice options: ${response.status}`);
  }
  return response.json() as Promise<InvoiceOptionsResponse>;
}

export async function getMyInvoices(): Promise<Invoice[]> {
  const response = await fetch(buildUrl('my-invoices'), {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthToken() },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Failed to fetch my invoices: ${response.status}`);
  if (Array.isArray(data)) return data as Invoice[];
  if (data && Array.isArray(data.data)) return data.data as Invoice[];
  return [];
}

export async function getInvoice(id: number): Promise<Invoice> {
  const response = await fetch(buildUrl(`invoices/${id}`), {
    method: 'GET',
    headers: { Accept: 'application/json', ...getAuthToken() },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Failed to fetch invoice: ${response.status}`);
  if (data && typeof data === 'object' && 'data' in data) return (data as { data: Invoice }).data;
  return data as Invoice;
}

export async function exportInvoicePdf(id: number): Promise<void> {
  const response = await fetch(buildUrl(`invoices/${id}/pdf`), {
    method: 'GET',
    headers: { Accept: 'application/pdf', ...getAuthToken() },
  });
  if (!response.ok) throw new Error(`Failed to export invoice PDF: ${response.status}`);
  const blob = new Blob([await response.blob()], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function exportInvoiceHtml(id: number): Promise<void> {
  const response = await fetch(buildUrl(`invoices/${id}/html`), {
    method: 'GET',
    headers: { Accept: 'text/html', ...getAuthToken() },
  });
  if (!response.ok) throw new Error(`Failed to export invoice HTML: ${response.status}`);
  const blob = new Blob([await response.blob()], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export interface InvoiceExportPayload {
  lang?: string;
  invoice_number: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email?: string;
  customer_phone?: string;
  billing_address: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
  subtotal: number;
  total: number;
  status: string;
  notes?: string;
  items: {
    type: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    total: number;
  }[];
}

export async function exportInvoicePdfPublic(payload: InvoiceExportPayload): Promise<void> {
  const response = await fetch(buildUrl('invoices/export/pdf'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/pdf' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Failed to export invoice PDF: ${response.status}`);
  const blob = new Blob([await response.blob()], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function exportInvoiceHtmlPublic(payload: InvoiceExportPayload): Promise<void> {
  const response = await fetch(buildUrl('invoices/export/html'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/html' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Failed to export invoice HTML: ${response.status}`);
  const blob = new Blob([await response.blob()], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function sendInvoiceEmailPublic(payload: InvoiceExportPayload & { to_email: string }): Promise<void> {
  const { to_email, billing_address, items, ...flat } = payload;
  const formData = new FormData();
  formData.append('to_email', to_email);
  Object.entries(flat).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  Object.entries(billing_address).forEach(([key, value]) => {
    formData.append(`billing_address[${key}]`, String(value));
  });
  items.forEach((item, index) => {
    Object.entries(item).forEach(([key, value]) => {
      formData.append(`items[${index}][${key}]`, String(value));
    });
  });
  const response = await fetch(buildUrl('invoices/export/email'), {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  });
  if (!response.ok) throw new Error(`Failed to send invoice email: ${response.status}`);
}
