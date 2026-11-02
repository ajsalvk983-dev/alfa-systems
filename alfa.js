const Whatsapp_nmbr = "919846500877";
const CART_KEY = "alfaCart";

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    return [];
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function esc(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

// price can be a number (1200 -> ₹1,200, 1249.5 -> ₹1,249 with small .50) or text ("From ₹900", "₹1,200 + GST")
function formatPrice(v) {
  if (typeof v !== "number") return esc(String(v));
  const paiseTotal = Math.round(v * 100);
  const rupees = Math.floor(paiseTotal / 100);
  const paise = paiseTotal % 100;
  let html = "\u20B9" + rupees.toLocaleString("en-IN");
  if (paise) html += "<sup>." + String(paise).padStart(2, "0") + "</sup>";
  return html;
}

// Cloudinary delivers a smaller, modern-format copy of a photo when asked (f_auto = best format, q_auto = best quality, w_ = width)
function cld(url, w) {
  if (!url || url.indexOf("/image/upload/") === -1) return url;
  return url.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_pad,ar_1:1,w_" + w + ",b_auto/");
}

function initProductImages(root) {
  const images = root.querySelectorAll("img:not([data-alfa-image-ready])");
  images.forEach(function (img) {
    img.dataset.alfaImageReady = "true";
    const tile = img.closest(".card-img-wrap,.category-image,.pd-photo,.pd-thumb,.pd-related-img,.lens,.search-product-image,.cart-item-image,.order-item-image,.checkout-item-image");
    const source = img.getAttribute("src");
    if (!tile || !source) return;

    function applyColor(color) {
      tile.style.backgroundColor = color;
      tile.classList.remove("image-loading");
    }

    function sampleColor() {
      if (!img.naturalWidth || !img.naturalHeight) {
        applyColor("#fff");
        return;
      }
      const cacheKey = "alfaImageColor:" + img.currentSrc;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached && /^#[0-9a-f]{6}$/i.test(cached)) {
          applyColor(cached);
          return;
        }
      } catch (error) {
        // Storage can be unavailable in private browsing; sampling still works.
      }
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 10;
        canvas.height = 10;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas context unavailable");
        context.drawImage(img, 0, 0, 10, 10);
        const pixels = context.getImageData(0, 0, 10, 10).data;
        const samples = [];
        for (let offset = 0; offset < 10; offset += 1) {
          [0, 1, 8, 9].forEach(function (edge) {
            [edge * 10 + offset, offset * 10 + edge].forEach(function (index) {
              const pixel = index * 4;
              samples.push([pixels[pixel], pixels[pixel + 1], pixels[pixel + 2]]);
            });
          });
        }
        const channels = [0, 1, 2].map(function (channel) {
          const values = samples.map(function (rgb) { return rgb[channel]; }).sort(function (a, b) { return a - b; });
          return Math.round((values[values.length / 2 - 1] + values[values.length / 2]) / 2);
        });
        const color = "#" + channels.map(function (value) { return value.toString(16).padStart(2, "0"); }).join("");
        try {
          sessionStorage.setItem(cacheKey, color);
        } catch (error) {
          // A full or disabled session store should not prevent image rendering.
        }
        applyColor(color);
      } catch (error) {
        applyColor("#fff");
      }
    }

    tile.classList.add("image-loading");
    img.addEventListener("load", sampleColor, { once: true });
    img.addEventListener("error", function () { applyColor("#fff"); }, { once: true });
    img.crossOrigin = "anonymous";
    img.src = source;
    if (img.complete && img.naturalWidth) sampleColor();
  });
}

function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast-msg";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function () {
    toast.classList.remove("show");
  }, 1800);
}

function confirmAction(message, onConfirm) {
  const dialog = document.createElement("div");
  dialog.className = "site-confirm-backdrop";
  dialog.innerHTML =
    '<section class="site-confirm" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">' +
    "<h2 id=\"confirmTitle\">Please confirm</h2>" +
    '<p class="site-confirm-message"></p>' +
    '<div class="site-confirm-actions"><button type="button" class="site-confirm-cancel">Cancel</button><button type="button" class="site-confirm-accept">Continue</button></div>' +
    "</section>";
  dialog.querySelector(".site-confirm-message").textContent = message;
  document.body.appendChild(dialog);
  const cancel = dialog.querySelector(".site-confirm-cancel");
  const accept = dialog.querySelector(".site-confirm-accept");
  function close() {
    dialog.remove();
  }
  cancel.addEventListener("click", close);
  accept.addEventListener("click", function () {
    close();
    onConfirm();
  });
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) close();
  });
  cancel.focus();
}

function updateBadge() {
  const badge = document.getElementById("cartCount");
  if (!badge) return;
  const count = load(CART_KEY).reduce(function (sum, item) {
    return sum + getSafeQuantity(item && item.qty);
  }, 0);
  badge.textContent = count;
  badge.hidden = count === 0;
}

