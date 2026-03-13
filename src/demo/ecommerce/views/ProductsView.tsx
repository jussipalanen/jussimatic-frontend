import { useSearchParams, Link } from 'react-router-dom';
import React, { useEffect, useMemo, useState } from 'react';
import { fetchProducts, createProduct, updateProduct, deleteProduct, fetchTaxRates } from '../../../api/productsApi';
import type { Product, ProductsResponse, TaxRate } from '../../../api/productsApi';
import { addToCart, getCartCount } from '../../../utils/cartUtils';
import EcommerceHeader from '../components/EcommerceHeader';
import { getMe } from '../../../api/authApi';
import { getRoleAccess } from '../../../utils/authUtils';
import { getStoredLanguage, translations, type Language } from '../../../i18n';

const STORAGE_BASE_URL = import.meta.env.VITE_JUSSILOG_BACKEND_STORAGE_BASE_URL || '';
const PLACEHOLDER_IMAGE_URL = 'https://placehold.net/default.png';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pagination, setPagination] = useState<ProductsResponse | null>(null);
  const [activeModal, setActiveModal] = useState<'details' | 'create' | 'edit' | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [formValues, setFormValues] = useState({
    title: '',
    description: '',
    price: '',
    salePrice: '',
    taxCode: '',
    taxRate: '',
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
  const [cartToast, setCartToast] = useState<{ title: string; visible: boolean } | null>(null);
  const cartToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [canManageProducts, setCanManageProducts] = useState(false);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [taxSearch, setTaxSearch] = useState('');
  const [taxDropdownOpen, setTaxDropdownOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());

  useEffect(() => {
    const handler = (e: Event) => {
      setLanguage((e as CustomEvent<Language>).detail);
      setTaxRates([]); // reload tax rates in new language on next modal open
    };
    window.addEventListener('jussimatic-language-change', handler);
    return () => window.removeEventListener('jussimatic-language-change', handler);
  }, []);

  const t = translations[language].products;

  const sortOptions = [
    { value: 'created_at_desc', label: t.sortNewestFirst },
    { value: 'created_at_asc', label: t.sortOldestFirst },
    { value: 'title_asc', label: t.sortTitleAZ },
    { value: 'title_desc', label: t.sortTitleZA },
    { value: 'price_asc', label: t.sortPriceLowHigh },
    { value: 'price_desc', label: t.sortPriceHighLow },
    { value: 'sale_price_asc', label: t.sortSalePriceLowHigh },
    { value: 'sale_price_desc', label: t.sortSalePriceHighLow },
    { value: 'quantity_asc', label: t.sortQuantityLowHigh },
    { value: 'quantity_desc', label: t.sortQuantityHighLow },
    { value: 'updated_at_desc', label: t.sortRecentlyUpdated },
    { value: 'updated_at_asc', label: t.sortLeastRecentlyUpdated },
  ];

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
      setError(t.errorLoading);
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string | number | null | undefined) => {
    if (price == null || price === '') return 'N/A';
    const n = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(n)) return 'N/A';
    return `€${n.toFixed(2)}`;
  };

  const calcGrossPrice = (net: string | number | null | undefined, taxRate: string | number | null | undefined): number | null => {
    if (net == null || net === '') return null;
    const netNum = typeof net === 'string' ? parseFloat(net) : net;
    if (isNaN(netNum)) return null;
    if (taxRate == null || taxRate === '') return netNum;
    const rate = typeof taxRate === 'string' ? parseFloat(taxRate) : Number(taxRate);
    if (isNaN(rate) || rate === 0) return netNum;
    const effectiveRate = rate > 1 ? rate / 100 : rate;
    return netNum * (1 + effectiveRate);
  };

  const formatGrossPrice = (net: string | number | null | undefined, taxRate: string | number | null | undefined): string => {
    const gross = calcGrossPrice(net, taxRate);
    if (gross == null) return 'N/A';
    return `€${gross.toFixed(2)}`;
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

  const formatTaxPct = (rate: string | number | null | undefined): string => {
    if (rate == null || rate === '') return '';
    const r = typeof rate === 'string' ? parseFloat(rate) : rate;
    if (isNaN(r)) return '';
    const pct = parseFloat(((r > 1 ? r : r * 100)).toPrecision(10));
    return `${pct.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
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
      taxCode: '',
      taxRate: '',
      quantity: '',
      visibility: 'show',
    });
    setTaxSearch('');
    setTaxDropdownOpen(false);
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
    if (taxRates.length === 0) fetchTaxRates(language).then(setTaxRates).catch(() => {});
    setActiveModal('create');
  };

  const openEditModal = (product: Product) => {
    if (!canManageProducts) return;
    if (taxRates.length === 0) fetchTaxRates(language).then(setTaxRates).catch(() => {});
    setActiveProduct(product);
    setFormValues({
      title: product.title ?? '',
      description: product.description ?? '',
      price: product.price ?? '',
      salePrice: product.sale_price ?? '',
      taxCode: (product.tax_code as string | null | undefined) ?? '',
      taxRate: product.tax_rate != null ? String(product.tax_rate) : '',
      quantity: String(product.quantity ?? ''),
      visibility: product.visibility ? 'show' : 'hidden',
    });
    const existingCode = (product.tax_code as string | null | undefined) ?? '';
    const matchedTr = taxRates.find(tr => tr.code === existingCode);
    setTaxSearch(matchedTr
      ? (matchedTr.label ?? (matchedTr.name ? `${matchedTr.name} (${matchedTr.code})` : matchedTr.code))
      : existingCode
    );
    setTaxDropdownOpen(false);
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
        errors.featured_image = t.errFileType;
      } else if (file.size > maxSize) {
        errors.featured_image = t.errFileSize;
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
      errors.images = t.errTooManyFiles;
    } else {
      for (const file of files) {
        if (!validTypes.includes(file.type)) {
          errors.images = t.errImagesType;
          break;
        }
        if (file.size > maxSize) {
          errors.images = t.errImagesSize;
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
      errors.title = t.errTitleRequired;
    }
    if (!formValues.description.trim()) {
      errors.description = t.errDescriptionRequired;
    }
    if (!formValues.price.trim()) {
      errors.price = t.errPriceRequired;
    } else {
      const priceNum = parseFloat(formValues.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        errors.price = t.errPricePositive;
      }
    }
    if (!formValues.quantity.trim()) {
      errors.quantity = t.errQuantityRequired;
    } else {
      const quantityNum = parseInt(formValues.quantity, 10);
      if (isNaN(quantityNum) || quantityNum < 0) {
        errors.quantity = t.errQuantityInteger;
      }
    }

    // Sale price validation (optional but must be valid if provided)
    if (formValues.salePrice.trim()) {
      const salePriceNum = parseFloat(formValues.salePrice);
      if (isNaN(salePriceNum) || salePriceNum <= 0) {
        errors.salePrice = t.errSalePricePositive;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!canManageProducts) {
      setFormErrors({ submit: t.errNoPermission });
      return;
    }
    if (!validateForm()) {
      return;
    }

    if (!currentUserId) {
      setFormErrors({ submit: t.errNoUser });
      return;
    }

    setSubmitting(true);
    try {
      const productData: any = {
        title: formValues.title.trim(),
        description: formValues.description.trim(),
        price: formValues.price.trim(),
        sale_price: formValues.salePrice.trim() || undefined,
        tax_code: formValues.taxCode.trim() || undefined,
        tax_rate: formValues.taxRate.trim() ? parseFloat(formValues.taxRate) : undefined,
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
      setFormErrors({ submit: activeModal === 'create' ? t.errCreateFailed : t.errUpdateFailed });
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
      alert(t.errDeleteFailed);
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
      if (cartToastTimerRef.current) clearTimeout(cartToastTimerRef.current);
      setCartToast({ title: product.title ?? '', visible: true });
      cartToastTimerRef.current = setTimeout(() => setCartToast(null), 4000);
    }
  };

  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }, [totalPages]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <EcommerceHeader
        title={t.title}
        backTo="/"
        backLabel={t.backToHome}
        cartCount={cartCount}
        activeNav="products"
      />

      {/* Cart toast — top-right */}
      {cartToast && (
        <div className="fixed top-5 right-5 z-50 w-80 max-w-[calc(100vw-2.5rem)] rounded-xl border border-green-500/30 bg-gray-900 shadow-2xl overflow-hidden animate-in slide-in-from-right-4 fade-in duration-200">
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/15">
              <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{t.cartSuccess}</p>
              <p className="mt-0.5 text-xs text-gray-300 truncate">{cartToast.title}</p>
              <Link
                to="/demo/ecommerce/cart"
                onClick={() => setCartToast(null)}
                className="mt-1.5 inline-block text-xs font-medium text-green-400 hover:text-green-300 underline underline-offset-2"
              >
                {t.viewCart} →
              </Link>
            </div>
            <button
              onClick={() => setCartToast(null)}
              className="shrink-0 text-gray-500 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* progress bar */}
          <div className="h-0.5 bg-green-500/20">
            <div className="h-full bg-green-500 animate-shrink" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto mb-6 w-full">
          <div className="flex flex-col gap-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-300">{t.search}</label>
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
                  placeholder={t.searchPlaceholder}
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-sm font-medium text-gray-300">{t.perPage}</label>
                <select
                  value={perPage}
                  onChange={(event) => setPerPage(Number(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(viewMode === 'list' ? [10, 25, 50, 100] : [9, 12, 24, 36, 48]).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-56">
                <label className="block text-sm font-medium text-gray-300">{t.sortBy}</label>
                <select
                  value={`${sortBy}_${sortDir}`}
                  onChange={handleSortChange}
                  className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sortOptions.map((option) => (
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
                {t.searchButton}
              </button>
              <button
                onClick={handleClear}
                className="rounded-lg border border-gray-600 px-4 py-2 font-semibold text-white/90 hover:bg-white/5"
              >
                {t.clear}
              </button>
              {canManageProducts && (
                <button
                  onClick={openCreateModal}
                  className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
                >
                  {t.create}
                </button>
              )}
              {/* View mode toggle */}
              <div className="ml-auto flex rounded-lg border border-gray-600 overflow-hidden">
                <button
                  onClick={() => { setViewMode('grid'); setPerPage(9); }}
                  title={t.viewGrid}
                  className={`px-3 py-2 flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="hidden sm:inline">{t.viewGrid}</span>
                </button>
                <button
                  onClick={() => { setViewMode('list'); setPerPage(10); }}
                  title={t.viewList}
                  className={`px-3 py-2 flex items-center gap-1.5 text-sm font-medium transition-colors border-l border-gray-600 ${
                    viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className="hidden sm:inline">{t.viewList}</span>
                </button>
              </div>
            </div>
          </div>
          {pagination && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-300">
              <div>{t.totalResults} {pagination.total}</div>
              <div>
                {t.page} {pagination.current_page} {t.of} {totalPages}
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-400">{t.loading}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => loadProducts(currentPage, appliedSearch, perPage, sortBy, sortDir)}
              className="mt-2 text-red-400 hover:text-red-300 underline"
            >
              {t.tryAgain}
            </button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-400">{t.noProducts}</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && viewMode === 'grid' && (
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
                      {t.details}
                    </button>
                    {canManageProducts && (
                      <button
                        onClick={() => openEditModal(product)}
                        className="rounded-md border border-blue-500/60 px-3 py-1 text-xs text-blue-200 hover:bg-blue-600/20"
                      >
                        {t.edit}
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
                  {/* Price block */}
                  <div className="rounded-lg bg-gray-900/60 px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      {product.sale_price ? (
                        <>
                          <span className="text-xs text-gray-500 line-through">
                            {product.tax_rate != null ? formatGrossPrice(product.price, product.tax_rate) : formatPrice(product.price)}
                          </span>
                          <span className="text-lg font-bold text-yellow-400">
                            {product.tax_rate != null ? formatGrossPrice(product.sale_price, product.tax_rate) : formatPrice(product.sale_price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-green-400">
                          {product.tax_rate != null ? formatGrossPrice(product.price, product.tax_rate) : formatPrice(product.price)}
                        </span>
                      )}
                      {product.tax_rate != null && (
                        <span className="text-xs text-gray-500 mt-0.5">
                          excl. {t.vatLabel} {formatTaxPct(product.tax_rate)}{product.tax_code && product.tax_code !== 'ZERO' ? ` · ${product.tax_code}` : ''}:
                          {' '}{product.sale_price ? formatPrice(product.sale_price) : formatPrice(product.price)}
                        </span>
                      )}
                    </div>
                    {product.sale_price && (
                      <span className="shrink-0 rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-400 border border-yellow-500/30">
                        SALE
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">{t.quantityLabel}</span>
                    <span className={product.quantity > 0 ? 'text-white' : 'text-red-400'}>
                      {product.quantity}
                    </span>
                  </div>

                  {!product.tax_rate && product.tax_code && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t.taxLabel}</span>
                      <span className="text-gray-300">{product.tax_code}</span>
                    </div>
                  )}

                  <div className="pt-3 mt-3 border-t border-gray-700">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{t.createdLabel}</span>
                      <span className="text-gray-400">{formatDate(product.created_at)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-500">{t.updatedLabel}</span>
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
                  {product.quantity === 0 ? t.outOfStock : t.addToCart}
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && products.length > 0 && viewMode === 'list' && (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors flex gap-4"
              >
                {/* Thumbnail */}
                <div className="shrink-0 h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-lg border border-white/10 bg-gray-900/40">
                  <img
                    src={buildStorageUrl(product.featured_image)}
                    alt={product.title}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>

                {/* Main content */}
                <div className="flex flex-1 min-w-0 flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-bold text-white truncate">{product.title}</h2>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          onClick={() => openDetailsModal(product)}
                          className="rounded border border-gray-600 px-2 py-0.5 text-xs text-gray-200 hover:bg-gray-700"
                        >
                          {t.details}
                        </button>
                        {canManageProducts && (
                          <button
                            onClick={() => openEditModal(product)}
                            className="rounded border border-blue-500/60 px-2 py-0.5 text-xs text-blue-200 hover:bg-blue-600/20"
                          >
                            {t.edit}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-400 line-clamp-2">{product.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span>{t.quantityLabel} <span className={product.quantity > 0 ? 'text-white' : 'text-red-400'}>{product.quantity}</span></span>
                      <span>{t.createdLabel} <span className="text-gray-300">{formatDate(product.created_at)}</span></span>
                    </div>
                  </div>

                  {/* Price + cart */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 shrink-0">
                    <div className="text-right">
                      {product.sale_price ? (
                        <>
                          <div className="text-xs text-gray-500 line-through">
                            {product.tax_rate != null ? formatGrossPrice(product.price, product.tax_rate) : formatPrice(product.price)}
                          </div>
                          <div className="text-base font-bold text-yellow-400">
                            {product.tax_rate != null ? formatGrossPrice(product.sale_price, product.tax_rate) : formatPrice(product.sale_price)}
                          </div>
                        </>
                      ) : (
                        <div className="text-base font-bold text-green-400">
                          {product.tax_rate != null ? formatGrossPrice(product.price, product.tax_rate) : formatPrice(product.price)}
                        </div>
                      )}
                      {product.tax_rate != null && (
                        <div className="text-xs text-gray-500">
                          excl. {t.vatLabel} {formatTaxPct(product.tax_rate)}{product.tax_code && product.tax_code !== 'ZERO' ? ` · ${product.tax_code}` : ''}:
                          {' '}{product.sale_price ? formatPrice(product.sale_price) : formatPrice(product.price)}
                        </div>
                      )}
                      {product.sale_price && (
                        <span className="inline-block rounded-full bg-yellow-500/15 px-2 py-0.5 text-xs font-semibold text-yellow-400 border border-yellow-500/30">SALE</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.quantity === 0}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="hidden sm:inline">{product.quantity === 0 ? t.outOfStock : t.addToCart}</span>
                    </button>
                  </div>
                </div>
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
                  {activeModal === 'details' && t.modalDetails}
                  {activeModal === 'create' && t.modalCreate}
                  {activeModal === 'edit' && t.modalEdit}
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
                      {/* Price card */}
                      <div className="sm:col-span-2 rounded-xl border border-white/10 bg-gray-900/50 px-4 py-3 flex items-center gap-4">
                        <div className="flex-1">
                          {activeProduct.sale_price ? (
                            <div className="flex items-baseline gap-3 flex-wrap">
                              <span className="text-2xl font-bold text-yellow-400">
                                {activeProduct.tax_rate != null ? formatGrossPrice(activeProduct.sale_price, activeProduct.tax_rate) : formatPrice(activeProduct.sale_price)}
                              </span>
                              <span className="text-sm text-gray-500 line-through">
                                {activeProduct.tax_rate != null ? formatGrossPrice(activeProduct.price, activeProduct.tax_rate) : formatPrice(activeProduct.price)}
                              </span>
                              <span className="rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-semibold text-yellow-400 border border-yellow-500/30">SALE</span>
                            </div>
                          ) : (
                            <span className="text-2xl font-bold text-green-400">
                              {activeProduct.tax_rate != null ? formatGrossPrice(activeProduct.price, activeProduct.tax_rate) : formatPrice(activeProduct.price)}
                            </span>
                          )}
                          {activeProduct.tax_rate != null && (
                            <p className="mt-1 text-xs text-gray-500">
                              excl. {t.vatLabel} {formatTaxPct(activeProduct.tax_rate)}{activeProduct.tax_code && activeProduct.tax_code !== 'ZERO' ? ` · ${activeProduct.tax_code}` : ''}:
                              {' '}{activeProduct.sale_price ? (
                                <><span className="line-through text-gray-600">{formatPrice(activeProduct.price)}</span>{' → '}{formatPrice(activeProduct.sale_price)}</>
                              ) : formatPrice(activeProduct.price)}
                            </p>
                          )}
                          {!activeProduct.tax_rate && activeProduct.tax_code && (
                            <p className="mt-1 text-xs text-gray-500">{t.taxLabel} {activeProduct.tax_code}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">{t.quantityLabel}</span> {activeProduct.quantity}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">{t.visibilityLabel}</span>{' '}
                        {activeProduct.visibility ? t.visibilityShow : t.visibilityHidden}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">{t.createdLabel}</span>{' '}
                        {formatDate(activeProduct.created_at)}
                      </div>
                      <div className="text-sm text-gray-300">
                        <span className="text-gray-400">{t.updatedLabel}</span>{' '}
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
                        {activeProduct.quantity === 0 ? t.outOfStock : t.addToCart}
                      </button>
                      {canManageProducts && (
                        <div className="flex w-full gap-3 sm:w-auto">
                          <button
                            onClick={handleDeleteClick}
                            disabled={deleting}
                            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                          >
                            {t.delete}
                          </button>
                          <button
                            onClick={() => openEditModal(activeProduct)}
                            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 sm:flex-none"
                          >
                            {t.edit}
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
                      <label className="block text-sm font-medium text-white/80">{t.formTitle}</label>
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
                      <label className="block text-sm font-medium text-white/80">{t.formDescription}</label>
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
                      <label className="block text-sm font-medium text-white/80">{t.formPrice}</label>
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
                      <label className="block text-sm font-medium text-white/80">{t.formSalePrice}</label>
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
                    <div className="relative">
                      <label className="block text-sm font-medium text-white/80">{t.formTaxCode}</label>
                      <input
                        type="text"
                        value={taxSearch}
                        onChange={(e) => {
                          setTaxSearch(e.target.value);
                          setTaxDropdownOpen(true);
                          // If user clears or types freely, unset the selected code
                          if (!e.target.value.trim()) {
                            setFormValues(cur => ({ ...cur, taxCode: '', taxRate: '' }));
                          }
                        }}
                        onFocus={() => setTaxDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setTaxDropdownOpen(false), 150)}
                        placeholder={taxRates.length ? t.formTaxCode + '...' : 'Loading...'}
                        autoComplete="off"
                        className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {formValues.taxCode && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormValues(cur => ({ ...cur, taxCode: '', taxRate: '' }));
                            setTaxSearch('');
                          }}
                          className="absolute right-2 top-9.5 text-gray-500 hover:text-white"
                          aria-label="Clear tax code"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                      {taxDropdownOpen && taxRates.length > 0 && (() => {
                        const q = taxSearch.toLowerCase();
                        const filtered = taxRates.filter(tr =>
                          !q ||
                          tr.code.toLowerCase().includes(q) ||
                          (tr.name ?? '').toLowerCase().includes(q) ||
                          (tr.label ?? '').toLowerCase().includes(q)
                        );
                        if (!filtered.length) return null;
                        return (
                          <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-white/10 bg-gray-800 shadow-xl">
                            {filtered.map(tr => (
                              <li
                                key={tr.code}
                                onMouseDown={() => {
                                  setFormValues(cur => ({
                                    ...cur,
                                    taxCode: tr.code,
                                    taxRate: String(tr.rate),
                                  }));
                                  setTaxSearch(tr.label ?? (tr.name ? `${tr.name} (${tr.code})` : tr.code));
                                  setTaxDropdownOpen(false);
                                }}
                                className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-gray-700 ${
                                  formValues.taxCode === tr.code ? 'bg-blue-600/20 text-blue-300' : 'text-white'
                                }`}
                              >
                                <span className="flex flex-col min-w-0">
                                  <span className="font-medium truncate">
                                    {tr.label ?? tr.name ?? tr.code}
                                  </span>
                                  {(tr.label || tr.name) && (
                                    <span className="text-xs text-gray-400">{tr.code}</span>
                                  )}
                                </span>
                                <span className="ml-3 shrink-0 rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">{formatTaxPct(tr.rate)}</span>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80">{t.formTaxRate} <span className="text-xs text-gray-500">{t.formTaxRateHint}</span></label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={formValues.taxRate}
                        onChange={(event) =>
                          setFormValues((current) => ({ ...current, taxRate: event.target.value }))
                        }
                        readOnly={taxRates.some(tr => tr.code === formValues.taxCode)}
                        placeholder="0.24"
                        className={`mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500${
                          taxRates.some(tr => tr.code === formValues.taxCode) ? ' opacity-60 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80">{t.formQuantity}</label>
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
                      <label className="block text-sm font-medium text-white/80">{t.formVisibility}</label>
                      <select
                        value={formValues.visibility}
                        onChange={(event) =>
                          setFormValues((current) => ({ ...current, visibility: event.target.value }))
                        }
                        className="mt-2 w-full rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="show">{t.visibilityShow}</option>
                        <option value="hidden">{t.visibilityHidden}</option>
                      </select>
                    </div>
                  </div>

                  {/* Price summary */}
                  {formValues.price.trim() && (
                    (() => {
                      const net = parseFloat(formValues.price);
                      const saleNet = formValues.salePrice.trim() ? parseFloat(formValues.salePrice) : null;
                      const rate = formValues.taxRate.trim() ? parseFloat(formValues.taxRate) : null;
                      const effectiveRate = rate != null && !isNaN(rate) ? (rate > 1 ? rate / 100 : rate) : null;
                      const grossPrice = !isNaN(net) && effectiveRate != null ? net * (1 + effectiveRate) : null;
                      const grossSale = saleNet != null && !isNaN(saleNet) && effectiveRate != null ? saleNet * (1 + effectiveRate) : null;
                      if (isNaN(net)) return null;
                      return (
                        <div className="rounded-lg border border-white/10 bg-gray-900/50 px-4 py-3 text-sm space-y-1.5">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t.pricePreview}</p>
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t.netPrice}</span>
                            <span className="text-white font-medium">{formatPrice(net)}</span>
                          </div>
                          {saleNet != null && !isNaN(saleNet) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t.netSalePrice}</span>
                              <span className="text-yellow-400 font-medium">{formatPrice(saleNet)}</span>
                            </div>
                          )}
                          {effectiveRate != null && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-400">
                                  {t.vatLabel}{formValues.taxCode ? ` (${formValues.taxCode})` : ''} {formatTaxPct(rate!)}
                                </span>
                                <span className="text-gray-300">{formatPrice(net * effectiveRate)}</span>
                              </div>
                              <div className="flex justify-between border-t border-white/10 pt-1.5">
                                <span className="text-gray-400">{t.grossPrice.replace('%vat%', t.vatLabel)}</span>
                                <span className="text-green-400 font-semibold">{formatPrice(grossPrice!)}</span>
                              </div>
                              {grossSale != null && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">{t.grossSalePrice.replace('%vat%', t.vatLabel)}</span>
                                  <span className="text-yellow-400 font-semibold">{formatPrice(grossSale)}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })()
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-white/80">
                        {t.formFeaturedImage} <span className="text-xs text-gray-500">{t.formFeaturedImageHint}</span>
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
                          <p className="text-xs text-gray-400 mb-2">{t.currentImage}</p>
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
                          <p className="text-xs text-gray-400 mb-2">{t.newUpload}</p>
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
                        {t.formImages} <span className="text-xs text-gray-500">{t.formImagesHint}</span>
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
                          <p className="text-xs text-gray-400 mb-2">{t.currentImages}</p>
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
                          <p className="text-xs text-gray-400 mb-2">{t.newUploads}</p>
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
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
                    >
                      {submitting
                        ? (activeModal === 'create' ? t.creating : t.updating)
                        : (activeModal === 'create' ? t.modalCreate : t.saveChanges)}
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
                  <h3 className="text-lg font-semibold mb-3">{t.deleteTitle}</h3>
                  <p className="text-gray-300 mb-6">
                    {t.deleteConfirm}
                  </p>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      onClick={handleDeleteCancel}
                      disabled={deleting}
                      className="w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white/90 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {t.cancel}
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={deleting}
                      className="w-full rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {deleting ? t.deleting : t.yesDelete}
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
