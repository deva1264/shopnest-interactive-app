# 🪺 ShopNest — Interactive E-commerce App

A single-page shopping app built with vanilla **HTML, CSS and JavaScript** for the JavaScript Module End Assignment 2.

## Features
- 16 products loaded with **Fetch API + async/await** from `products.json` (with loading and error/retry states)
- Product cards rendered entirely with **DOM methods** — no hardcoded product HTML
- **Live search** (`input` event) combined with **category filters** (All, Electronics, Clothing, Footwear, Books)
- **"No products found"** message when nothing matches
- Cart drawer: add, `+` / `−` quantity, remove, clear, live total
- Cart **persisted in localStorage** and restored on page load
- Live **cart item count** in the header
- Discount badges, star ratings, responsive layout, Esc / overlay to close the cart

## Run locally
`fetch()` needs a web server (it does not work from `file://`):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
or use the VS Code **Live Server** extension.

## Project structure
```
index.html     page skeleton (no product markup)
style.css      styling
script.js      state, fetch, render, filters, cart, storage
products.json  product data
```

## Code organisation (`script.js`)
`fetchProducts` / `loadProducts` · `createProductCard` / `renderProducts` · `getFilteredProducts` / `applyFilters` · `addToCart` / `changeQty` / `removeFromCart` / `clearCart` · `updateCart` · `saveCart` / `loadCart` · `openDrawer` / `closeDrawer`