const WISHLIST_KEY = "alfaWishlist";
const wishlistProductIds = new Set();
let wishlistSyncUserId = null;

function localWishlistIds() {
  const entries = load(WISHLIST_KEY);
  return entries.map(function (entry) {
    return String(entry && typeof entry === "object" ? entry.id || "" : entry || "");
  }).filter(Boolean);
}

function isProductWishlisted(id) {
  const key = String(id || "");
  return currentUser ? wishlistProductIds.has(key) : localWishlistIds().includes(key);
}

function updateWishlistButtons() {
  document.querySelectorAll(".card-wishlist").forEach(function (button) {
    const saved = isProductWishlisted(button.dataset.wishlistId);
    button.textContent = saved ? "♥" : "♡";
    button.setAttribute("aria-pressed", saved ? "true" : "false");
    button.setAttribute("aria-label", (saved ? "Remove " : "Add ") + (button.dataset.wishlistName || "product") + (saved ? " from" : " to") + " wishlist");
  });
}

async function syncWishlistForUser(user) {
  if (!user || wishlistSyncUserId === String(user.id)) return;
  const pending = localWishlistIds();
  for (const id of pending) {
    const response = await authFetch("/api/auth/wishlist/" + encodeURIComponent(id), { method: "POST" });
    if (response.status === 404) continue;
    if (!response.ok) throw new Error("Could not sync your saved products.");
  }
  if (pending.length) save(WISHLIST_KEY, []);
  const response = await authFetch("/api/auth/wishlist");
  if (!response.ok) throw new Error("Could not load your saved products.");
  const products = await response.json();
  if (!Array.isArray(products)) throw new Error("The wishlist API returned an invalid response.");
  wishlistProductIds.clear();
  products.forEach(function (product) { wishlistProductIds.add(String(product.id)); });
  wishlistSyncUserId = String(user.id);
  updateWishlistButtons();
}

async function toggleWishlist(button) {
  const id = button.dataset.wishlistId;
  if (!id) return;
  try {
    const user = currentUser || (getAuthToken() ? await getUser() : null);
    if (user) {
      await syncWishlistForUser(user);
      const saved = wishlistProductIds.has(String(id));
      const response = await authFetch("/api/auth/wishlist/" + encodeURIComponent(id), {
        method: saved ? "DELETE" : "POST",
      });
      if (!response.ok) throw new Error("Could not update your wishlist.");
      if (saved) wishlistProductIds.delete(String(id));
      else wishlistProductIds.add(String(id));
    } else {
      const ids = localWishlistIds();
      const saved = ids.includes(String(id));
      save(WISHLIST_KEY, saved ? ids.filter(function (value) { return value !== String(id); }) : ids.concat(String(id)).slice(-200));
    }
    updateWishlistButtons();
    showToast(isProductWishlisted(id) ? "Saved to your wishlist" : "Removed from your wishlist");
  } catch (error) {
    showToast(error.message || "Could not update your wishlist.");
  }
}

window.addEventListener("alfa-auth-change", function (event) {
  if (!event.detail) {
    wishlistProductIds.clear();
    wishlistSyncUserId = null;
    updateWishlistButtons();
    return;
  }
  syncWishlistForUser(event.detail).catch(function (error) {
    showToast(error.message || "Could not sync your wishlist.");
  });
});

