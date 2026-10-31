"use strict";

/* =========================================================
   ShopNest — Interactive e-commerce SPA
   Sections: config · state · helpers · data · render ·
             filters · cart · storage · drawer · init
   ========================================================= */

/* ---------- Config ---------- */
const PRODUCTS_URL = "products.json";
const CART_STORAGE_KEY = "shopnest_cart_v1";
const CATEGORIES = ["All", "Electronics", "Clothing", "Footwear", "Books"];
const FALLBACK_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#efe8dc"/><text x="50%" y="50%" fill="#9a9084" font-family="sans-serif" font-size="20" text-anchor="middle">No image</text></svg>'
  );

/* ---------- State ---------- */
let products = [];
let cart = [];
let activeCategory = "All";
let searchTerm = "";

/* ---------- DOM references ---------- */
const $ = (id) => document.getElementById(id);
const grid = $("product-grid");
const filterBar = $("filter-bar");
const searchInput = $("search-input");
const noResults = $("no-results");
const statusBox = $("status");
const resultInfo = $("result-info");
const cartCount = $("cart-count");
const cartItemsEl = $("cart-items");
const cartTotalEl = $("cart-total");
const drawer = $("cart-drawer");
const overlay = $("overlay");

/* ---------- Helpers ---------- */
const formatPrice = (n) => "₹" + Number(n).toLocaleString("en-IN");

function discountPercent(p) {
  return Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
}

function starString(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function makeImage(src, alt) {
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.loading = "lazy";
  img.addEventListener("error", () => { img.src = FALLBACK_IMG; }, { once: true });
  return img;
}

/* ---------- Data (Fetch + async/await) ---------- */
async function fetchProducts() {
  const response = await fetch(PRODUCTS_URL);
  if (!response.ok) throw new Error("HTTP " + response.status);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("Invalid product data");
  return data;
}

async function loadProducts() {
  showStatus("Loading products…");
  try {
    products = await fetchProducts();
    clearStatus();
    applyFilters();
  } catch (err) {
    showStatus("Could not load products. If you opened the file directly, run it through a local server (e.g. Live Server).", true);
    const retry = createEl("button", "btn btn-primary", "Try again");
    retry.addEventListener("click", loadProducts);
    statusBox.appendChild(document.createElement("br"));
    statusBox.appendChild(retry);
  }
}

/* ---------- Status messages ---------- */
function showStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("error", isError);
}
function clearStatus() {
  statusBox.textContent = "";
  statusBox.classList.remove("error");
}

/* ---------- Rendering: products ---------- */
function createProductCard(product) {
  const card = createEl("article", "card");

  const imgWrap = createEl("div", "card-img");
  imgWrap.appendChild(makeImage(product.imageUrl, product.name));
  imgWrap.appendChild(createEl("span", "badge", discountPercent(product) + "% OFF"));

  const body = createEl("div", "card-body");
  body.appendChild(createEl("span", "card-cat", product.category));
  body.appendChild(createEl("h3", "card-title", product.name));

  const rating = createEl("div", "rating", starString(product.rating));
  rating.appendChild(createEl("small", "", product.rating.toFixed(1)));
  body.appendChild(rating);

  const priceRow = createEl("div", "price-row");
  priceRow.appendChild(createEl("span", "price", formatPrice(product.price)));
  priceRow.appendChild(createEl("span", "orig-price", formatPrice(product.originalPrice)));
  body.appendChild(priceRow);

  const addBtn = createEl("button", "btn btn-primary", "Add to Cart");
  addBtn.addEventListener("click", () => addToCart(product.id));
  body.appendChild(addBtn);

  card.append(imgWrap, body);
  return card;
}

function renderProducts(list) {
  grid.replaceChildren();
  const fragment = document.createDocumentFragment();
  list.forEach((p) => fragment.appendChild(createProductCard(p)));
  grid.appendChild(fragment);

  noResults.hidden = list.length > 0;
  resultInfo.textContent = list.length
    ? `Showing ${list.length} of ${products.length} products`
    : "";
}

