const CART_KEY = "cart";

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getCartCount() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + (item.qty || 1), 0);
}

function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;

  const count = getCartCount();
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

// Para usar luego cuando tengas botón "Agregar al carrito"
function addToCart(id, qty = 1) {
  const cart = getCart();
  const found = cart.find(p => p.id === id);

  if (found) found.qty = (found.qty || 1) + qty;
  else cart.push({ id, qty });

  saveCart(cart);
  updateCartBadge();
}

// Exponer funciones (para poder llamarlas desde otros scripts)
window.cart = { getCart, saveCart, getCartCount, updateCartBadge, addToCart };
