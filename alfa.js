const Whatsapp_nmbr = "919846500877";
const CART_KEY = "alfaCart";
const ORDERS_KEY = "alfaOrders";

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
  return url.replace("/image/upload/", "/image/upload/f_auto,q_auto,w_" + w + "/");
}

const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

function toggleSidebar() {
  sidebar.classList.toggle("open");
  overlay.classList.toggle("show");
  document.body.classList.toggle("sidebar-open");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
  document.body.classList.remove("sidebar-open");
}

if (menuBtn) menuBtn.addEventListener("click", toggleSidebar);
if (overlay) overlay.addEventListener("click", closeSidebar);
if (sidebar) {
  sidebar.querySelectorAll("nav a").forEach(function (a) {
    a.addEventListener("click", closeSidebar);
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

function getNumericPrice(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function getSafeQuantity(value) {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? Math.min(Math.max(Math.floor(quantity), 1), 99) : 1;
}

function cartItemFromProduct(product, quantity) {
  return {
    id: product.id || "",
    name: product.name || "Product",
    image: product.image || "",
    price: getNumericPrice(product.price),
    oldPrice: getNumericPrice(product.oldPrice),
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

  const price = getNumericPrice(item.price);
  const productPrice = getNumericPrice(product.price);
  item.price = price === null ? productPrice : price;

  const oldPrice = getNumericPrice(item.oldPrice);
  const productOldPrice = getNumericPrice(product.oldPrice);
  item.oldPrice = oldPrice === null ? productOldPrice : oldPrice;
  return item;
}

function orderNow(btn, e) {
  if (e) e.stopPropagation();
  const card = btn.closest(".alfa-card-home");
  const product = card.querySelector(".card-title").textContent;
  const image = card.querySelector(".card-img-top").src;
  const message = "Hello, I would like to know more about " + product + "\n" + image;
  window.open("https://wa.me/" + Whatsapp_nmbr + "?text=" + encodeURIComponent(message), "_blank");
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
    });
    chip.classList.add("active");
    activeCategory = chip.dataset.filter;
    applyFilters();
  });
});

// slide buttons like "Shop counter scales" switch the category chip, then scroll to #products
document.querySelectorAll("[data-goto-filter]").forEach(function (link) {
  link.addEventListener("click", function () {
    const chip = document.querySelector('.chip[data-filter="' + link.dataset.gotoFilter + '"]');
    if (chip) chip.click();
  });
});

// the colour zone behind the navbar follows the carousel
const heroZone = document.querySelector(".hero-zone");
const heroCarousel = document.getElementById("carouselExampleIndicators");
if (heroZone && heroCarousel && window.jQuery) {
  window.jQuery(heroCarousel).on("slide.bs.carousel", function (e) {
    heroZone.dataset.slide = e.to + 1;
    if (sidebar) sidebar.dataset.slide = e.to + 1;
  });
}

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
    mergeCatalogueData(item, findCatalogueProduct(item));
    item.price = getNumericPrice(item.price);
    item.oldPrice = getNumericPrice(item.oldPrice);
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
      const oldPrice = getNumericPrice(item.oldPrice);
      const category = categoryLabels[item.category] || item.category;
      const brandCategory = [item.brand, category].filter(Boolean).map(esc).join(" <span aria-hidden=\"true\">·</span> ");

      return (
        '<div class="cart-item">' +
        (item.image
          ? '<img src="' + esc(item.image) + '" alt="' + esc(item.name || "Product image") + '" />'
          : '<div class="cart-image-placeholder" aria-hidden="true"><i class="fa-solid fa-box-open"></i></div>') +
        '<div class="cart-info">' +
        '<strong class="cart-name">' + esc(item.name || "Product") + "</strong>" +
        (brandCategory ? '<div class="cart-meta">' + brandCategory + "</div>" : "") +
        '<div class="cart-price">' + (oldPrice !== null ? "<s>" + formatPrice(oldPrice) + "</s> " : "") +
          (price === null ? "Price on request" : formatPrice(price)) + "</div>" +
        '<div class="qty-box">' +
        '<button type="button" data-cart-action="decrease" data-index="' + i + '" aria-label="Decrease quantity of ' + esc(item.name || "product") + '"' + (item.qty <= 1 ? " disabled" : "") + '>&minus;</button>' +
        '<span aria-label="Quantity">' + item.qty + "</span>" +
        '<button type="button" data-cart-action="increase" data-index="' + i + '" aria-label="Increase quantity of ' + esc(item.name || "product") + '"' + (item.qty >= 99 ? " disabled" : "") + '>+</button>' +
        "</div>" +
        "</div>" +
        '<div class="cart-item-side">' +
        '<div class="cart-line-subtotal">Subtotal: <strong>' +
          (price === null ? "Price on request" : formatPrice(price * item.qty)) + "</strong></div>" +
        '<button type="button" class="remove-btn" data-cart-action="remove" data-index="' + i + '" aria-label="Remove ' + esc(item.name || "product") + ' from cart">' +
        '<i class="fa-solid fa-trash" aria-hidden="true"></i><span>Remove</span></button>' +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  summary.innerHTML =
    '<div class="cart-summary">' +
    "<h2>Order summary</h2>" +
    '<div class="cart-summary-row"><span>Total items</span><strong>' + totalQuantity + "</strong></div>" +
    '<div class="cart-summary-row"><span>Products</span><strong>' + cart.length + "</strong></div>" +
    '<div class="cart-summary-row"><span>Subtotal</span><strong>' + totalLabel + "</strong></div>" +
    '<div class="cart-summary-row cart-summary-total"><span>Total</span><strong>' + totalLabel + "</strong></div>" +
    (itemsWithoutPrice
      ? '<p class="cart-summary-note">' + itemsWithoutPrice + (itemsWithoutPrice === 1 ? " product has" : " products have") + ' no fixed price. The team will confirm the final price.</p>'
      : '<p class="cart-summary-note">Delivery charges are confirmed based on your location and order.</p>') +
    '<div class="cart-actions">' +
    '<a href="checkout.html" class="btn btn-primary checkout-link"><i class="fa-solid fa-lock" aria-hidden="true"></i> Proceed to checkout</a>' +
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

function sendOrderToServer(cart) {
  if (typeof API_URL === "undefined") return;
  const items = cart
    .filter(function (item) { return item.id; })
    .map(function (item) { return { id: item.id, qty: item.qty }; });
  if (!items.length) return;
  fetch(API_URL + "/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: items }),
    keepalive: true,
  }).catch(function () {});
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
  sendOrderToServer(cart);

  const orders = load(ORDERS_KEY);
  orders.unshift({
    id: Date.now(),
    date: new Date().toLocaleString("en-IN"),
    items: cart,
  });
  save(ORDERS_KEY, orders);
  save(CART_KEY, []);
  updateBadge();

  window.open("https://wa.me/" + Whatsapp_nmbr + "?text=" + encodeURIComponent(message), "_blank");
  window.location.href = "orders.html";
}

