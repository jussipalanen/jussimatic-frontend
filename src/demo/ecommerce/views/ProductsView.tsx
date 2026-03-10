import { useSearchParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../../../api/productsApi';
import type { Product, ProductsResponse } from '../../../api/productsApi';
import { addToCart, getCartCount } from '../../../utils/cartUtils';
import EcommerceHeader from '../components/EcommerceHeader';
import { getMe } from '../../../api/authApi';
import { getRoleAccess } from '../../../utils/authUtils';

const STORAGE_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL || '';
const PLACEHOLDER_IMAGE_URL = 'https://placehold.net/default.png';

const SORT_OPTIONS = [
  { value: 'created_at_desc', label: 'Newest First' },
  { value: 'created_at_asc', label: 'Oldest First' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
  { value: 'price_asc', label: 'Price (Low to High)' },
  { value: 'price_desc', label: 'Price (High to Low)' },
  { value: 'sale_price_asc', label: 'Sale Price (Low to High)' },
  { value: 'sale_price_desc', label: 'Sale Price (High to Low)' },
  { value: 'quantity_asc', label: 'Quantity (Low to High)' },
  { value: 'quantity_desc', label: 'Quantity (High to Low)' },
  { value: 'updated_at_desc', label: 'Recently Updated' },
  { value: 'updated_at_asc', label: 'Least Recently Updated' },
];

function ProductsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const urlSearch = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [appliedSearch, setAppliedSearch] = useState(urlSearch);
  const urlSortBy = searchParams.get('sort_by') || 'created_at';
  const urlSortDir = (searchParams.get('sort_dir') as 'asc' | 'desc') || 'desc';
  const [sortBy, setSortBy] = useState(urlSortBy);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(urlSortDir);
  const [perPage, setPerPage] = useState(9);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<ProductsResponse | null>(null);
  const [activeModal, setActiveModal] = useState<'details' | 'create' | 'edit' | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [formValues, setFormValues] = useState({
    title: '',
    description: '',
    price: '',
    salePrice: '',
    quantity: '',
    visibility: 'show',
  });
  const [featuredPreview, setFeaturedPreview] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [featuredFile, setFeaturedFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingFeaturedImage, setExistingFeaturedImage] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [deleteFeaturedImage, setDeleteFeaturedImage] = useState(false);
  const [deleteImagePaths, setDeleteImagePaths] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cartCount, setCartCount] = useState(getCartCount());
  const [showCartSuccess, setShowCartSuccess] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [canManageProducts, setCanManageProducts] = useState(false);

  const totalPages = useMemo(() => {
    if (pagination?.last_page) return pagination.last_page;
    if (pagination) {
      return Math.max(1, Math.ceil(pagination.total / pagination.per_page));
    }
    return 1;
  }, [pagination]);

  useEffect(() => {
    loadProducts(1, appliedSearch, perPage, sortBy, sortDir);
  }, [appliedSearch, perPage, sortBy, sortDir]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const me = await getMe();
        const access = getRoleAccess(me);
        setCanManageProducts(access.isAdmin || access.isVendor);
        const candidateId = (me as { user_id?: number; id?: number; user?: { id?: number } })?.user_id
          ?? (me as { user?: { id?: number } })?.user?.id
          ?? (me as { id?: number })?.id;
        setCurrentUserId(typeof candidateId === 'number' ? candidateId : null);
      } catch (err) {
        console.warn('Failed to load current user:', err);
        setCurrentUserId(null);
        setCanManageProducts(false);
      }
    };

    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!canManageProducts && (activeModal === 'create' || activeModal === 'edit')) {
      closeModal();
    }
  }, [canManageProducts, activeModal]);


  const loadProducts = async (page: number, search: string, limit: number, sortBy: string, sortDir: 'asc' | 'desc') => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProducts({
        search: search || undefined,
        per_page: limit,
        page,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      const safePage = Math.min(page, data.last_page ?? Math.max(1, Math.ceil(data.total / data.per_page)));
      if (safePage !== page) {
        setCurrentPage(safePage);
        setPagination(data);
        setProducts(data.data);
        return;
      }
      setPagination(data);
      setProducts(data.data);
    } catch (err) {
      setError('Failed to load products. Please try again later.');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string | null) => {
    if (!price) return 'N/A';
    return `€${parseFloat(price).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const buildStorageUrl = (path: string | null | undefined) => {
    if (!path) return PLACEHOLDER_IMAGE_URL;
    if (!STORAGE_BASE_URL) return path;
    const base = STORAGE_BASE_URL.replace(/\/+$/, '');
    const endpoint = path.replace(/^\/+/, '');
    return `${base}/${endpoint}`;
  };

  const resetForm = () => {
    setFormValues({
      title: '',
      description: '',
      price: '',
      salePrice: '',
      quantity: '',
      visibility: 'show',
    });
    if (featuredPreview) {
      URL.revokeObjectURL(featuredPreview);
    }
    setFeaturedPreview(null);
    imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    setImagePreviews([]);
    setFeaturedFile(null);
    setImageFiles([]);
    setExistingFeaturedImage(null);
    setExistingImages([]);
    setDeleteFeaturedImage(false);
    setDeleteImagePaths([]);
    setFormErrors({});
    setSubmitting(false);
  };

  const openDetailsModal = (product: Product) => {
    setActiveProduct(product);
    setActiveModal('details');
  };

  const openCreateModal = () => {
    if (!canManageProducts) return;
    setActiveProduct(null);
    resetForm();
    setActiveModal('create');
  };

  const openEditModal = (product: Product) => {
    if (!canManageProducts) return;
    setActiveProduct(product);
    setFormValues({
      title: product.title ?? '',
      description: product.description ?? '',
      price: product.price ?? '',
      salePrice: product.sale_price ?? '',
      quantity: String(product.quantity ?? ''),
      visibility: product.visibility ? 'show' : 'hidden',
    });
    if (featuredPreview) {
      URL.revokeObjectURL(featuredPreview);
    }
    
    // Track existing featured image
    setExistingFeaturedImage(product.featured_image || null);
    setFeaturedPreview(null);
    setDeleteFeaturedImage(false);
    
    imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    
    // Track existing images
    setExistingImages(product.images || []);
    setImagePreviews([]);
    setDeleteImagePaths([]);
    
    // Clear file objects (for new uploads only)
    setFeaturedFile(null);
    setImageFiles([]);
    
    setActiveModal('edit');
  };

  const closeModal = () => {
    setActiveModal(null);
    setActiveProduct(null);
    setZoomImage(null);
    setShowDeleteConfirm(false);
    resetForm();
  };

  const handleDeleteExistingFeaturedImage = () => {
    setExistingFeaturedImage(null);
    setDeleteFeaturedImage(true);
  };

  const handleDeleteExistingImage = (imagePath: string) => {
    setExistingImages(prev => prev.filter(img => img !== imagePath));
    setDeleteImagePaths(prev => [...prev, imagePath]);
  };

  const handleFeaturedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (featuredPreview) {
      URL.revokeObjectURL(featuredPreview);
    }
    setFeaturedPreview(file ? URL.createObjectURL(file) : null);
    setFeaturedFile(file);
    
    // Validate file
    if (file) {
      const errors: Record<string, string> = {};
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!validTypes.includes(file.type)) {
        errors.featured_image = 'Invalid file type. Allowed: JPG, PNG, GIF, WebP';
      } else if (file.size > maxSize) {
        errors.featured_image = 'File too large. Maximum size is 5MB';
      }
      
      setFormErrors((prev) => ({ ...prev, ...errors }));
      if (!errors.featured_image && formErrors.featured_image) {
        setFormErrors((prev) => {
          const { featured_image, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
    setImageFiles(files);
    
    // Validate files
    const errors: Record<string, string> = {};
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const maxCount = 15;
    
    if (files.length > maxCount) {
      errors.images = `Too many files. Maximum is ${maxCount} images`;
    } else {
      for (const file of files) {
        if (!validTypes.includes(file.type)) {
          errors.images = 'Invalid file type. All files must be JPG, PNG, GIF, or WebP';
          break;
        }
        if (file.size > maxSize) {
          errors.images = 'One or more files exceed 5MB limit';
          break;
        }
      }
    }
    
    setFormErrors((prev) => ({ ...prev, ...errors }));
    if (!errors.images && formErrors.images) {
      setFormErrors((prev) => {
        const { images, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleSearchSubmit = () => {
    const trimmed = searchInput.trim();
    setAppliedSearch(trimmed);
    setCurrentPage(1);
    
    // Update URL with search and sort params
    const params: Record<string, string> = {};
    if (trimmed) params.search = trimmed;
    if (sortBy !== 'created_at' || sortDir !== 'desc') {
      params.sort_by = sortBy;
      params.sort_dir = sortDir;
    }
    setSearchParams(params);
  };

  const handleClear = () => {
    setSearchInput('');
    setAppliedSearch('');
    setCurrentPage(1);
    setPerPage(9);
    setSortBy('created_at');
    setSortDir('desc');
    
    // Remove all params from URL
    setSearchParams({});
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const lastUnderscoreIndex = value.lastIndexOf('_');
    const newSortBy = value.substring(0, lastUnderscoreIndex);
    const newSortDir = value.substring(lastUnderscoreIndex + 1) as 'asc' | 'desc';
    setSortBy(newSortBy);
    setSortDir(newSortDir);
    setCurrentPage(1);
    
    // Update URL
    const params: Record<string, string> = {};
    if (appliedSearch) params.search = appliedSearch;
    if (newSortBy !== 'created_at' || newSortDir !== 'desc') {
      params.sort_by = newSortBy;
      params.sort_dir = newSortDir;
    }
    setSearchParams(params);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!formValues.title.trim()) {
      errors.title = 'Title is required';
    }
    if (!formValues.description.trim()) {
      errors.description = 'Description is required';
    }
    if (!formValues.price.trim()) {
      errors.price = 'Price is required';
    } else {
      const priceNum = parseFloat(formValues.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        errors.price = 'Price must be a positive number';
      }
    }
    if (!formValues.quantity.trim()) {
      errors.quantity = 'Quantity is required';
    } else {
      const quantityNum = parseInt(formValues.quantity, 10);
      if (isNaN(quantityNum) || quantityNum < 0) {
        errors.quantity = 'Quantity must be a non-negative integer';
      }
    }

    // Sale price validation (optional but must be valid if provided)
    if (formValues.salePrice.trim()) {
      const salePriceNum = parseFloat(formValues.salePrice);
      if (isNaN(salePriceNum) || salePriceNum <= 0) {
        errors.salePrice = 'Sale price must be a positive number';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!canManageProducts) {
      setFormErrors({ submit: 'You do not have permission to manage products.' });
      return;
    }
    if (!validateForm()) {
      return;
    }

    if (!currentUserId) {
      setFormErrors({ submit: 'Unable to determine current user. Please log in again.' });
      return;
    }

    setSubmitting(true);
    try {
      const productData: any = {
        title: formValues.title.trim(),
        description: formValues.description.trim(),
        price: formValues.price.trim(),
        sale_price: formValues.salePrice.trim() || undefined,
        quantity: formValues.quantity.trim(),
        visibility: formValues.visibility === 'show' ? '1' : '0',
        user_id: currentUserId,
        featured_image: featuredFile || undefined,
        images: imageFiles.length > 0 ? imageFiles : undefined,
      };

      // Add deletion flags for edit mode
      if (activeModal === 'edit') {
        if (deleteFeaturedImage) {
          productData.delete_featured_image = '1';
        }
        if (deleteImagePaths.length > 0) {
          productData.delete_images = deleteImagePaths;
        }
      }

      if (activeModal === 'create') {
        await createProduct(productData);
      } else if (activeModal === 'edit' && activeProduct) {
        await updateProduct(activeProduct.id, productData);
      }

      // Success: close modal and reload products
      closeModal();
      await loadProducts(currentPage, appliedSearch, perPage, sortBy, sortDir);
    } catch (err) {
      console.error(`Failed to ${activeModal === 'create' ? 'create' : 'update'} product:`, err);
      setFormErrors({ submit: `Failed to ${activeModal === 'create' ? 'create' : 'update'} product. Please try again.` });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    if (!canManageProducts) return;
    setShowDeleteConfirm(true);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleDeleteConfirm = async () => {
    if (!activeProduct) return;
    if (!canManageProducts) return;

    setDeleting(true);
    try {
      await deleteProduct(activeProduct.id);
      closeModal();
      await loadProducts(currentPage, appliedSearch, perPage, sortBy, sortDir);
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Failed to delete product. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadProducts(page, appliedSearch, perPage, sortBy, sortDir);
  };

  const handleAddToCart = (product: Product) => {
    const success = addToCart(product);
    if (success) {
      setCartCount(getCartCount());
      setShowCartSuccess(true);
      setTimeout(() => setShowCartSuccess(false), 5000);
    }
  };

  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }, [totalPages]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <EcommerceHeader
        title="Products"
        backTo="/"
        backLabel="Back to home"
        cartCount={cartCount}
        activeNav="products"
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {showCartSuccess && (
          <div className="mx-auto mb-4 w-full max-w-3xl rounded-lg border border-green-500/30 bg-green-900/20 p-3 flex items-center justify-between">
            <span className="text-green-200">
              Product added to cart. <Link to="/demo/ecommerce/cart" className="underline hover:text-green-100">View your cart</Link>
            </span>
            <button
              onClick={() => setShowCartSuccess(false)}
              className="text-green-300 hover:text-green-100 text-xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        <div className="mx-auto mb-6 w-full">
          <div className="flex flex-col gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-300">Search</label>
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSearchSubmit();
                    }
                  }}
                  className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search products..."
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-sm font-medium text-gray-300">Per page</label>
                <select
                  value={perPage}
                  onChange={(event) => setPerPage(Number(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[9, 12, 24, 36, 48].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-56">
                <label className="block text-sm font-medium text-gray-300">Sort by</label>
                <select
                  value={`${sortBy}_${sortDir}`}
                  onChange={handleSortChange}
                  className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSearchSubmit}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
              >
                Search
              </button>
              <button
                onClick={handleClear}
                className="rounded-lg border border-gray-600 px-4 py-2 font-semibold text-white/90 hover:bg-white/5"
              >
                Clear
              </button>
              {canManageProducts && (
                <button
                  onClick={openCreateModal}
                  className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
                >
                  Create
                </button>
              )}
            </div>
          </div>
          {pagination && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-300">
              <div>Total results: {pagination.total}</div>
              <div>
                Page {pagination.current_page} of {totalPages}
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-400">Loading products...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => loadProducts(currentPage, appliedSearch, perPage, sortBy, sortDir)}
              className="mt-2 text-red-400 hover:text-red-300 underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-400">No products found.</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-6 hover:border-gray-600 transition-colors flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold mb-3">{product.title}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDetailsModal(product)}
                      className="rounded-md border border-gray-600 px-3 py-1 text-xs text-gray-200 hover:bg-gray-700"
                    >
                      Details
                    </button>
                    {canManageProducts && (
                      <button
                        onClick={() => openEditModal(product)}
                        className="rounded-md border border-blue-500/60 px-3 py-1 text-xs text-blue-200 hover:bg-blue-600/20"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="h-32 w-32 overflow-hidden rounded-lg border border-white/10 bg-gray-900/40">
                    <img
                      src={buildStorageUrl(product.featured_image)}
                      alt={product.title}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </div>
                
                <div className="mb-4 grow">
                  <p className="text-gray-300 text-sm line-clamp-4">
                    {product.description}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price:</span>
                    <span className="font-semibold text-green-400">
                      {formatPrice(product.price)}
                    </span>
                  </div>

                  {product.sale_price && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sale Price:</span>
                      <span className="font-semibold text-yellow-400">
                        {formatPrice(product.sale_price)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-400">Quantity:</span>
                    <span className={product.quantity > 0 ? 'text-white' : 'text-red-400'}>
                      {product.quantity}
                    </span>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-700">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Created:</span>
                      <span className="text-gray-400">{formatDate(product.created_at)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-500">Updated:</span>
                      <span className="text-gray-400">{formatDate(product.updated_at)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.quantity === 0}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {product.quantity === 0 ? 'Out of Stock' : 'Add to cart'}
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {currentPage > 1 && (
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                className="rounded-lg border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800"
                aria-label="Previous page"
              >
                «
              </button>
            )}
            {pageNumbers.map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={
                  page === currentPage
                    ? 'rounded-lg bg-blue-600 px-3 py-1 text-sm font-semibold text-white'
                    : 'rounded-lg border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800'
                }
              >
                {page}
              </button>
            ))}
            {currentPage < totalPages && (
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                className="rounded-lg border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800"
                aria-label="Next page"
              >
                »
              </button>
            )}
          </div>
        )}
      </main>

      {activeModal && (
        <>
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4"
            onClick={closeModal}
          >
            <div
              className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-800 text-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
                <div className="text-xs font-semibold text-white/80 sm:text-sm">
                  {activeModal === 'details' && 'Product details'}
                  {activeModal === 'create' && 'Create product'}
                  {activeModal === 'edit' && 'Edit product'}
                </div>
                <button
                  onClick={closeModal}
                  className="text-white/60 hover:text-white"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="featured-image overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                {activeModal === 'details' && activeProduct && (
                  <div className="space-y-4">
                    <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-gray-900/40">
                      <img
                        src={buildStorageUrl(activeProduct.featured_image)}
                        alt={activeProduct.title}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold sm:text-2xl">{activeProduct.title}</h2>
                      <p className="mt-2 text-sm text-gray-300 whitespace-pre-line">
                        {activeProduct.description}
                      </p>
                    </div>
                    {activeProduct.images && activeProduct.images.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {activeProduct.images.map((image, index) => (
                          <button
                            key={`${image}-${index}`}
                            type="button"
                            onClick={() => setZoomImage(buildStorageUrl(image))}
                            className="h-14 w-14 overflow-hidden rounded-lg border border-white/10 bg-gray-900/40 sm:h-16 sm:w-16"
                            aria-label={`View image ${index + 1}`}
                          >
                            <img
                              src={buildStorageUrl(image)}
                              alt={`${activeProduct.title} ${index + 1}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">Price:</span> {formatPrice(activeProduct.price)}
                      </div>
                      {activeProduct.sale_price && (
                        <div className="text-sm text-gray-300">
                          <span className="text-gray-400">Sale Price:</span> {formatPrice(activeProduct.sale_price)}
                        </div>
                      )}
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">Quantity:</span> {activeProduct.quantity}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">Visibility:</span>{' '}
                        {activeProduct.visibility ? 'Show' : 'Hidden'}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">Created:</span>{' '}
                        {formatDate(activeProduct.created_at)}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">Updated:</span>{' '}
                        {formatDate(activeProduct.updated_at)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        onClick={() => handleAddToCart(activeProduct)}
                        disabled={activeProduct.quantity === 0}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-green-600 sm:w-auto"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {activeProduct.quantity === 0 ? 'Out of Stock' : 'Add to cart'}
                      </button>
                      {canManageProducts && (
                        <div className="flex w-full gap-3 sm:w-auto">
                          <button
                            onClick={handleDeleteClick}
                            disabled={deleting}
                            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => openEditModal(activeProduct)}
                            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 sm:flex-none"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {(activeModal === 'create' || activeModal === 'edit') && (
                <form className="space-y-4">
                  {formErrors.submit && (
                    <div className="rounded-lg bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-300">
                      {formErrors.submit}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-white/80">Title *</label>
                      <input
                        value={formValues.title}
                        onChange={(event) =>
                          setFormValues((current) => ({ ...current, title: event.target.value }))
                        }
                        className={`mt-2 w-full rounded-lg border ${
                          formErrors.title ? 'border-red-500' : 'border-white/10'
                        } bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                      {formErrors.title && (
                        <p className="mt-1 text-xs text-red-400">{formErrors.title}</p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-white/80">Description *</label>
                      <textarea
                        rows={5}
                        value={formValues.description}
                        onChange={(event) =>
                          setFormValues((current) => ({ ...current, description: event.target.value }))
                        }
                        className={`mt-2 w-full rounded-lg border ${
                          formErrors.description ? 'border-red-500' : 'border-white/10'
                        } bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                      {formErrors.description && (
                        <p className="mt-1 text-xs text-red-400">{formErrors.description}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80">Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formValues.price}
                        onChange={(event) =>
                          setFormValues((current) => ({ ...current, price: event.target.value }))
                        }
                        className={`mt-2 w-full rounded-lg border ${
                          formErrors.price ? 'border-red-500' : 'border-white/10'
                        } bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                      {formErrors.price && (
                        <p className="mt-1 text-xs text-red-400">{formErrors.price}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80">Sale price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formValues.salePrice}
                        onChange={(event) =>
                          setFormValues((current) => ({ ...current, salePrice: event.target.value }))
                        }
                        className={`mt-2 w-full rounded-lg border ${
                          formErrors.salePrice ? 'border-red-500' : 'border-white/10'
                        } bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                      {formErrors.salePrice && (
                        <p className="mt-1 text-xs text-red-400">{formErrors.salePrice}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80">Quantity *</label>
                      <input
                        type="number"
                        value={formValues.quantity}
                        onChange={(event) =>
                          setFormValues((current) => ({ ...current, quantity: event.target.value }))
                        }
                        className={`mt-2 w-full rounded-lg border ${
                          formErrors.quantity ? 'border-red-500' : 'border-white/10'
                        } bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                      {formErrors.quantity && (
                        <p className="mt-1 text-xs text-red-400">{formErrors.quantity}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80">Visibility *</label>
                      <select
                        value={formValues.visibility}
                        onChange={(event) =>
                          setFormValues((current) => ({ ...current, visibility: event.target.value }))
                        }
                        className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="show">Show</option>
                        <option value="hidden">Hidden</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-white/80">
                        Featured image <span className="text-xs text-gray-500">(JPG, PNG, GIF, WebP, max 5MB)</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFeaturedChange}
                        className={`mt-2 w-full rounded-lg border ${
                          formErrors.featured_image ? 'border-red-500' : 'border-white/10'
                        } bg-gray-900 px-3 py-2 text-white file:mr-3 file:rounded-md file:border-0 file:bg-gray-700 file:px-3 file:py-1 file:text-white`}
                      />
                      {formErrors.featured_image && (
                        <p className="mt-1 text-xs text-red-400">{formErrors.featured_image}</p>
                      )}
                      
                      {/* Show existing featured image in edit mode */}
                      {activeModal === 'edit' && existingFeaturedImage && !deleteFeaturedImage && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-2">Current image:</p>
                          <div className="relative inline-block">
                            <img
                              src={buildStorageUrl(existingFeaturedImage)}
                              alt="Existing featured"
                              className="h-24 w-24 rounded-lg object-cover border-2 border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={handleDeleteExistingFeaturedImage}
                              className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                              aria-label="Delete existing featured image"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Show new preview */}
                      {featuredPreview && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-2">New upload:</p>
                          <img
                            src={featuredPreview}
                            alt="Featured preview"
                            className="h-24 w-24 rounded-lg object-cover border-2 border-green-500"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80">
                        Images <span className="text-xs text-gray-500">(max 15, JPG/PNG/GIF/WebP, 5MB each)</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImagesChange}
                        className={`mt-2 w-full rounded-lg border ${
                          formErrors.images ? 'border-red-500' : 'border-white/10'
                        } bg-gray-900 px-3 py-2 text-white file:mr-3 file:rounded-md file:border-0 file:bg-gray-700 file:px-3 file:py-1 file:text-white`}
                      />
                      {formErrors.images && (
                        <p className="mt-1 text-xs text-red-400">{formErrors.images}</p>
                      )}
                      
                      {/* Show existing images in edit mode */}
                      {activeModal === 'edit' && existingImages.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-2">Current images:</p>
                          <div className="flex flex-wrap gap-2">
                            {existingImages.map((image, index) => (
                              <div key={`existing-${index}`} className="relative">
                                <img
                                  src={buildStorageUrl(image)}
                                  alt={`Existing ${index + 1}`}
                                  className="h-20 w-20 rounded-lg object-cover border-2 border-blue-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExistingImage(image)}
                                  className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                                  aria-label={`Delete existing image ${index + 1}`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Show new previews */}
                      {imagePreviews.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-2">New uploads:</p>
                          <div className="flex flex-wrap gap-2">
                            {imagePreviews.map((preview, index) => (
                              <img
                                key={`preview-${index}`}
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="h-20 w-20 rounded-lg object-cover border-2 border-green-500"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={submitting}
                      className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                    >
                      {submitting ? (activeModal === 'create' ? 'Creating...' : 'Updating...') : activeModal === 'create' ? 'Create product' : 'Save changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
            </div>
          </div>
          {showDeleteConfirm && (
            <div
              className="fixed inset-0 z-70 flex items-end justify-center bg-black/80 p-3 sm:items-center sm:p-4"
              onClick={handleDeleteCancel}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-800 text-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="px-4 py-4 sm:px-6 sm:py-5">
                  <h3 className="text-lg font-semibold mb-3">Delete Product</h3>
                  <p className="text-gray-300 mb-6">
                    Are you sure you want to delete this product? This action cannot be undone.
                  </p>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      onClick={handleDeleteCancel}
                      disabled={deleting}
                      className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={deleting}
                      className="w-full rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {zoomImage && (
            <div
              className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-3 sm:p-6"
              onClick={() => setZoomImage(null)}
            >
              <img
                src={zoomImage}
                alt="Enlarged product"
                className="max-h-[90vh] max-w-full rounded-xl object-contain"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProductsView;
