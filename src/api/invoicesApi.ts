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

export async function createInvoice(data: CreateInvoiceData, token?: string): Promise<Invoice> {
  const url = buildUrl('invoices');

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