function renderOrders() {
  const list = document.getElementById("ordersList");
  const actions = document.getElementById("ordersActions");
  if (!list) return;

  const orders = load(ORDERS_KEY);

  if (orders.length === 0) {
    list.innerHTML =
      '<div class="empty-state">' +
      '<i class="fa-solid fa-box-open"></i>' +
      "<p>No orders yet</p>" +
      '<a href="products.html" class="btn btn-primary">Browse products</a>' +
      "</div>";
    actions.innerHTML = "";
    return;
  }

  list.innerHTML = orders
    .map(function (order, i) {
      const items = order.items
        .map(function (item) {
          return (
            "<li>" +
            '<img src="' + esc(item.image) + '" alt="" />' +
            "<span>" + esc(item.name) + "</span>" +
            "<b>x " + item.qty + "</b>" +
            "</li>"
          );
        })
        .join("");

      return (
        '<div class="order-card">' +
        '<div class="order-head">' +
        "<div><strong>Order #" + String(order.id).slice(-6) + "</strong>" +
        "<span>" + esc(order.date) + "</span></div>" +
        '<span class="order-badge">Requested via WhatsApp</span>' +
        "</div>" +
        '<ul class="order-items">' + items + "</ul>" +
        '<div class="order-actions">' +
        '<button class="btn btn-primary btn-sm" onclick="reorder(' + i + ')">Order again</button>' +
        '<button class="btn btn-outline-danger btn-sm" onclick="deleteOrder(' + i + ')">Delete</button>' +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  actions.innerHTML =
    '<button class="btn btn-outline-danger" onclick="clearOrders()">Clear all history</button>';
}

function reorder(i) {
  const orders = load(ORDERS_KEY);
  const order = orders[i];
  if (!order) return;

  const cart = load(CART_KEY);
  order.items.forEach(function (item) {
    const existing = cart.find(function (c) {
      return c.name === item.name;
    });
    if (existing) {
      existing.qty = Math.min(existing.qty + item.qty, 99);
    } else {
cart.push({ id: item.id, name: item.name, image: item.image, qty: item.qty });    }
  });
  save(CART_KEY, cart);
  window.location.href = "cart.html";
}

function deleteOrder(i) {
  const orders = load(ORDERS_KEY);
  orders.splice(i, 1);
  save(ORDERS_KEY, orders);
  renderOrders();
}

function clearOrders() {
  confirmAction("Delete all locally saved order history?", function () {
    save(ORDERS_KEY, []);
    renderOrders();
  });
}

function detailOfProduct(card) {
  const id = card.dataset.id;
  if (!id) return;
  window.location.href = "product.html?id=" + encodeURIComponent(id);
}

// search dropdown: suggestions on the left, matching products on the right
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
  if (!host || !input || typeof products === "undefined") return;

  const panel = document.createElement("div");
  panel.className = "search-panel";
  panel.hidden = true;
  host.appendChild(panel);

  function goToResults(categoryValue) {
    panel.hidden = true;
    const query = input.value.trim();
    const params = new URLSearchParams();
    if (categoryValue) params.set("category", categoryValue);
    else if (query) params.set("q", query);
    window.location.href = "products.html" + (params.toString() ? "?" + params.toString() : "");
  }

  function render() {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      panel.hidden = true;
      return;
    }

    const matches = products.filter(function (p) {
      return [p.name, p.brand, p.usedFor, p.description].join(" ").toLowerCase().includes(q);
    });

    const seen = {};
    const suggestions = [];
    function add(label, type, value) {
      if (label && label.toLowerCase().includes(q) && !seen[label]) {
        seen[label] = true;
        suggestions.push({ label: label, type: type, value: value });
      }
    }
    Object.keys(SEARCH_CATEGORY_LABELS).forEach(function (key) {
      add(SEARCH_CATEGORY_LABELS[key], "chip", key);
    });
    products.forEach(function (p) { add(p.brand, "text", p.brand); });
    products.forEach(function (p) { add(p.name, "text", p.name); });

    if (!matches.length && !suggestions.length) {
      panel.innerHTML = '<p class="search-empty">No products found. Try another word.</p>';
      panel.hidden = false;
      return;
    }

    const suggestionHtml = suggestions
      .slice(0, 5)
      .map(function (s) {
        return '<button type="button" class="search-sugg" data-type="' + s.type + '" data-value="' + esc(s.value) + '">' + highlightMatch(s.label, q) + "</button>";
      })
      .join("");

    const productHtml = matches
      .slice(0, 5)
      .map(function (p) {
        return (
          '<a class="search-product" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
          '<img src="' + esc(cld(p.image, 120)) + '" alt="" />' +
          "<div><span>" + esc(p.name) + "</span>" +
          (p.price ? "<b>" + formatPrice(p.price) + "</b>" : "") +
          "</div></a>"
        );
      })
      .join("");

    panel.innerHTML =
      '<div class="search-cols">' +
      '<div class="search-col"><h6>Suggestions</h6>' + (suggestionHtml || '<p class="search-empty">No suggestions</p>') + "</div>" +
      '<div class="search-col"><h6>Products</h6>' + (productHtml || '<p class="search-empty">No products found</p>') + "</div>" +
      "</div>" +
      (matches.length ? '<div class="search-foot"><button type="button" class="search-all">View all results</button></div>' : "");
    panel.hidden = false;
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
    if (e.key === "Enter") goToResults();
    if (e.key === "Escape") panel.hidden = true;
  });

  const icon = host.querySelector(".search-icon");
  if (icon) icon.addEventListener("click", goToResults);

  document.addEventListener("click", function (e) {
    if (!host.contains(e.target)) panel.hidden = true;
  });
}

