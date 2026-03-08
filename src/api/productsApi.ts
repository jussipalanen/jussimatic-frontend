const API_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_API_BASE_URL;
if (!API_BASE_URL) {
  throw new Error('VITE_JUSSILOG_BACKEND_API_BASE_URL environment variable is not set');
}

function buildUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const endpoint = path.replace(/^\/+/, '');
  return `${base}/${endpoint}`;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
  sale_price: string | null;
  quantity: number;
  featured_image: string | null;
  images: string[];
  visibility: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductsResponse {
  current_page: number;
  data: Product[];
  last_page?: number;
  per_page: number;
  total: number;
}

export interface ProductsQuery {
  search?: string;
  per_page: number;
  page: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export async function fetchProducts(query: ProductsQuery): Promise<ProductsResponse> {
  try {
    const params = new URLSearchParams();
    if (query.search) {
      params.set('search', query.search);
    }
    params.set('per_page', String(query.per_page));
    params.set('page', String(query.page));
    if (query.sort_by) {
      params.set('sort_by', query.sort_by);
    }
    if (query.sort_dir) {
      params.set('sort_dir', query.sort_dir);
    }

    const url = `${buildUrl('products')}?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || typeof data !== 'object' || !Array.isArray((data as ProductsResponse).data)) {
      console.error('Unexpected API response format:', data);
      return {
        current_page: query.page,
        data: [],
        per_page: query.per_page,
        total: 0,
        last_page: 1,
      };
    }

    return data as ProductsResponse;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

export async function fetchProductById(id: number): Promise<Product> {
  try {
    const url = buildUrl(`products/${id}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as Product;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    throw error;
  }
}

export interface CreateProductData {
  title: string;
  description: string;
  price: string;
  sale_price?: string;
  quantity: string;
  visibility: string;
  user_id?: number;
  featured_image?: File;
  images?: File[];
}

export async function createProduct(data: CreateProductData): Promise<Product> {
  try {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('price', data.price);
    if (data.sale_price) {
      formData.append('sale_price', data.sale_price);
    }
    formData.append('quantity', data.quantity);
    formData.append('visibility', data.visibility);
    if (typeof data.user_id === 'number') {
      formData.append('user_id', String(data.user_id));
    }
    
    if (data.featured_image) {
      formData.append('featured_image', data.featured_image);
    }
    
    if (data.images && data.images.length > 0) {
      data.images.forEach((image) => {
        formData.append('images[]', image);
      });
    }

    const url = buildUrl('products');
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const product = await response.json();
    return product as Product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

export interface UpdateProductData {
  title: string;
  description: string;
  price: string;
  sale_price?: string;
  quantity: string;
  visibility: string;
  user_id?: number;
  featured_image?: File;
  images?: File[];
  delete_featured_image?: string;
  delete_images?: string[];
}

export async function updateProduct(id: number, data: UpdateProductData): Promise<Product> {
  try {
    const formData = new FormData();
    formData.append('_method', 'PUT'); // Laravel method spoofing for file uploads
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('price', data.price);
    if (data.sale_price) {
      formData.append('sale_price', data.sale_price);
    }
    formData.append('quantity', data.quantity);
    formData.append('visibility', data.visibility);
    if (typeof data.user_id === 'number') {
      formData.append('user_id', String(data.user_id));
    }
    
    if (data.featured_image) {
      formData.append('featured_image', data.featured_image);
    }
    
    if (data.images && data.images.length > 0) {
      data.images.forEach((image) => {
        formData.append('images[]', image);
      });
    }

    if (data.delete_featured_image) {
      formData.append('delete_featured_image', data.delete_featured_image);
    }

    if (data.delete_images && data.delete_images.length > 0) {
      data.delete_images.forEach((imagePath) => {
        formData.append('delete_images[]', imagePath);
      });
    }

    const url = buildUrl(`products/${id}`);
    const response = await fetch(url, {
      method: 'POST', // Use POST with _method spoofing for Laravel file uploads
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const product = await response.json();
    return product as Product;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

export async function deleteProduct(id: number): Promise<void> {
  try {
    const url = buildUrl(`products/${id}`);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}