/* ---------- Filters: search + category together ---------- */
function getFilteredProducts() {
  const term = searchTerm.trim().toLowerCase();
  return products.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });
}

function applyFilters() {
  renderProducts(getFilteredProducts());
}

function renderFilterButtons() {
  filterBar.replaceChildren();
  CATEGORIES.forEach((cat) => {
    const btn = createEl("button", "filter-btn" + (cat === activeCategory ? " active" : ""), cat);
    btn.addEventListener("click", () => {
      activeCategory = cat;
      renderFilterButtons();
      applyFilters();
    });
    filterBar.appendChild(btn);
  });
}

/* ---------- Cart logic ---------- */
function findCartItem(id) {
  return cart.find((item) => item.id === id);
}

function addToCart(id) {
  const existing = findCartItem(id);
  if (existing) {
    existing.qty += 1;
  } else {
    const p = products.find((prod) => prod.id === id);
    if (!p) return;
    cart.push({ id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl, qty: 1 });
  }
  updateCart(true);
}

function changeQty(id, delta) {
  const item = findCartItem(id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else updateCart();
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  updateCart(true);
}

function clearCart() {
  cart = [];
  updateCart(true);
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getCartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

/* Single entry point: every cart change saves, then re-renders */
function updateCart(animateCount = false) {
  saveCart();
  renderCart();
  renderCartCount(animateCount);
}

/* ---------- Rendering: cart ---------- */
function createCartItem(item) {
  const row = createEl("div", "cart-item");
  row.appendChild(makeImage(item.imageUrl, item.name));

  const info = createEl("div");
  info.appendChild(createEl("div", "ci-name", item.name));
  info.appendChild(createEl("div", "ci-price", formatPrice(item.price) + " each"));

  const controls = createEl("div", "ci-controls");
  const qty = createEl("div", "qty");
  const minus = createEl("button", "", "−");
  minus.setAttribute("aria-label", "Decrease quantity");
  minus.addEventListener("click", () => changeQty(item.id, -1));
  const plus = createEl("button", "", "+");
  plus.setAttribute("aria-label", "Increase quantity");
  plus.addEventListener("click", () => changeQty(item.id, 1));
  qty.append(minus, createEl("span", "", String(item.qty)), plus);
  controls.append(qty, createEl("span", "ci-line", formatPrice(item.price * item.qty)));

  const remove = createEl("button", "remove-btn", "Remove");
  remove.addEventListener("click", () => removeFromCart(item.id));

  info.append(controls, remove);
  row.appendChild(info);
  return row;
}

function renderCart() {
  cartItemsEl.replaceChildren();
  if (cart.length === 0) {
    cartItemsEl.appendChild(createEl("div", "cart-empty", "Your cart is empty. Add something you love!"));
  } else {
    cart.forEach((item) => cartItemsEl.appendChild(createCartItem(item)));
  }
  cartTotalEl.textContent = formatPrice(getCartTotal());
}

function renderCartCount(animate = false) {
  cartCount.textContent = getCartCount();
  if (animate) {
    cartCount.classList.remove("bump");
    void cartCount.offsetWidth; // restart animation
    cartCount.classList.add("bump");
  }
}

/* ---------- localStorage ---------- */
function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    console.warn("Could not save cart:", e.message);
  }
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cart = Array.isArray(parsed)
      ? parsed.filter((i) => i && typeof i.id === "number" && i.qty > 0 && typeof i.price === "number")
      : [];
  } catch (e) {
    cart = [];
  }
}

/* ---------- Cart drawer ---------- */
function openDrawer() {
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
}

function closeDrawer() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
}

/* ---------- Events ---------- */
function bindEvents() {
  searchInput.addEventListener("input", (e) => {
    searchTerm = e.target.value;
    applyFilters();
  });
  $("cart-toggle").addEventListener("click", openDrawer);
  $("cart-close").addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  $("clear-cart").addEventListener("click", clearCart);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
}

/* ---------- Init ---------- */
function init() {
  loadCart();
  renderFilterButtons();
  renderCart();
  renderCartCount();
  bindEvents();
  loadProducts();
}

document.addEventListener("DOMContentLoaded", init);
