const Whatsapp_nmbr = "919562992298";
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

function updateBadge() {
  const badge = document.getElementById("cartCount");
  if (!badge) return;
  const count = load(CART_KEY).reduce(function (sum, item) {
    return sum + item.qty;
  }, 0);
  badge.textContent = count;
  badge.hidden = count === 0;
}

function orderNow(btn) {
  const card = btn.closest(".alfa-card-home");
  const product = card.querySelector(".card-title").textContent;
  const image = card.querySelector(".card-img-top").src;
  const message = "Hello, I would like to know more about " + product + "\n" + image;
  window.open("https://wa.me/" + Whatsapp_nmbr + "?text=" + encodeURIComponent(message), "_blank");
}

function addToCart(btn) {
  const card = btn.closest(".alfa-card-home");
  const name = card.querySelector(".card-title").textContent.trim();
  const image = card.querySelector(".card-img-top").src;

  const cart = load(CART_KEY);
  const existing = cart.find(function (item) {
    return item.name === name;
  });

  if (existing) {
    existing.qty = Math.min(existing.qty + 1, 99);
  } else {
    cart.push({ name: name, image: image, qty: 1 });
  }

  save(CART_KEY, cart);
  updateBadge();
  showToast(name + " added to cart");
}

const searchInput = document.querySelector(".search");
if (searchInput) {
  searchInput.addEventListener("input", function () {
    const text = this.value.toLowerCase();
    document.querySelectorAll(".alfa-card-home").forEach(function (card) {
      const match = card.textContent.toLowerCase().includes(text);
      card.style.display = match ? "flex" : "none";
    });
  });
}

function renderCart() {
  const list = document.getElementById("cartList");
  const summary = document.getElementById("cartSummary");
  if (!list) return;

  const cart = load(CART_KEY);

  if (cart.length === 0) {
    list.innerHTML =
      '<div class="empty-state">' +
      '<i class="fa-solid fa-cart-shopping"></i>' +
      "<p>Your cart is empty</p>" +
      '<a href="alfa.html#products" class="btn btn-primary">Browse products</a>' +
      "</div>";
    summary.innerHTML = "";
    return;
  }

  list.innerHTML = cart
    .map(function (item, i) {
      return (
        '<div class="cart-item">' +
        '<img src="' + esc(item.image) + '" alt="' + esc(item.name) + '" />' +
        '<div class="cart-info">' +
        '<div class="cart-name">' + esc(item.name) + "</div>" +
        '<div class="qty-box">' +
        '<button onclick="changeQty(' + i + ', -1)" aria-label="Decrease">-</button>' +
        "<span>" + item.qty + "</span>" +
        '<button onclick="changeQty(' + i + ', 1)" aria-label="Increase">+</button>' +
        "</div>" +
        "</div>" +
        '<button class="remove-btn" onclick="removeFromCart(' + i + ')" aria-label="Remove">' +
        '<i class="fa-solid fa-trash"></i></button>' +
        "</div>"
      );
    })
    .join("");

  const total = cart.reduce(function (sum, item) {
    return sum + item.qty;
  }, 0);

  summary.innerHTML =
    '<div class="cart-summary">' +
    "<div><strong>" + total + "</strong> item(s) in cart</div>" +
    '<div class="cart-actions">' +
    '<button class="btn btn-outline-danger" onclick="clearCart()">Clear cart</button>' +
    '<button class="btn btn-success" onclick="placeOrder()">Order on WhatsApp</button>' +
    "</div>" +
    "</div>";
}

function changeQty(i, delta) {
  const cart = load(CART_KEY);
  if (!cart[i]) return;
  cart[i].qty = Math.min(Math.max(cart[i].qty + delta, 1), 99);
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
  if (!confirm("Remove all items from the cart?")) return;
  save(CART_KEY, []);
  updateBadge();
  renderCart();
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
      '<a href="alfa.html#products" class="btn btn-primary">Browse products</a>' +
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
        '<span class="order-badge">Sent on WhatsApp</span>' +
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
      cart.push({ name: item.name, image: item.image, qty: item.qty });
    }
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
  if (!confirm("Delete all order history?")) return;
  save(ORDERS_KEY, []);
  renderOrders();
}

updateBadge();
renderCart();
renderOrders();