function createProductCard(p) {
  const currentPrice = getNumericPrice(p.price);
  const oldPrice = getNumericPrice(p.oldPrice);
  const price = currentPrice !== null
    ? '<span class="card-price">' + (oldPrice !== null ? "<s>" + formatPrice(oldPrice) + "</s> " : "") + formatPrice(currentPrice) + "</span>"
    : '<span class="card-price card-price-ask">Price on request</span>';
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
    '<div class="card-img-wrap"><img src="' + esc(cld(p.image, 500)) + '" class="card-img-top" alt="' + esc(p.name || "Product image") + '" loading="lazy" /></div>' +
    '<div class="card-body">' +
    '<p class="card-brand">' + esc(p.brand || "ALFA SYSTEMS") + "</p>" +
    '<div class="card-row"><h2 class="card-title"><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name || "Product") + "</a></h2>" + price + "</div>" +
    '<p class="card-sub">' + esc(p.usedFor || "") + "</p>" + specs +
    '<p class="card-text">' + esc(searchText) + "</p>" +
    '<div class="card-actions"><a class="card-view-link" href="product.html?id=' + encodeURIComponent(p.id) + '">View Details</a>' +
    '<button class="btn btn-primary" type="button" onclick="addToCart(this, event)">Add to Cart</button></div></div>';
  return card;
}

function renderProductGrid() {
  const grid = document.getElementById("productGrid");
  if (!grid || typeof products === "undefined") return;
  const featuredLimit = Number(grid.dataset.featuredLimit) || 6;
  products.slice(0, featuredLimit).forEach(function (product) {
    grid.appendChild(createProductCard(product));
  });
}

renderProductGrid();
setupSearchDropdown();
setupCartControls();
updateBadge();
renderCart();
renderOrders();