function getNumericPrice(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function getDiscount(product) {
  if (!product || typeof product.price !== "number" || typeof product.oldPrice !== "number") return null;
  if (!Number.isFinite(product.price) || !Number.isFinite(product.oldPrice) || product.price < 0 || product.oldPrice <= 0 || product.oldPrice <= product.price) return null;
  return {
    amount: product.oldPrice - product.price,
    percent: Math.round((product.oldPrice - product.price) / product.oldPrice * 100)
  };
}

function getSafeQuantity(value) {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? Math.min(Math.max(Math.floor(quantity), 1), 99) : 1;
}

function cartItemFromProduct(product, quantity) {
  const numericPrice = getNumericPrice(product.price);
  return {
    id: product.id || "",
    name: product.name || "Product",
    image: product.image || "",
    price: numericPrice,
    priceText: numericPrice === null && typeof product.price === "string" ? product.price : "",
    oldPrice: typeof product.oldPrice === "number" ? getNumericPrice(product.oldPrice) : null,
    brand: product.brand || "",
    category: product.category || "",
    qty: getSafeQuantity(quantity)
  };
}

function findCatalogueProduct(item) {
  if (typeof products === "undefined" || !Array.isArray(products)) return null;
  return products.find(function (product) {
    return item.id && String(product.id) === String(item.id);
  }) || products.find(function (product) {
    return item.name && String(product.name).toLowerCase() === String(item.name).toLowerCase();
  }) || null;
}

function mergeCatalogueData(item, product) {
  if (!product) return item;
  if (!item.id) item.id = product.id || "";
  if (!item.name) item.name = product.name || "Product";
  if (!item.image) item.image = product.image || "";
  if (!item.brand) item.brand = product.brand || "";
  if (!item.category) item.category = product.category || "";

  const productPrice = getNumericPrice(product.price);
  item.price = productPrice;

  const productOldPrice = typeof product.oldPrice === "number" ? getNumericPrice(product.oldPrice) : null;
  item.oldPrice = productOldPrice;
  item.priceText = typeof product.price === "string" && productPrice === null ? product.price : "";
  return item;
}

function addToCart(btn, e) {
  if (e) e.stopPropagation();
  const card = btn.closest(".alfa-card-home");
  const name = card.querySelector(".card-title").textContent.trim();
  const id = card.dataset.id;
  const product = findCatalogueProduct({ id: id, name: name }) || {
    id: id,
    name: name,
    image: card.querySelector(".card-img-top").src
  };

  const cart = load(CART_KEY);
  const existing = cart.find(function (item) {
  return item && ((id && String(item.id) === String(id)) || item.name === name);
  });

  if (existing) {
    mergeCatalogueData(existing, product);
    existing.qty = Math.min(getSafeQuantity(existing.qty) + 1, 99);
  } else {
    cart.push(cartItemFromProduct(product, 1));
  }

  save(CART_KEY, cart);
  updateBadge();
  if (btn) {
    const originalText = btn.dataset.originalText || btn.textContent;
    btn.dataset.originalText = originalText;
    btn.textContent = "✓ Added";
    btn.classList.add("added");
    btn.disabled = true;
    setTimeout(function () {
      btn.textContent = originalText;
      btn.classList.remove("added");
      btn.disabled = false;
    }, 1100);
  }
  showToast(name + " added to cart");
}

let activeCategory = "all";
let searchText = "";

function applyFilters() {
  const cards = document.querySelectorAll(".alfa-card-home");
  if (!cards.length) return;
  let visible = 0;
  cards.forEach(function (card) {
    const title = card.querySelector(".card-title").textContent;
    const desc = card.querySelector(".card-text").textContent;
    const matchText = (title + " " + desc).toLowerCase().includes(searchText);
    const matchCategory = activeCategory === "all" || card.dataset.category === activeCategory;
    const show = matchText && matchCategory;
    card.style.display = show ? "flex" : "none";
    if (show) visible++;
  });
  const empty = document.getElementById("noResults");
  if (empty) empty.hidden = visible > 0;
}

const searchInput = document.querySelector(".search");
if (searchInput) {
  searchInput.addEventListener("input", function () {
    searchText = this.value.trim().toLowerCase();
    applyFilters();
  });
}

document.querySelectorAll(".chip").forEach(function (chip) {
  chip.addEventListener("click", function () {
    document.querySelectorAll(".chip").forEach(function (c) {
      c.classList.remove("active");
      c.setAttribute("aria-pressed", "false");
    });
    chip.classList.add("active");
    chip.setAttribute("aria-pressed", "true");
    activeCategory = chip.dataset.filter;
    applyFilters();
  });
});

function renderCart() {
  const list = document.getElementById("cartList");
  const summary = document.getElementById("cartSummary");
  if (!list) return;

  const count = document.getElementById("cartItemsCount");
  const layout = list.closest(".cart-layout");
  const cart = load(CART_KEY).filter(function (item) {
    return item && typeof item === "object";
  });
  cart.forEach(function (item) {
    const product = findCatalogueProduct(item);
    if (product) mergeCatalogueData(item, product);
    else {
      item.price = null;
      item.oldPrice = null;
      item.priceText = "";
    }
    item.price = getNumericPrice(item.price);
    item.oldPrice = typeof item.oldPrice === "number" ? getNumericPrice(item.oldPrice) : null;
    item.qty = getSafeQuantity(item.qty);
  });
  save(CART_KEY, cart);

  if (cart.length === 0) {
    if (count) count.textContent = "";
    if (layout) layout.classList.add("cart-empty");
    if (summary) summary.hidden = true;
    list.innerHTML =
      '<div class="empty-state">' +
      '<i class="fa-solid fa-cart-shopping"></i>' +
      "<h2>Your cart is empty</h2>" +
      "<p>You haven't added any products yet. Explore our weighing and business equipment to get started.</p>" +
      '<a href="products.html" class="btn btn-primary">Browse products</a>' +
      "</div>";
    summary.innerHTML = "";
    return;
  }
  if (layout) layout.classList.remove("cart-empty");
  if (summary) summary.hidden = false;

  const totalQuantity = cart.reduce(function (sum, item) {
    return sum + item.qty;
  }, 0);
  const itemsWithPrice = cart.filter(function (item) {
    return getNumericPrice(item.price) !== null;
  });
  const itemsWithoutPrice = cart.length - itemsWithPrice.length;
  const pricedSubtotal = itemsWithPrice.reduce(function (sum, item) {
    return sum + getNumericPrice(item.price) * item.qty;
  }, 0);
  const discountTotal = cart.reduce(function (sum, item) {
    const discount = getDiscount(item);
    return discount ? sum + discount.amount * item.qty : sum;
  }, 0);
  const totalLabel = itemsWithoutPrice
    ? formatPrice(pricedSubtotal) + "+"
    : formatPrice(pricedSubtotal);
  const categoryLabels = {
    platform: "Platform scales",
    counter: "Counter scales",
    label: "Label printing",
    portable: "Portable & precision",
    sealing: "Sealing machines"
  };
  if (count) {
    count.textContent = cart.length + (cart.length === 1 ? " product" : " products") +
      " · " + totalQuantity + (totalQuantity === 1 ? " item" : " items");
  }

  list.innerHTML = cart
    .map(function (item, i) {
      const price = getNumericPrice(item.price);
      const discount = getDiscount(item);
      const category = categoryLabels[item.category] || item.category;
      const brandCategory = [item.brand, category].filter(Boolean).map(esc).join(" <span aria-hidden=\"true\">·</span> ");

      return (
        '<div class="cart-item">' +
        (item.image
          ? '<span class="cart-item-image"><img src="' + esc(cld(item.image, 220)) + '" alt="' + esc(item.name || "Product image") + '" /></span>'
          : '<div class="cart-image-placeholder" aria-hidden="true"><i class="fa-solid fa-box-open"></i></div>') +
        '<div class="cart-info">' +
        '<strong class="cart-name">' + esc(item.name || "Product") + "</strong>" +
        (brandCategory ? '<div class="cart-meta">' + brandCategory + "</div>" : "") +
        '<div class="cart-price">' +
          (price === null ? esc(item.priceText || "Ask price") : formatPrice(price)) +
          (discount ? ' <s>' + formatPrice(price + discount.amount) + '</s><span class="discount-label">' + discount.percent + '% off</span>' : "") +
          "</div>" +
        '<div class="qty-box">' +
        '<button type="button" data-cart-action="decrease" data-index="' + i + '" aria-label="Decrease quantity of ' + esc(item.name || "product") + '"' + (item.qty <= 1 ? " disabled" : "") + '>&minus;</button>' +
        '<span aria-label="Quantity">' + item.qty + "</span>" +
        '<button type="button" data-cart-action="increase" data-index="' + i + '" aria-label="Increase quantity of ' + esc(item.name || "product") + '"' + (item.qty >= 99 ? " disabled" : "") + '>+</button>' +
        "</div>" +
        "</div>" +
        '<div class="cart-item-side">' +
        '<div class="cart-line-subtotal">Subtotal: <strong>' +
          (price === null ? esc(item.priceText || "Ask price") : formatPrice(price * item.qty)) + "</strong></div>" +
        '<button type="button" class="remove-btn" data-cart-action="remove" data-index="' + i + '" aria-label="Remove ' + esc(item.name || "product") + ' from cart">' +
        '<i class="fa-solid fa-trash" aria-hidden="true"></i><span>Remove</span></button>' +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  summary.innerHTML =
    '<div class="cart-summary">' +
    "<h2>Order Summary</h2>" +
    '<div class="cart-summary-row"><span>Total items</span><strong>' + totalQuantity + "</strong></div>" +
    '<div class="cart-summary-row"><span>Products</span><strong>' + cart.length + "</strong></div>" +
    (discountTotal > 0
      ? '<div class="cart-summary-row cart-summary-discount"><span>You save</span><strong>&minus;' + formatPrice(discountTotal) + "</strong></div>"
      : "") +
    '<div class="cart-summary-row"><span>Product subtotal</span><strong>' + totalLabel + "</strong></div>" +
    '<div class="cart-summary-row"><span>Delivery charge</span><strong>To be confirmed</strong></div>' +
    '<div class="cart-summary-row cart-summary-total"><span>Final total</span><strong>To be confirmed</strong></div>' +
    (itemsWithoutPrice
      ? '<p class="cart-summary-note">' + itemsWithoutPrice + (itemsWithoutPrice === 1 ? " product has" : " products have") + ' no fixed price. The team will confirm the final price.</p>'
      : '<p class="cart-summary-note">Delivery charges are confirmed based on your location and order.</p>') +
    '<div class="cart-actions">' +
    '<a href="checkout.html" class="btn btn-primary checkout-link"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i> Proceed to checkout</a>' +
    '<button type="button" class="btn checkout-whatsapp" data-cart-action="order"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Order on WhatsApp</button>' +
    '<a href="products.html" class="cart-continue"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Continue shopping</a>' +
    '<button type="button" class="cart-clear" data-cart-action="clear">Clear cart</button>' +
    "</div>" +
    "</div>";
}

function setupCartControls() {
  const list = document.getElementById("cartList");
  const summary = document.getElementById("cartSummary");

  if (list) {
    list.addEventListener("click", function (event) {
      const button = event.target.closest("[data-cart-action]");
      if (!button) return;

      const index = Number(button.dataset.index);
      if (button.dataset.cartAction === "decrease") changeQty(index, -1);
      if (button.dataset.cartAction === "increase") changeQty(index, 1);
      if (button.dataset.cartAction === "remove") removeFromCart(index);
    });
  }

  if (summary) {
    summary.addEventListener("click", function (event) {
      const button = event.target.closest("[data-cart-action]");
      if (!button) return;

      if (button.dataset.cartAction === "clear") clearCart();
      if (button.dataset.cartAction === "order") placeOrder();
    });
  }
}

function changeQty(i, delta) {
  const cart = load(CART_KEY);
  if (!cart[i]) return;
  cart[i].qty = Math.min(Math.max(getSafeQuantity(cart[i].qty) + delta, 1), 99);
  save(CART_KEY, cart);
  updateBadge();
  renderCart();
}

function removeFromCart(i) {
  const cart = load(CART_KEY);
  cart.splice(i, 1);
  save(CART_KEY, cart);
  updateBadge();
  renderCart();
}

function clearCart() {
  confirmAction("Remove all items from your cart?", function () {
    save(CART_KEY, []);
    updateBadge();
    renderCart();
  });
}

function placeOrder() {
  const cart = load(CART_KEY);
  if (cart.length === 0) {
    showToast("Cart is empty");
    return;
  }

  const lines = cart.map(function (item, i) {
    return i + 1 + ". " + item.name + " x " + item.qty;
  });
  const message = "Hello, I want to order:\n" + lines.join("\n");
  save(CART_KEY, []);
  updateBadge();

  window.open("https://wa.me/" + Whatsapp_nmbr + "?text=" + encodeURIComponent(message), "_blank");
  window.location.href = "orders.html";
}

function detailOfProduct(card) {
  const id = card.dataset.id;
  if (!id) return;
  window.location.href = "product.html?id=" + encodeURIComponent(id);
}

const SEARCH_CATEGORY_LABELS = {
  platform: "Platform scales",
  counter: "Counter scales",
  label: "Label printing",
  portable: "Portable & precision",
  sealing: "Sealing machines"
};

function highlightMatch(text, q) {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + "<b>" + esc(text.slice(i, i + q.length)) + "</b>" + esc(text.slice(i + q.length));
}

function setupSearchDropdown() {
  const host = document.querySelector(".yt-search");
  const input = document.querySelector(".search");
  const navbar = host && host.closest(".navbar");
  if (!host || !input || !navbar || typeof products === "undefined") return;

  const panel = document.createElement("div");
  panel.className = "search-panel";
  panel.hidden = true;
  document.body.appendChild(panel);
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "search-clear";
  clear.setAttribute("aria-label", "Clear search or close search");
  clear.textContent = "×";
  clear.hidden = true;
  host.appendChild(clear);
  const homePage = document.body.classList.contains("home-page");
  const previousBodyOverflow = document.body.style.overflow;

  function setSearchOpen(open) {
    navbar.classList.toggle("search-open", open);
    panel.hidden = !open || !input.value.trim();
    document.body.style.overflow = open ? "hidden" : previousBodyOverflow;
  }

  function positionPanel() {
    if (panel.hidden) return;
    const bounds = input.getBoundingClientRect();
    const mobile = window.matchMedia("(max-width: 600px)").matches;
    const navBounds = navbar.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportTop = viewport ? viewport.offsetTop : 0;
    const viewportLeft = viewport ? viewport.offsetLeft : 0;
    const viewportWidth = viewport ? viewport.width : window.innerWidth;
    const viewportHeight = viewport ? viewport.height : window.innerHeight;
    const width = mobile ? Math.max(0, viewportWidth - 16) : Math.min(viewportWidth - 16, Math.max(bounds.width, 360));
    const left = mobile ? viewportLeft + 8 : Math.max(viewportLeft + 8, Math.min(bounds.left, viewportLeft + viewportWidth - width - 8));
    const hostBounds = host.getBoundingClientRect();
    const clearBounds = clear.getBoundingClientRect();
    const icon = host.querySelector(".search-icon");
    const iconBounds = icon ? icon.getBoundingClientRect() : bounds;
    const anchor = mobile
      ? Math.max(navBounds.bottom, hostBounds.bottom, bounds.bottom, clearBounds.bottom, iconBounds.bottom) + 8
      : bounds.bottom + 8;
    const top = Math.min(Math.max(anchor, viewportTop + 8), viewportTop + viewportHeight - 32);
    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.width = width + "px";
    panel.style.maxHeight = Math.max(0, viewportTop + viewportHeight - top - 12) + "px";
  }

  function goToResults(categoryValue) {
    setSearchOpen(false);
    const query = input.value.trim();
    if (homePage) {
      if (categoryValue) {
        input.value = "";
        clear.hidden = true;
        document.querySelectorAll(".chip[data-filter]").forEach(function (chip) {
          const selected = chip.dataset.filter === categoryValue;
          chip.classList.toggle("active", selected);
          chip.setAttribute("aria-pressed", selected ? "true" : "false");
        });
        activeCategory = categoryValue;
      }
      searchText = query.toLowerCase();
      applyFilters();
      const productsSection = document.getElementById("products");
      if (productsSection) productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const params = new URLSearchParams();
    if (categoryValue) params.set("category", categoryValue);
    else if (query) params.set("q", query);
    window.location.href = "products.html" + (params.toString() ? "?" + params.toString() : "");
  }

  function render() {
    const q = input.value.trim().toLowerCase();
    clear.hidden = !input.value && !navbar.classList.contains("search-open");
    if (!q) {
      panel.hidden = true;
      return;
    }

    const matches = products.filter(function (p) {
      return [p.name, p.brand, p.category, p.usedFor, p.description, p.capacity, p.accuracy].join(" ").toLowerCase().includes(q);
    });

    const seen = Object.create(null);
    const suggestions = [];
    function add(label, type, value) {
      if (label && label.toLowerCase().includes(q) && !seen[label.toLowerCase()]) {
        seen[label.toLowerCase()] = true;
        suggestions.push({ label: label, type: type, value: value });
      }
    }
    Object.keys(SEARCH_CATEGORY_LABELS).forEach(function (key) {
      add(SEARCH_CATEGORY_LABELS[key], "chip", key);
    });
    products.forEach(function (p) { add(p.brand, "text", p.brand); });
    products.forEach(function (p) { add(p.name, "text", p.name); });

    const suggestionHtml = suggestions
      .slice(0, 8)
      .map(function (s) {
        return '<button type="button" class="search-sugg" data-type="' + s.type + '" data-value="' + esc(s.value) + '">' + highlightMatch(s.label, q) + "</button>";
      })
      .join("");

    const productHtml = matches
      .slice(0, 6)
      .map(function (p) {
        const discount = getDiscount(p);
        return (
          '<a class="search-product" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
          '<span class="search-product-image"><img src="' + esc(cld(p.image, 120)) + '" alt="" crossorigin="anonymous" /></span>' +
          '<span class="search-product-copy"><span>' + highlightMatch(String(p.name || "Product"), q) + "</span>" +
          (p.price ? "<b>" + formatPrice(p.price) + "</b>" : "") +
          (discount ? '<small class="search-discount">' + discount.percent + "% off</small>" : "") +
          "</span></a>"
        );
      })
      .join("");

    const quickCategories = [
      ["Platform", "platform"],
      ["Counter", "counter"],
      ["Label Printing", "label"],
      ["Sealing", "sealing"]
    ];
    const emptyHtml = '<p class="search-empty">No products found for &quot;' + esc(input.value.trim()) + '&quot;</p>' +
      '<div class="search-quick-chips">' + quickCategories.map(function (item) {
        return '<button type="button" class="search-sugg" data-type="chip" data-value="' + item[1] + '">' + item[0] + "</button>";
      }).join("") + '</div><a class="search-whatsapp" href="https://wa.me/' + Whatsapp_nmbr + '?text=' +
      encodeURIComponent("Hello, I couldn't find " + input.value.trim() + " on the ALFA SYSTEMS website.") +
      '" target="_blank" rel="noopener">Ask on WhatsApp</a>';
    panel.innerHTML =
      '<section class="search-results"><h2>Products</h2>' + (matches.length ? productHtml : emptyHtml) + "</section>" +
      (matches.length && suggestions.length ? '<section class="search-suggestions"><h2>Suggestions</h2><div>' + suggestionHtml + "</div></section>" : "") +
      (matches.length ? '<div class="search-foot"><button type="button" class="search-all">View all results</button></div>' : "");
    panel.hidden = false;
    positionPanel();
    initProductImages(panel);
  }

  panel.addEventListener("click", function (e) {
    const sugg = e.target.closest(".search-sugg");
    if (sugg) {
      if (sugg.dataset.type === "chip") {
        goToResults(sugg.dataset.value);
      } else {
        input.value = sugg.dataset.value;
        searchText = input.value.trim().toLowerCase();
        goToResults();
      }
      return;
    }
    if (e.target.closest(".search-all")) goToResults();
  });

  input.addEventListener("input", render);
  input.addEventListener("focus", render);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      setSearchOpen(false);
      input.blur();
    } else if (e.key === "Enter") {
      goToResults();
    }
    if (e.key === "ArrowDown" && !panel.hidden) {
      const firstResult = panel.querySelector(".search-product, .search-sugg, .search-all");
      if (firstResult) {
        e.preventDefault();
        firstResult.focus();
      }
    } else if (e.key === "ArrowUp" && !panel.hidden) {
      const entries = panel.querySelectorAll(".search-product, .search-sugg, .search-all");
      if (entries.length) {
        e.preventDefault();
        entries[entries.length - 1].focus();
      }
    }
  });
  panel.addEventListener("keydown", function (e) {
    const entries = Array.from(panel.querySelectorAll(".search-product, .search-sugg, .search-all"));
    const current = entries.indexOf(document.activeElement);
    if (e.key === "Escape") {
      e.preventDefault();
      setSearchOpen(false);
      input.blur();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next = current < 0 ? 0 : (current + step + entries.length) % entries.length;
      if (entries[next]) entries[next].focus();
    } else if (e.key === "Enter" && current >= 0) {
      e.preventDefault();
      entries[current].click();
    }
  });

  const icon = host.querySelector(".search-icon");
  if (icon) icon.addEventListener("click", function () {
    if (window.matchMedia("(max-width: 600px)").matches && !navbar.classList.contains("search-open")) {
      setSearchOpen(true);
      input.focus();
      return;
    }
    goToResults();
  });
  clear.addEventListener("click", function () {
    if (!input.value) {
      setSearchOpen(false);
      input.blur();
      return;
    }
    input.value = "";
    searchText = "";
    panel.hidden = true;
    clear.hidden = true;
    applyFilters();
    input.focus();
  });
  document.addEventListener("click", function (e) {
    if (!navbar.contains(e.target) && !panel.contains(e.target)) {
      setSearchOpen(false);
      input.blur();
    }
  });
  function closeForNavigation() {
    setSearchOpen(false);
  }
  window.addEventListener("resize", positionPanel);
  window.addEventListener("orientationchange", positionPanel);
  window.addEventListener("scroll", positionPanel, true);
  window.addEventListener("pagehide", closeForNavigation);
  window.addEventListener("popstate", closeForNavigation);
  window.addEventListener("hashchange", closeForNavigation);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", positionPanel);
    window.visualViewport.addEventListener("scroll", positionPanel);
  }
}

function createProductCard(p) {
  const currentPrice = getNumericPrice(p.price);
  const discount = getDiscount(p);
  const price = currentPrice !== null
    ? '<span class="card-price">' + formatPrice(currentPrice) + "</span>" +
      (discount ? '<s class="card-old-price">' + formatPrice(currentPrice + discount.amount) + "</s>" : "")
    : '<span class="card-price card-price-ask">' + (typeof p.price === "string" && p.price.trim() ? formatPrice(p.price) : "Ask price") + "</span>";
  const discountBadge = discount ? '<span class="card-discount">' + discount.percent + "% off</span>" : "";
  const facts = [];
  if (p.capacity && String(p.capacity).indexOf("XX") === -1) facts.push(esc(p.capacity) + " capacity");
  if (p.accuracy && String(p.accuracy).indexOf("XX") === -1) facts.push(esc(p.accuracy) + " accuracy");
  const specs = facts.length
    ? '<div class="card-specs">' + facts.map(function (fact) { return "<span>" + fact + "</span>"; }).join("") + "</div>"
    : "";
  const searchText = [p.description, p.brand, p.usedFor, p.category, p.capacity, p.accuracy].join(" ");
  const card = document.createElement("article");
  card.className = "alfa-card-home";
  card.dataset.id = p.id || "";
  card.dataset.category = p.category || "";
  card.innerHTML =
    '<button type="button" class="card-wishlist" onclick="toggleWishlist(this)" data-wishlist-id="' + esc(p.id || "") + '" data-wishlist-name="' + esc(p.name || "product") + '" aria-pressed="' + (isProductWishlisted(p.id) ? "true" : "false") + '" aria-label="' + (isProductWishlisted(p.id) ? "Remove " : "Add ") + esc(p.name || "product") + (isProductWishlisted(p.id) ? " from" : " to") + ' wishlist">' + (isProductWishlisted(p.id) ? "♥" : "♡") + "</button>" +
    '<div class="card-img-wrap">' + discountBadge + '<img src="' + esc(cld(p.image, 500)) + '" class="card-img-top" alt="' + esc(p.name || "Product image") + '" loading="lazy" /></div>' +
    '<div class="card-body">' +
    '<div class="card-row"><h2 class="card-title"><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name || "Product") + "</a></h2>" +
    '<div class="card-price-block">' + price + (discount ? '<span class="card-off-text">' + discount.percent + "% off</span>" : "") + "</div></div>" +
    '<p class="card-sub">' + esc(p.usedFor || p.description || "") + "</p>" + specs +
    '<p class="card-text card-search-text">' + esc(searchText) + "</p>" +
    '<div class="card-actions"><button class="btn btn-primary" type="button" onclick="addToCart(this, event)">Add to Cart</button></div></div>';
  return card;
}

function renderProductGrid() {
  const grid = document.getElementById("productGrid");
  if (!grid || typeof products === "undefined") return;
  const featuredLimit = Number(grid.dataset.featuredLimit);
  const visibleProducts = featuredLimit > 0 ? products.slice(0, featuredLimit) : products;
  visibleProducts.forEach(function (product) {
    grid.appendChild(createProductCard(product));
  });
}

function setupStickyNav() {
  const navbar = document.querySelector(".navbar");
  if (!navbar) return;
  const updateScrolledState = function () {
    navbar.classList.toggle("scrolled", window.scrollY > 24);
  };
  updateScrolledState();
  window.addEventListener("scroll", updateScrolledState, { passive: true });
}

function setupCarouselSwipe() {
  const carousel = document.querySelector(".alfa-carousel");
  if (!carousel) return;
  const slides = Array.from(carousel.querySelectorAll(".carousel-item"));
  const indicators = Array.from(carousel.querySelectorAll("[data-slide-to]"));
  const heroZone = document.querySelector(".hero-zone");
  if (!slides.length) return;
  let activeIndex = Math.max(0, slides.findIndex(function (slide) { return slide.classList.contains("active"); }));
  let autoplayTimer = null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function updatePalette(index) {
    const slide = slides[index].querySelector(".alfa-slide");
    if (!slide) return;
    const colors = window.getComputedStyle(slide);
    ["bg1", "bg2", "accent", "ink"].forEach(function (name) {
      const value = colors.getPropertyValue("--" + name).trim();
      if (value) document.documentElement.style.setProperty("--search-" + name.replace(/[0-9]/g, "-$&"), value);
    });
    if (heroZone) heroZone.dataset.slide = String(index + 1);
    document.documentElement.dataset.palette = String(index + 1);
    try {
      sessionStorage.setItem("alfaPalette", String(index + 1));
    } catch (error) {
      console.warn("Could not save the selected colour palette.", error);
    }
  }

  function showSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach(function (slide, position) {
      const active = position === activeIndex;
      slide.classList.toggle("active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });
    indicators.forEach(function (indicator, position) {
      const active = position === activeIndex;
      indicator.classList.toggle("active", active);
      indicator.setAttribute("aria-current", active ? "true" : "false");
    });
    updatePalette(activeIndex);
  }

  function stopAutoplay() {
    if (autoplayTimer !== null) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function startAutoplay() {
    stopAutoplay();
    if (reducedMotion || document.hidden || slides.length < 2) return;
    autoplayTimer = setInterval(function () { showSlide(activeIndex + 1); }, 5500);
  }

  carousel.querySelectorAll("[data-slide]").forEach(function (control) {
    control.addEventListener("click", function (event) {
      event.preventDefault();
      showSlide(activeIndex + (control.dataset.slide === "next" ? 1 : -1));
      startAutoplay();
    });
  });
  indicators.forEach(function (indicator, index) {
    indicator.setAttribute("role", "button");
    indicator.setAttribute("tabindex", "0");
    indicator.addEventListener("click", function () {
      showSlide(index);
      startAutoplay();
    });
    indicator.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showSlide(index);
        startAutoplay();
      }
    });
  });

  showSlide(activeIndex);
  carousel.addEventListener("mouseenter", stopAutoplay);
  carousel.addEventListener("mouseleave", startAutoplay);
  carousel.addEventListener("focusin", stopAutoplay);
  carousel.addEventListener("focusout", function (event) {
    if (!carousel.contains(event.relatedTarget)) startAutoplay();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });
  window.addEventListener("pagehide", stopAutoplay);

  let startX = 0;
  let startY = 0;
  carousel.addEventListener("touchstart", function (event) {
    const touch = event.changedTouches[0];
    startX = touch.clientX;
    startY = touch.clientY;
  }, { passive: true });
  carousel.addEventListener("touchend", function (event) {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    showSlide(activeIndex + (deltaX < 0 ? 1 : -1));
    startAutoplay();
  }, { passive: true });
}

setupSearchDropdown();
const storefrontProductsReady = typeof loadProducts === "function"
  ? loadProducts()
  : Promise.resolve(false);
storefrontProductsReady.then(function () {
  renderProductGrid();
  renderCart();
  initProductImages(document);
});
new MutationObserver(function (records) {
  records.forEach(function (record) {
    record.addedNodes.forEach(function (node) {
      if (node.nodeType === 1) {
        if (node.matches("img")) initProductImages(node.parentElement || document);
        else initProductImages(node);
      }
    });
  });
}).observe(document.body, { childList: true, subtree: true });
setupStickyNav();
setupCarouselSwipe();
setupCartControls();
updateBadge();
renderCart();