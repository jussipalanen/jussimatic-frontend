import type { Product } from '../api/productsApi';

const CART_STORAGE_KEY = 'jussimatic-cart';

export interface CartItem {
  productId: number;
  title: string;
  price: string;
  quantity: number;
  featuredImage: string | null;
  maxQuantity: number;
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
    cart.push({
      productId: product.id,
      title: product.title,
      price: product.sale_price || product.price,
      quantity: 1,
      featuredImage: product.featured_image,
      maxQuantity: product.quantity,
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

/**
 * Get total number of items in cart (sum of all quantities)
 */
export function getCartCount(): number {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.quantity, 0);
}
