const API_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_JUSSILOG_BACKEND_API_BASE_URL environment variable is not set');
}

function buildUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  return `${base}/${endpoint}`;
}

export interface CreateOrderData {
  user_id?: number;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  billing_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
  notes?: string;
}

export async function createOrder(data: CreateOrderData, lang?: string): Promise<unknown> {
  const url = lang ? buildUrl(`orders?lang=${encodeURIComponent(lang)}`) : buildUrl('orders');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export interface UpdateOrderData {
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  billing_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  status?: string;
  notes?: string;
  items?: Array<{
    product_id: number;
    quantity: number;
    tax_code?: string | null;
    tax_rate?: string | number | null;
  }>;
}

export interface OrderItem {
  product_id: number;
  quantity: number;
  price?: string | number;
  unit_price?: string | number;
  sale_price?: string | number;
  tax_code?: string | null;
  tax_rate?: string | number | null;
  product_title?: string;
  featured_image?: string | null;
  subtotal?: string | number;
  [key: string]: unknown;
}

export interface Order {
  id?: number;
  order_number?: string;
  status?: string;
  total?: number | string;
  total_amount?: string;
  created_at?: string;
  items?: OrderItem[];
  customer_first_name?: string;
  customer_last_name?: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  billing_address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  notes?: string;
  [key: string]: unknown;
}

export interface OrdersListResponse {
  data?: Order[];
  [key: string]: unknown;
}

export async function fetchOrdersByUserId(userId: string | number, token?: string): Promise<Order[]> {
  const params = new URLSearchParams();
  params.set('user_id', String(userId));
  const url = `${buildUrl('orders')}?${params.toString()}`;

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

  const data = (await response.json()) as OrdersListResponse;
  if (data && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

export async function fetchAllOrders(token?: string): Promise<Order[]> {
  const url = buildUrl('orders');

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

  const data = (await response.json()) as OrdersListResponse;
  if (data && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

export async function updateOrder(id: number, data: UpdateOrderData, token?: string): Promise<Order> {
  const url = buildUrl(`orders/${id}`);

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
    const wrapped = (responseData as { data?: Order }).data;
    if (wrapped) {
      return wrapped;
    }
  }

  if (responseData && typeof responseData === 'object') {
    return responseData as Order;
  }

  throw new Error('Invalid response format when updating order');
}

export async function fetchOrderById(id: number, token?: string): Promise<Order> {
  const url = buildUrl(`orders/${id}`);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  if (data && typeof data === 'object' && 'data' in data) {
    const wrapped = (data as { data?: Order }).data;
    if (wrapped) return wrapped;
  }
  if (data && typeof data === 'object') return data as Order;
  throw new Error('Invalid response format when fetching order');
}