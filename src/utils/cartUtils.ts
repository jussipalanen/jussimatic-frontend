import type { Product } from '../api/productsApi';

const CART_STORAGE_KEY = 'jussimatic-cart';

export interface CartItem {
  productId: number;
  title: string;
  price: string;
  quantity: number;
  featuredImage: string | null;
  maxQuantity: number;
  taxCode?: string | null;
  taxRate?: number | null;
}

/**
 * Get all items from the cart
 */
export function getCart(): CartItem[] {
  try {
    const cartData = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!cartData) return [];
    return JSON.parse(cartData) as CartItem[];
  } catch (error) {
    console.error('Failed to read cart from sessionStorage:', error);
    return [];
  }
}

/**
 * Save cart items to sessionStorage
 */
export function saveCart(items: CartItem[]): void {
  try {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save cart to sessionStorage:', error);
  }
}

/**
 * Add a product to the cart (quantity: 1)
 * If product already exists, increment quantity (respecting max)
 * Returns true if successful, false if out of stock
 */
export function addToCart(product: Product): boolean {
  if (product.quantity === 0) {
    return false; // Out of stock
  }

  const cart = getCart();
  const existingItemIndex = cart.findIndex(item => item.productId === product.id);

  if (existingItemIndex >= 0) {
    // Product already in cart - increment quantity
    const existingItem = cart[existingItemIndex];
    if (existingItem.quantity >= product.quantity) {
      return false; // Can't add more than available
    }
    cart[existingItemIndex].quantity += 1;
  } else {
    // New product - add to cart
    const rawRate = product.tax_rate;
    const taxRate = rawRate != null
      ? (typeof rawRate === 'string' ? parseFloat(rawRate) : rawRate)
      : null;
    cart.push({
      productId: product.id,
      title: product.title,
      price: product.sale_price || product.price,
      quantity: 1,
      featuredImage: product.featured_image,
      maxQuantity: product.quantity,
      taxCode: product.tax_code ?? null,
      taxRate: taxRate != null && !isNaN(taxRate) ? taxRate : null,
    });
  }

  saveCart(cart);
  return true;
}

/**
 * Remove a product from the cart
 */
export function removeFromCart(productId: number): void {
  const cart = getCart();
  const updatedCart = cart.filter(item => item.productId !== productId);
  saveCart(updatedCart);
}

/**
 * Update quantity for a cart item
 * If quantity is 0, removes the item
 * If quantity exceeds maxQuantity, caps it at maxQuantity
 */
export function updateCartItemQuantity(productId: number, quantity: number): void {
  if (quantity < 0) return;

  const cart = getCart();
  const itemIndex = cart.findIndex(item => item.productId === productId);

  if (itemIndex === -1) return;

  if (quantity === 0) {
    // Remove item if quantity is 0
    cart.splice(itemIndex, 1);
  } else {
    // Update quantity, respecting max
    const maxQty = cart[itemIndex].maxQuantity;
    cart[itemIndex].quantity = Math.min(quantity, maxQty);
  }

  saveCart(cart);
}

/**
 * Clear all items from the cart
 */
export function clearCart(): void {
  try {
    sessionStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear cart:', error);
  }
}

export interface TaxLineGroup {
  code: string | null;
  rate: number; // stored as decimal e.g. 0.24 for 24%
  amount: number;
}

export function calcCartTaxBreakdown(items: CartItem[]): TaxLineGroup[] {
  const groups: TaxLineGroup[] = [];
  for (const item of items) {
    const rate = item.taxRate ?? 0;
    if (rate === 0) continue;
    const amount = (parseFloat(item.price) || 0) * item.quantity * rate;
    const code = item.taxCode ?? null;
    const existing = groups.find(g => g.code === code && g.rate === rate);
    if (existing) existing.amount += amount;
    else groups.push({ code, rate, amount });
  }
  return groups;
}

export function calcCartTotals(items: CartItem[]): { subtotal: number; taxTotal: number; grandTotal: number } {
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * item.quantity, 0);
  const breakdown = calcCartTaxBreakdown(items);
  const taxTotal = breakdown.reduce((sum, g) => sum + g.amount, 0);
  return { subtotal, taxTotal, grandTotal: subtotal + taxTotal };
}

/**
 * Get total number of items in cart (sum of all quantities)
 */
export function getCartCount(): number {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.quantity, 0);
}
