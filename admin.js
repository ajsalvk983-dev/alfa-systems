const PW_KEY = "alfaAdminPw";
const CLOUD_NAME_KEY = "alfaCloudinaryCloudName";
const UPLOAD_PRESET_KEY = "alfaCloudinaryUploadPreset";
const CLOUD_NAME_DEFAULT = "ddng8ksv6";
const UPLOAD_PRESET_DEFAULT = "alfa_products";
const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Ready",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];
let adminPw = sessionStorage.getItem(PW_KEY) || "";
let productList = [];
let categoryList = [];
let orderList = [];
let customerList = [];
let serviceRequestList = [];
let ordersOffset = 0;
let totalOrdersCount = 0;
let customerSearchTimer = 0;
let customerSearchRequest = 0;
let dashboardStatsRequest = 0;
let editorImages = [];
let mainImageIndex = 0;
let editingProduct = false;
let selectedOrder = null;

function $(id) {
  return document.getElementById(id);
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function confirmAdminAction(message, actionLabel) {
  return new Promise(function (resolve) {
    const dialog = document.createElement("dialog");
    dialog.className = "admin-confirm-dialog";
    const heading = el("h2", "Please confirm");
    const detail = el("p", message);
    const actions = el("div", null, "admin-confirm-actions");
    const cancel = el("button", "Cancel", "button button-secondary");
    const accept = el("button", actionLabel || "Delete product", "button button-danger");
    cancel.type = "button";
    accept.type = "button";
    actions.append(cancel, accept);
    dialog.append(heading, detail, actions);
    document.body.appendChild(dialog);
    dialog.addEventListener("close", function () {
      const confirmed = dialog.returnValue === "confirm";
      dialog.remove();
      resolve(confirmed);
    }, { once: true });
    cancel.addEventListener("click", function () { dialog.close("cancel"); });
    accept.addEventListener("click", function () { dialog.close("confirm"); });
    dialog.showModal();
    cancel.focus();
  });
}

function setLoginMessage(text, isError) {
  const msg = $("loginMsg");
  msg.textContent = text || "";
  msg.style.color = isError ? "var(--red)" : "var(--green)";
}

function setGlobalMessage(text, isError) {
  const msg = $("globalMsg");
  msg.textContent = text || "";
  msg.style.color = isError ? "var(--red)" : "var(--green)";
}

function showLogin(message) {
  adminPw = "";
  sessionStorage.removeItem(PW_KEY);
  $("appView").hidden = true;
  $("loginView").hidden = false;
  setLoginMessage(message || "", Boolean(message));
}

async function adminFetch(path, options) {
  const request = Object.assign({}, options || {});
  request.headers = Object.assign({}, request.headers || {}, { "x-admin-password": adminPw });
  if (request.body && !(request.body instanceof FormData)) {
    request.headers["Content-Type"] = "application/json";
  }
  const res = await fetch(API_URL + path, request);
  if (res.status === 401) {
    showLogin("Your session expired. Please log in again.");
    throw new Error("Admin authentication expired");
  }
  return res;
}

async function apiErrorMessage(res, action) {
  const body = await res.text();
  let detail = "";
  let parsed = false;
  let data;
  try {
    data = JSON.parse(body);
    parsed = true;
  } catch (err) {
    data = null;
  }
  if (parsed && data && typeof data === "object") {
    if (typeof data.error === "string") detail = data.error;
    else if (data.error && typeof data.error.message === "string") detail = data.error.message;
    else if (typeof data.message === "string") detail = data.message;
  } else if (!parsed && body && !/<(?:!doctype|html|head|body|pre)\b/i.test(body)) {
    detail = body.trim().slice(0, 240);
  }
  const status = " (HTTP " + res.status + ").";
  return detail
    ? "Could not " + action + ": " + detail + status
    : "Could not " + action + status + " Check the store API and its server logs.";
}

async function login(event) {
  if (event) event.preventDefault();
  const typed = $("pw").value;
  if (!typed) {
    setLoginMessage("Enter the admin password.", true);
    return;
  }
  $("loginBtn").disabled = true;
  setLoginMessage("Connecting to store API...");
  try {
    const res = await fetch(API_URL + "/api/admin/check", { headers: { "x-admin-password": typed } });
    if (!res.ok) {
      setLoginMessage(res.status === 401 ? "Incorrect password." : "Could not authenticate with the store API.", true);
      return;
    }
    adminPw = typed;
    sessionStorage.setItem(PW_KEY, typed);
    $("pw").value = "";
    $("loginView").hidden = true;
    $("appView").hidden = false;
    setGlobalMessage("");
    switchView("dashboard");
    await Promise.all([loadProducts(), loadOrders(), loadOrderSummary()]);
    await loadCategories();
  } catch (err) {
    setLoginMessage("Cannot reach the store API. Check your connection and try again.", true);
  } finally {
    $("loginBtn").disabled = false;
  }
}

function categoryLabel(category) {
  const savedCategory = categoryList.find(function (item) {
    return item.value === category;
  });
  const labels = {
    platform: "Platform scales",
    counter: "Counter scales",
    label: "Label printing",
    portable: "Portable & precision",
    sealing: "Sealing machines",
  };
  if (savedCategory && savedCategory.name !== savedCategory.value) return savedCategory.name;
  return labels[category] || (savedCategory && savedCategory.name) || category || "Uncategorised";
}

function renderCategorySelect(selectedValue) {
  const select = $("productCategory");
  const selected = selectedValue === undefined ? select.value : selectedValue;
  select.replaceChildren(el("option", "Select category"));
  select.options[0].value = "";
  categoryList.forEach(function (category) {
    const option = el("option", categoryLabel(category.value));
    option.value = category.value;
    select.appendChild(option);
  });
  if (selected && !categoryList.some(function (category) { return category.value === selected; })) {
    const legacy = el("option", categoryLabel(selected));
    legacy.value = selected;
    select.appendChild(legacy);
  }
  select.value = selected || "";
}

function renderCategoryList() {
  const list = $("categoryList");
  list.replaceChildren();
  if (!categoryList.length) {
    list.appendChild(el("p", "No categories yet. Add one to start organizing products.", "category-list-empty"));
    return;
  }
  categoryList.forEach(function (category) {
    list.appendChild(el("span", categoryLabel(category.value), "category-pill"));
  });
}

async function loadCategories() {
  try {
    const response = await adminFetch("/api/admin/categories");
    if (!response.ok) throw new Error(await apiErrorMessage(response, "load categories"));
    const categories = await response.json();
    if (!Array.isArray(categories) || categories.some(function (category) {
      return !category || typeof category.value !== "string" || typeof category.name !== "string";
    })) {
      throw new Error("The category API returned an invalid response.");
    }
    categoryList = categories;
  } catch (error) {
    categoryList = Array.from(new Map(productList
      .map(function (product) { return String(product.category || "").trim(); })
      .filter(Boolean)
      .map(function (value) { return [value, { value: value, name: categoryLabel(value) }]; })
    ).values());
    setGlobalMessage("Category management is unavailable: " + (error.message || "Could not load categories."), true);
  }
  renderCategorySelect();
  renderCategoryList();
  renderProducts();
}

async function addCategory(event) {
  event.preventDefault();
  const input = $("categoryName");
  if (!input.reportValidity()) return;
  const button = $("addCategory");
  button.disabled = true;
  $("categoryMessage").textContent = "Adding category...";
  $("categoryMessage").className = "status-text";
  try {
    const response = await adminFetch("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({ name: input.value.trim() }),
    });
    if (!response.ok) throw new Error(await apiErrorMessage(response, "add category"));
    const category = await response.json();
    categoryList.push(category);
    categoryList.sort(function (a, b) { return a.name.localeCompare(b.name); });
    renderCategorySelect();
    renderCategoryList();
    renderProducts();
    $("categoryForm").reset();
    $("categoryMessage").textContent = "Category added. It is now available when editing products.";
    $("categoryMessage").className = "status-text";
    setGlobalMessage("");
  } catch (error) {
    $("categoryMessage").textContent = error.message || "Could not add category.";
    $("categoryMessage").className = "status-text error";
  } finally {
    button.disabled = false;
  }
}

function displayPrice(value) {
  if (value === null || value === undefined || value === "") return "On request";
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount)
    ? "\u20B9" + amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : String(value);
}

function displayOrderAmount(value) {
  return value === null || value === undefined || value === ""
    ? "—"
    : displayPrice(value);
}

function imageUrls(product) {
  const imgs = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  if (imgs.length) return imgs;
  return product.image ? [product.image] : [];
}

function renderProducts() {
  const query = $("searchInput").value.trim().toLowerCase();
  const filtered = productList.filter(function (p) {
    return [p.name, p.brand, p.category, p.id].some(function (v) {
      return String(v || "").toLowerCase().includes(query);
    });
  });
  const body = $("products");
  body.replaceChildren();
  filtered.forEach(function (p) {
    const row = el("tr");
    const productTd = el("td");
    const productCell = el("div", null, "product-cell");
    const urls = imageUrls(p);
    const thumb = el("img", null, "product-thumb");
    thumb.alt = "";
    thumb.loading = "lazy";
    thumb.src = urls[0] || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='42' height='42' viewBox='0 0 42 42'%3E%3Crect width='42' height='42' fill='%23f1f4f8'/%3E%3C/svg%3E";
    const productText = el("div");
    productText.appendChild(el("strong", p.name || "Untitled product"));
    productText.appendChild(el("small", p.id || "No product ID"));
    productCell.append(thumb, productText);
    productTd.appendChild(productCell);
    const categoryTd = el("td");
    categoryTd.appendChild(el("span", categoryLabel(p.category), "category-pill"));
    const priceTd = el("td", displayPrice(p.price));
    const imagesTd = el("td", String(urls.length));
    const actionsTd = el("td");
    const actions = el("div", null, "table-actions");
    const edit = el("button", "Edit", "table-action");
    edit.type = "button";
    edit.addEventListener("click", function () { openEditor(p); });
    const remove = el("button", p.isActive ? (p.isOrdered ? "Archive" : "Delete") : "Show", "table-action" + (p.isActive && !p.isOrdered ? " delete" : ""));
    remove.type = "button";
    remove.addEventListener("click", function () {
      if (p.isOrdered) {
        setProductVisibility(p, false, remove);
      } else if (!p.isActive) {
        setProductVisibility(p, true, remove);
      } else {
        deleteProduct(p, remove);
      }
    });
    actions.append(edit, remove);
    actionsTd.appendChild(actions);
    row.append(productTd, categoryTd, priceTd, imagesTd, actionsTd);
    body.appendChild(row);
  });
  $("emptyProducts").hidden = filtered.length > 0;
  $("totalProducts").textContent = String(productList.length);
  $("dashboardTotalProducts").textContent = String(productList.filter(function (p) { return p.isActive !== false; }).length);
  $("pricedProducts").textContent = String(productList.filter(function (p) {
    return p.price !== null && p.price !== undefined && p.price !== "" && Number.isFinite(Number(p.price));
  }).length);
  $("lastRefreshed").textContent = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

async function loadProducts() {
  $("products").replaceChildren();
  $("emptyProducts").hidden = true;
  const loadingRow = el("tr");
  const loadingCell = el("td", "Loading products...");
  loadingCell.colSpan = 5;
  loadingCell.className = "muted";
  loadingCell.style.textAlign = "center";
  loadingCell.style.padding = "30px";
  loadingRow.appendChild(loadingCell);
  $("products").appendChild(loadingRow);
  try {
    const res = await adminFetch("/api/admin/products");
    if (!res.ok) throw new Error(await apiErrorMessage(res, "load products"));
    const list = await res.json();
    if (!Array.isArray(list)) throw new Error("The product API returned an invalid response.");
    productList = list;
    renderProducts();
    setGlobalMessage("");
    return true;
  } catch (err) {
    $("products").replaceChildren();
    $("emptyProducts").hidden = false;
    $("emptyProducts").querySelector("h3").textContent = "Could not load products";
    $("emptyProducts").querySelector("p").textContent = err.message || "Check the store API and try again.";
    setGlobalMessage(err.message || "Could not load products.", true);
    return false;
  }
}

async function loadOrders(offset) {
  if (Number.isInteger(offset) && offset >= 0) ordersOffset = offset;
  const state = $("ordersState");
  state.hidden = false;
  state.className = "panel-state";
  state.textContent = "Loading orders...";
  $("ordersTableWrap").hidden = true;
  $("recentOrders").hidden = true;
  $("recentOrdersState").hidden = false;
  $("recentOrdersState").className = "panel-state";
  $("recentOrdersState").textContent = "Loading recent orders...";
  try {
    const res = await adminFetch("/api/admin/orders?offset=" + ordersOffset);
    if (!res.ok) throw new Error("Orders request failed (" + res.status + ")");
    const list = await res.json();
    if (!Array.isArray(list)) throw new Error("The orders API returned an invalid response.");
    orderList = list;
    renderOrders();
    if (!list.length) {
      state.hidden = false;
      state.textContent = ordersOffset ? "No orders on this page." : "No orders yet.";
      $("recentOrdersState").hidden = false;
      $("recentOrdersState").textContent = "No orders yet.";
      return;
    }
  } catch (err) {
    if (!$("appView").hidden) {
      state.className = "panel-state error";
      state.textContent = "Could not load orders: " + (err.message || "API error") + " ";
      const retry = el("button", "Retry", "text-button");
      retry.type = "button";
      retry.addEventListener("click", loadOrders);
      state.appendChild(retry);
      $("recentOrdersState").className = "panel-state error";
      $("recentOrdersState").textContent = "Could not load recent orders. ";
      const recentRetry = el("button", "Retry", "text-button");
      recentRetry.type = "button";
      recentRetry.addEventListener("click", loadOrders);
      $("recentOrdersState").appendChild(recentRetry);
    }
  }
}

async function loadOrderSummary() {
  const state = $("summaryState");
  state.hidden = false;
  state.className = "panel-state";
  state.textContent = "Loading order totals...";
  $("totalOrders").textContent = "—";
  $("pendingOrders").textContent = "—";
  try {
    const res = await adminFetch("/api/admin/orders/summary");
    if (!res.ok) throw new Error(await apiErrorMessage(res, "load order totals"));
    const summary = await res.json();
    if (!Number.isFinite(Number(summary.totalOrders)) || !Number.isFinite(Number(summary.pendingOrders))) {
      throw new Error("The order summary API returned invalid totals.");
    }
    $("totalOrders").textContent = Number(summary.totalOrders).toLocaleString("en-IN");
    $("pendingOrders").textContent = Number(summary.pendingOrders).toLocaleString("en-IN");
    const newOrderCount = $("newOrderCount");
    newOrderCount.textContent = Number(summary.pendingOrders).toLocaleString("en-IN");
    newOrderCount.hidden = Number(summary.pendingOrders) < 1;
    totalOrdersCount = Number(summary.totalOrders);
    updateOrdersPagination();
    state.hidden = true;
  } catch (err) {
    if (!$("appView").hidden) {
      state.className = "panel-state error";
      state.textContent = (err.message || "Could not load order totals.") + " ";
      const retry = el("button", "Retry", "text-button");
      retry.type = "button";
      retry.addEventListener("click", loadOrderSummary);
      state.appendChild(retry);
    }
  }
}

function renderSalesChart(sales) {
  const chart = $("salesChart");
  chart.replaceChildren();
  const maxRevenue = Math.max.apply(null, sales.map(function (item) { return item.revenue; }).concat([0]));
  sales.forEach(function (item) {
    const group = el("div", null, "sales-bar-group");
    const amount = el("span", displayPrice(item.revenue), "sales-bar-value");
    const track = el("div", null, "sales-bar-track");
    const bar = el("span", null, "sales-bar-fill");
    const height = maxRevenue > 0 ? Math.max(item.revenue > 0 ? 5 : 0, (item.revenue / maxRevenue) * 100) : 0;
    bar.style.height = height + "%";
    track.title = item.label + ": " + displayPrice(item.revenue) + " · " + item.orders + " orders";
    track.appendChild(bar);
    group.append(amount, track, el("span", item.label, "sales-bar-label"));
    chart.appendChild(group);
  });
}

function renderCategoryChart(categories) {
  const donut = $("categoryDonut");
  const legend = $("categoryLegend");
  const colors = ["#176345", "#5a9a70", "#9bbc8c", "#d0a45f", "#85a7a0"];
  donut.style.background = "conic-gradient(#e9eee9 0deg 360deg)";
  legend.replaceChildren();
  const total = categories.reduce(function (sum, category) { return sum + category.quantity; }, 0);
  if (!total) {
    legend.appendChild(el("p", "No category sales yet.", "muted"));
    return;
  }
  let current = 0;
  const slices = categories.map(function (category, index) {
    const end = current + category.quantity / total * 360;
    const slice = colors[index % colors.length] + " " + current + "deg " + end + "deg";
    current = end;
    const row = el("div", null, "category-legend-item");
    const swatch = el("span", null, "category-swatch");
    swatch.style.backgroundColor = colors[index % colors.length];
    row.append(swatch, el("span", category.name), el("b", category.quantity.toLocaleString("en-IN")));
    legend.appendChild(row);
    return slice;
  });
  donut.style.background = "conic-gradient(" + slices.join(", ") + ")";
  donut.setAttribute("aria-label", categories.map(function (item) {
    return item.name + ": " + item.quantity;
  }).join(", "));
}

function renderTopProducts(products) {
  const body = $("topProductsBody");
  body.replaceChildren();
  if (!products.length) {
    const row = el("tr");
    const cell = el("td", "No product sales yet.");
    cell.colSpan = 2;
    row.appendChild(cell);
    body.appendChild(row);
    return;
  }
  products.forEach(function (product) {
    const row = el("tr");
    row.append(el("td", product.name || "Unnamed product"), el("td", product.quantity.toLocaleString("en-IN")));
    body.appendChild(row);
  });
}

async function loadDashboardStats() {
  const requestId = ++dashboardStatsRequest;
  const state = $("statsState");
  state.hidden = false;
  state.className = "panel-state";
  state.textContent = "Loading dashboard statistics…";
  try {
    const period = $("statsPeriod").value;
    const response = await adminFetch("/api/admin/stats?period=" + encodeURIComponent(period));
    if (!response.ok) throw new Error(await apiErrorMessage(response, "load dashboard statistics"));
    const stats = await response.json();
    if (requestId !== dashboardStatsRequest) return;
    const kpis = stats && stats.kpis;
    if (!kpis || !["products", "orders", "pendingOrders", "customers", "revenue"].every(function (key) {
      return Number.isFinite(Number(kpis[key]));
    }) || !Array.isArray(stats.sales) || !Array.isArray(stats.topCategories) || !Array.isArray(stats.topProducts)) {
      throw new Error("The dashboard statistics API returned an invalid response.");
    }
    $("dashboardTotalProducts").textContent = Number(kpis.products).toLocaleString("en-IN");
    $("totalOrders").textContent = Number(kpis.orders).toLocaleString("en-IN");
    $("pendingOrders").textContent = Number(kpis.pendingOrders).toLocaleString("en-IN");
    $("dashboardCustomers").textContent = Number(kpis.customers).toLocaleString("en-IN");
    $("dashboardRevenue").textContent = displayPrice(Number(kpis.revenue));
    renderSalesChart(stats.sales.map(function (item) {
      return { label: String(item.label), orders: Number(item.orders) || 0, revenue: Number(item.revenue) || 0 };
    }));
    renderCategoryChart(stats.topCategories.map(function (item) {
      return { name: String(item.name), quantity: Number(item.quantity) || 0 };
    }));
    renderTopProducts(stats.topProducts.map(function (item) {
      return { name: String(item.name), quantity: Number(item.quantity) || 0 };
    }));
    if (stats.sales.length) {
      state.hidden = true;
    } else {
      state.textContent = "No sales have been recorded for this period yet.";
    }
  } catch (error) {
    if (requestId !== dashboardStatsRequest) return;
    state.className = "panel-state error";
    state.textContent = (error.message || "Could not load dashboard statistics.") + " ";
    const retry = el("button", "Retry", "text-button");
    retry.type = "button";
    retry.addEventListener("click", loadDashboardStats);
    state.appendChild(retry);
  }
}

function formatOrderDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-IN");
}

function orderStatusClass(status) {
  return "status-" + String(status || "pending").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function orderStatusPill(status) {
  const value = ORDER_STATUSES.includes(status) ? status : "Pending";
  return el("span", value, "status-pill " + orderStatusClass(value));
}

function orderProductsSummary(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  if (!items.length) return "No product details";
  return items.slice(0, 2).map(function (item) {
    return (item.name || "Product") + " × " + item.qty;
  }).join(", ") + (items.length > 2 ? " +" + (items.length - 2) + " more" : "");
}

function renderOrders() {
  const body = $("ordersTableBody");
  body.replaceChildren();
  const recent = $("recentOrders");
  recent.replaceChildren();
  if (!orderList.length) {
    $("ordersTableWrap").hidden = true;
    $("recentOrders").hidden = true;
    updateOrdersPagination();
    return;
  }

  const search = $("ordersSearch").value.trim().toLowerCase();
  const statusFilter = $("ordersStatusFilter").value;
  const visibleOrders = orderList.filter(function (order) {
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const searchable = [
      order.id, order.customerName, order.email, order.phone, orderProductsSummary(order),
    ].join(" ").toLowerCase();
    return matchesStatus && (!search || searchable.includes(search));
  });
  if (!visibleOrders.length) {
    $("ordersState").hidden = false;
    $("ordersState").textContent = "No orders match the selected search and filters.";
    $("ordersTableWrap").hidden = true;
  } else {
    $("ordersState").hidden = true;
    $("ordersTableWrap").hidden = false;
  }

  visibleOrders.forEach(function (order) {
    const items = Array.isArray(order.items) ? order.items : [];
    const row = el("tr");
    const idCell = el("td");
    idCell.appendChild(el("span", "#" + order.id, "order-number"));
    const dateCell = el("td", formatOrderDate(order.createdAt));
    const customerCell = el("td", null, "order-customer-cell");
    customerCell.appendChild(el("strong", order.customerName || "—"));
    if (order.phone) customerCell.appendChild(el("small", order.phone));
    const productsCell = el("td");
    productsCell.appendChild(el("div", orderProductsSummary(order), "order-products-summary"));
    const quantity = items.reduce(function (total, item) { return total + (Number(item.qty) || 0); }, 0);
    const quantityCell = el("td", String(quantity));
    const subtotalCell = el("td", displayOrderAmount(order.subtotal));
    const deliveryPending = order.deliveryMethod === "Home Delivery" && !order.deliveryChargeConfirmed;
    const deliveryCell = el("td", deliveryPending ? "To be confirmed" : displayOrderAmount(order.deliveryCharge));
    const totalCell = el("td", deliveryPending || order.totalAmount === null ? "To be confirmed" : displayOrderAmount(order.totalAmount));
    const paymentCell = el("td", null, "order-payment-cell");
    paymentCell.appendChild(el("strong", order.paymentMethod || "—"));
    if (order.paymentStatus) paymentCell.appendChild(el("small", order.paymentStatus));
    const statusCell = el("td");
    statusCell.appendChild(orderStatusPill(order.status));
    const actionsCell = el("td");
    const details = el("button", "View details", "table-action");
    details.type = "button";
    details.addEventListener("click", function () { openOrderDetails(order); });
    actionsCell.appendChild(details);
    row.append(
      idCell, dateCell, customerCell, productsCell, quantityCell, subtotalCell,
      deliveryCell, totalCell, paymentCell, statusCell, actionsCell
    );
    body.appendChild(row);
  });
  orderList.slice(0, 5).forEach(function (order) {
    const item = el("article", null, "recent-order");
    const main = el("div", null, "recent-order-main");
    main.append(el("strong", "Order #" + order.id), el("small", formatOrderDate(order.createdAt)));
    item.append(main, el("div", orderProductsSummary(order), "recent-order-products"), orderStatusPill(order.status));
    item.addEventListener("click", function () { openOrderDetails(order); });
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", "View order " + order.id);
    item.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openOrderDetails(order);
      }
    });
    recent.appendChild(item);
  });
  $("recentOrdersState").hidden = true;
  recent.hidden = false;
  updateOrdersPagination();
}

function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

async function exportOrdersCsv() {
  const button = $("exportOrders");
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Preparing…";
  try {
    const orders = [];
    for (let offset = 0; offset < totalOrdersCount; offset += 50) {
      const response = await adminFetch("/api/admin/orders?offset=" + offset);
      if (!response.ok) throw new Error(await apiErrorMessage(response, "export orders"));
      const page = await response.json();
      if (!Array.isArray(page)) throw new Error("The orders API returned an invalid response.");
      orders.push.apply(orders, page);
      if (page.length < 50) break;
    }
    const columns = ["Order ID", "Created", "Customer", "Email", "Phone", "Address", "Items", "Subtotal", "Delivery charge", "Total", "Payment method", "Payment status", "Order status"];
    const rows = [columns].concat(orders.map(function (order) {
      const items = (Array.isArray(order.items) ? order.items : []).map(function (item) {
        return (item.qty || 0) + " x " + (item.name || "Product");
      }).join("; ");
      return [
        order.id, order.createdAt, order.customerName, order.email, order.phone,
        order.address, items, order.subtotal, order.deliveryCharge, order.totalAmount,
        order.paymentMethod, order.paymentStatus, order.status,
      ];
    }));
    const csv = rows.map(function (row) { return row.map(csvCell).join(","); }).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = el("a");
    link.href = url;
    link.download = "alfa-orders-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    setGlobalMessage("Exported " + orders.length.toLocaleString("en-IN") + " orders to CSV.");
  } catch (error) {
    setGlobalMessage(error.message || "Could not export orders.", true);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function updateOrdersPagination() {
  const pagination = $("ordersPagination");
  pagination.hidden = totalOrdersCount <= 50 && ordersOffset === 0;
  const first = orderList.length && totalOrdersCount ? ordersOffset + 1 : 0;
  const last = orderList.length ? Math.min(ordersOffset + orderList.length, totalOrdersCount) : 0;
  $("ordersPageLabel").textContent = orderList.length
    ? "Showing " + first + "–" + last + " of " + totalOrdersCount.toLocaleString("en-IN") + " orders"
    : totalOrdersCount.toLocaleString("en-IN") + " total orders";
  $("previousOrdersPage").disabled = ordersOffset === 0;
  $("nextOrdersPage").disabled = ordersOffset + orderList.length >= totalOrdersCount || orderList.length < 50;
}

function openOrderDetails(order) {
  selectedOrder = order;
  $("orderModalTitle").textContent = "Order #" + order.id;
  $("orderDetailDate").textContent = formatOrderDate(order.createdAt);
  $("orderDetailCustomer").textContent = order.customerName || "—";
  $("orderDetailContact").textContent = [order.phone, order.email].filter(Boolean).join(" · ") || "—";
  $("orderDetailAddress").textContent = [
    order.address,
    [order.city, order.district, order.state, order.pincode].filter(Boolean).join(", "),
  ].filter(Boolean).join(", ") || "—";
  $("orderDetailDelivery").textContent = order.deliveryMethod || "—";
  $("orderDetailPayment").textContent = order.paymentMethod || "—";
  $("orderDetailPaymentStatus").textContent = order.paymentStatus || "Pending";
  $("orderDetailSubtotal").textContent = displayOrderAmount(order.subtotal);
  const deliveryPending = order.deliveryMethod === "Home Delivery" && !order.deliveryChargeConfirmed;
  $("orderDetailDeliveryCharge").textContent = deliveryPending ? "To be confirmed" : displayOrderAmount(order.deliveryCharge);
  $("orderDetailTotal").textContent = deliveryPending || order.totalAmount === null ? "To be confirmed" : displayOrderAmount(order.totalAmount);
  $("deliveryChargeInput").value = order.deliveryChargeConfirmed && order.deliveryCharge !== null
    ? String(order.deliveryCharge)
    : "";
  $("orderSubtotalInput").value = order.subtotal === null || order.subtotal === undefined
    ? ""
    : String(order.subtotal);
  $("orderSubtotalInput").disabled = order.deliveryMethod !== "Home Delivery";
  $("deliveryChargeInput").disabled = order.deliveryMethod !== "Home Delivery";
  $("saveDeliveryCharge").disabled = order.deliveryMethod !== "Home Delivery";
  $("deliveryChargeMessage").textContent = order.deliveryMethod === "Home Delivery"
    ? (deliveryPending ? "Delivery charge is not yet confirmed." : "Delivery charge confirmed.")
    : "Delivery charge is not applicable to store pickup.";
  $("deliveryChargeMessage").className = "status-text";
  const status = ORDER_STATUSES.includes(order.status) ? order.status : "Pending";
  $("orderDetailStatus").textContent = status;
  $("orderStatusSelect").value = status;
  $("orderStatusMessage").textContent = "";
  $("orderStatusMessage").className = "status-text";
  const list = $("orderDetailItems");
  list.replaceChildren();
  (Array.isArray(order.items) ? order.items : []).forEach(function (item) {
    const row = el("li");
    row.append(el("span", item.name || "Product"), el("strong", "× " + item.qty));
    list.appendChild(row);
  });
  if (!list.children.length) list.appendChild(el("li", "No product details available."));
  $("saveOrderStatus").disabled = false;
  $("orderModal").hidden = false;
  $("orderStatusSelect").focus();
}

function closeOrderDetails() {
  $("orderModal").hidden = true;
  selectedOrder = null;
}

async function saveOrderStatus(event) {
  event.preventDefault();
  if (!selectedOrder) return;
  const status = $("orderStatusSelect").value;
  if (!ORDER_STATUSES.includes(status)) {
    $("orderStatusMessage").textContent = "Select a valid order status.";
    $("orderStatusMessage").className = "status-text error";
    return;
  }
  const button = $("saveOrderStatus");
  const orderId = selectedOrder.id;
  button.disabled = true;
  $("orderStatusMessage").textContent = "Saving order status...";
  $("orderStatusMessage").className = "status-text";
  try {
    const res = await adminFetch("/api/admin/orders/" + encodeURIComponent(selectedOrder.id) + "/status", {
      method: "PATCH",
      body: JSON.stringify({ status: status }),
    });
    if (!res.ok) throw new Error(await apiErrorMessage(res, "update order status"));
    selectedOrder.status = status;
    renderOrders();
    closeOrderDetails();
    setGlobalMessage("Order #" + orderId + " status updated.");
    await Promise.all([loadOrderSummary(), loadOrders()]);
  } catch (err) {
    $("orderStatusMessage").textContent = err.message || "Could not update order status.";
    $("orderStatusMessage").className = "status-text error";
  } finally {
    button.disabled = false;
  }
}

async function saveDeliveryCharge(event) {
  event.preventDefault();
  if (!selectedOrder) return;
  const input = $("deliveryChargeInput");
  const subtotalInput = $("orderSubtotalInput");
  if (!subtotalInput.reportValidity() || !input.reportValidity()) return;
  const charge = Number(input.value);
  const subtotal = Number(subtotalInput.value);
  if (!Number.isFinite(charge) || charge < 0 || charge > 99999999.99 ||
      !Number.isFinite(subtotal) || subtotal < 0 || subtotal > 99999999.99) {
    $("deliveryChargeMessage").textContent = "Enter valid non-negative product and delivery amounts.";
    $("deliveryChargeMessage").className = "status-text error";
    return;
  }
  const button = $("saveDeliveryCharge");
  button.disabled = true;
  $("deliveryChargeMessage").textContent = "Saving delivery charge...";
  $("deliveryChargeMessage").className = "status-text";
  try {
    const response = await adminFetch(
      "/api/admin/orders/" + encodeURIComponent(selectedOrder.id) + "/delivery-charge",
      { method: "PATCH", body: JSON.stringify({ subtotal: subtotal, deliveryCharge: charge }) }
    );
    if (!response.ok) throw new Error(await apiErrorMessage(response, "save delivery charge"));
    const updated = await response.json();
    Object.assign(selectedOrder, updated);
    const listedOrder = orderList.find(function (order) { return String(order.id) === String(updated.id); });
    if (listedOrder) Object.assign(listedOrder, updated);
    $("orderDetailDeliveryCharge").textContent = displayOrderAmount(updated.deliveryCharge);
    $("orderDetailSubtotal").textContent = displayOrderAmount(updated.subtotal);
    $("orderDetailTotal").textContent = updated.totalAmount === null
      ? "To be confirmed"
      : displayOrderAmount(updated.totalAmount);
    $("deliveryChargeMessage").textContent = updated.totalAmount === null
      ? "Delivery charge saved. Product pricing is still to be confirmed."
      : "Delivery charge and order total confirmed.";
    $("deliveryChargeMessage").className = "status-text";
    renderOrders();
    setGlobalMessage("Delivery charge saved for order #" + updated.id + ".");
  } catch (error) {
    $("deliveryChargeMessage").textContent = error.message || "Could not save delivery charge.";
    $("deliveryChargeMessage").className = "status-text error";
  } finally {
    button.disabled = false;
  }
}

function addDynamicRow(type, key, value) {
  const row = el("div", null, "dynamic-row");
  if (type === "feature") {
    const input = el("input", null, "feature-input");
    input.type = "text";
    input.maxLength = 240;
    input.placeholder = "Describe a key product feature";
    input.value = value || "";
    input.setAttribute("aria-label", "Product feature");
    input.addEventListener("input", updatePreview);
    row.appendChild(input);
  } else {
    const keyInput = el("input", null, "spec-key");
    keyInput.type = "text";
    keyInput.maxLength = 80;
    keyInput.placeholder = "Specification";
    keyInput.value = key || "";
    keyInput.setAttribute("aria-label", "Specification name");
    const valueInput = el("input", null, "spec-value");
    valueInput.type = "text";
    valueInput.maxLength = 160;
    valueInput.placeholder = "Value";
    valueInput.value = value || "";
    valueInput.setAttribute("aria-label", "Specification value");
    row.append(keyInput, valueInput);
  }
  const remove = el("button", "×", "remove-row");
  remove.type = "button";
  remove.setAttribute("aria-label", "Remove row");
  remove.addEventListener("click", function () { row.remove(); });
  row.appendChild(remove);
  $(type === "feature" ? "featuresList" : "specsList").appendChild(row);
}

function renderImages() {
  const list = $("imageList");
  list.replaceChildren();
  if (!editorImages.length) {
    list.appendChild(el("div", "No images added yet.", "image-empty"));
    updatePreview();
    return;
  }
  editorImages.forEach(function (url, index) {
    const item = el("div", null, "image-item");
    const img = el("img");
    img.src = url;
    img.alt = "Product image " + (index + 1);
    const select = el("button", index === mainImageIndex ? "Main image" : "Set as main", "image-main");
    select.type = "button";
    select.addEventListener("click", function () {
      mainImageIndex = index;
      renderImages();
    });
    const remove = el("button", "×", "image-remove");
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove image " + (index + 1));
    remove.addEventListener("click", function () {
      editorImages.splice(index, 1);
      if (mainImageIndex >= editorImages.length) mainImageIndex = Math.max(0, editorImages.length - 1);
      else if (index < mainImageIndex) mainImageIndex--;
      renderImages();
    });
    item.append(img, select, remove);
    list.appendChild(item);
  });
  updatePreview();
}

function clearEditor() {
  $("productForm").reset();
  $("productId").value = "";
  $("featuresList").replaceChildren();
  $("specsList").replaceChildren();
  editorImages = [];
  mainImageIndex = 0;
  $("editorStatus").textContent = "";
  $("editorStatus").className = "status-text";
  $("imageUpload").value = "";
  renderImages();
  updatePreview();
}

function openEditor(product) {
  clearEditor();
  editingProduct = Boolean(product);
  $("editorTitle").textContent = editingProduct ? "Edit product" : "Add product";
  $("saveProduct").textContent = editingProduct ? "Save changes" : "Save product";
  if (product) {
    $("productId").value = product.id || "";
    $("productName").value = product.name || "";
    $("productBrand").value = product.brand || "";
    renderCategorySelect(product.category || "");
    $("productDescription").value = product.description || "";
    $("productPrice").value = product.price === null || product.price === undefined ? "" : product.price;
    $("productOldPrice").value = product.oldPrice === null || product.oldPrice === undefined ? "" : product.oldPrice;
    $("productPriceNote").value = product.priceNote || "";
    $("productCapacity").value = product.capacity || "";
    $("productAccuracy").value = product.accuracy || "";
    $("productUsedFor").value = product.usedFor || "";
    (product.features || []).forEach(function (feature) { addDynamicRow("feature", "", feature); });
    Object.keys(product.specs || {}).forEach(function (key) { addDynamicRow("spec", key, product.specs[key]); });
    editorImages = imageUrls(product);
    mainImageIndex = Math.max(0, editorImages.indexOf(product.image));
    renderImages();
  }
  $("cloudName").value = localStorage.getItem(CLOUD_NAME_KEY) || CLOUD_NAME_DEFAULT;
  $("uploadPreset").value = localStorage.getItem(UPLOAD_PRESET_KEY) || UPLOAD_PRESET_DEFAULT;
  updatePreview();
  $("editorModal").hidden = false;
  $("productName").focus();
}

function closeEditor() {
  $("editorModal").hidden = true;
}

function updatePreview() {
  $("previewName").textContent = $("productName").value.trim() || "Product name";
  $("previewDescription").textContent = $("productDescription").value.trim() || "Your product description will appear here.";
  $("previewCategory").textContent = categoryLabel($("productCategory").value).toUpperCase();
  const price = $("productPrice").value;
  $("previewPrice").textContent = price ? displayPrice(Number(price)) : "Price on request";
  const oldPrice = $("productOldPrice").value;
  $("previewOldPrice").hidden = !oldPrice;
  $("previewOldPrice").textContent = oldPrice ? displayPrice(Number(oldPrice)) : "";
  const image = $("previewImage");
  const placeholder = $("previewImageWrap").querySelector(".preview-placeholder");
  const src = editorImages[mainImageIndex];
  image.hidden = !src;
  placeholder.hidden = Boolean(src);
  image.src = src || "";
  image.alt = $("productName").value.trim() || "Product preview";
}

function collectProduct() {
  const name = $("productName").value.trim();
  const id = $("productId").value.trim() || name.toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/g, "");
  const features = Array.from($("featuresList").querySelectorAll(".feature-input"))
    .map(function (input) { return input.value.trim(); }).filter(Boolean);
  const specs = {};
  $("specsList").querySelectorAll(".dynamic-row").forEach(function (row) {
    const key = row.querySelector(".spec-key").value.trim();
    const value = row.querySelector(".spec-value").value.trim();
    if (key && value) specs[key] = value;
  });
  const orderedImages = editorImages.length
    ? editorImages.slice(mainImageIndex).concat(editorImages.slice(0, mainImageIndex))
    : [];
  const product = {
    id: id,
    name: name,
    brand: $("productBrand").value.trim(),
    category: $("productCategory").value,
    description: $("productDescription").value.trim(),
    price: $("productPrice").value === "" ? null : Number($("productPrice").value),
    oldPrice: $("productOldPrice").value === "" ? null : Number($("productOldPrice").value),
    priceNote: $("productPriceNote").value.trim(),
    capacity: $("productCapacity").value.trim(),
    accuracy: $("productAccuracy").value.trim(),
    usedFor: $("productUsedFor").value.trim(),
    features: features,
    specs: specs,
    images: orderedImages,
    image: orderedImages[0] || "",
  };
  if (product.price === null) delete product.price;
  if (product.oldPrice === null) delete product.oldPrice;
  return product;
}

async function saveProduct(event) {
  event.preventDefault();
  if (!$("productForm").reportValidity()) return;
  const product = collectProduct();
  if (!product.name) {
    $("productName").focus();
    return;
  }
  if (!product.id) {
    $("editorStatus").textContent = "Enter a name with at least one letter or number.";
    $("editorStatus").className = "status-text error";
    return;
  }
  const button = $("saveProduct");
  button.disabled = true;
  $("editorStatus").textContent = "Saving product...";
  $("editorStatus").className = "status-text";
  try {
    const path = editingProduct
      ? "/api/admin/products/" + encodeURIComponent(product.id)
      : "/api/admin/products";
    const res = await adminFetch(path, {
      method: editingProduct ? "PUT" : "POST",
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error(await apiErrorMessage(res, "save this product"));
    closeEditor();
    if (await loadProducts()) setGlobalMessage(editingProduct ? "Product updated." : "Product added.");
  } catch (err) {
    $("editorStatus").textContent = err.message || "Could not save product.";
    $("editorStatus").className = "status-text error";
  } finally {
    button.disabled = false;
  }
}

async function deleteProduct(product, button) {
  if (!await confirmAdminAction('Delete "' + (product.name || "this product") + '"? This cannot be undone.')) return;
  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = "Deleting…";
  try {
    const res = await adminFetch("/api/admin/products/" + encodeURIComponent(product.id), { method: "DELETE" });
    if (!res.ok) throw new Error(await apiErrorMessage(res, "delete this product"));
    const result = await res.json();
    if (await loadProducts()) setGlobalMessage(result.archived ? "Product archived because it appears in an order." : "Product deleted.");
  } catch (err) {
    setGlobalMessage(err.message || "Could not delete product.", true);
  } finally {
    if (button.isConnected) {
      button.disabled = false;
      button.textContent = previousText;
    }
  }
}

async function setProductVisibility(product, isActive, button) {
  const action = isActive ? "show" : "archive";
  if (!await confirmAdminAction((isActive ? "Show " : "Archive ") + '"' + (product.name || "this product") + '"?', isActive ? "Show product" : "Archive product")) return;
  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = isActive ? "Showing…" : "Archiving…";
  try {
    const res = await adminFetch("/api/admin/products/" + encodeURIComponent(product.id) + "/visibility", {
      method: "PATCH",
      body: JSON.stringify({ isActive: isActive }),
    });
    if (!res.ok) throw new Error(await apiErrorMessage(res, action + " this product"));
    if (await loadProducts()) setGlobalMessage(isActive ? "Product is visible in the store." : "Product archived.");
  } catch (err) {
    setGlobalMessage(err.message || "Could not update product visibility.", true);
  } finally {
    if (button.isConnected) {
      button.disabled = false;
      button.textContent = previousText;
    }
  }
}

async function uploadImages(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const cloudName = $("cloudName").value.trim();
  const preset = $("uploadPreset").value.trim();
  if (!cloudName || !preset) {
    $("editorStatus").textContent = "Enter your Cloudinary cloud name and unsigned preset before uploading.";
    $("editorStatus").className = "status-text error";
    event.target.value = "";
    return;
  }
  localStorage.setItem(CLOUD_NAME_KEY, cloudName);
  localStorage.setItem(UPLOAD_PRESET_KEY, preset);
  const uploadButton = $("imageUpload");
  uploadButton.disabled = true;
  $("editorStatus").textContent = "Uploading " + files.length + " image" + (files.length === 1 ? "" : "s") + "...";
  $("editorStatus").className = "status-text";
  try {
    for (const file of files) {
      if (!file.type.startsWith("image/")) throw new Error(file.name + " is not an image.");
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", preset);
      const res = await fetch("https://api.cloudinary.com/v1_1/" + encodeURIComponent(cloudName) + "/image/upload", {
        method: "POST",
        body: data,
      });
      const result = await res.json();
      if (!res.ok || !result.secure_url) throw new Error(result.error && result.error.message ? result.error.message : "Cloudinary upload failed (" + res.status + ").");
      editorImages.push(result.secure_url);
      if (editorImages.length === 1) mainImageIndex = 0;
      renderImages();
    }
    $("editorStatus").textContent = files.length + " image" + (files.length === 1 ? "" : "s") + " uploaded.";
  } catch (err) {
    $("editorStatus").textContent = err.message || "Image upload failed.";
    $("editorStatus").className = "status-text error";
  } finally {
    uploadButton.disabled = false;
    event.target.value = "";
  }
}

function addImageUrl() {
  const input = $("imageUrl");
  const url = input.value.trim();
  if (!url) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Use an HTTP or HTTPS image URL.");
    editorImages.push(parsed.href);
    if (editorImages.length === 1) mainImageIndex = 0;
    input.value = "";
    renderImages();
  } catch (err) {
    $("editorStatus").textContent = err.message || "Enter a valid image URL.";
    $("editorStatus").className = "status-text error";
  }
}

function renderCustomers() {
  const body = $("customersBody");
  const state = $("customersState");
  body.replaceChildren();
  if (!customerList.length) {
    state.hidden = false;
    state.className = "panel-state";
    state.textContent = $("customerSearch").value.trim()
      ? "No customers match your search."
      : "No customer accounts have been created yet.";
    return;
  }
  state.hidden = true;
  customerList.forEach(function (customer) {
    const row = el("tr");
    const identity = el("td", null, "customer-identity");
    identity.append(el("strong", customer.name || "Unnamed customer"), el("small", customer.email || "—"));
    const joinedDate = new Date(customer.joinedAt);
    const joined = Number.isNaN(joinedDate.getTime()) ? "—" : joinedDate.toLocaleDateString("en-IN");
    const status = el("span", customer.isEnabled ? "Enabled" : "Disabled", "status-pill " + (customer.isEnabled ? "status-ready" : "status-cancelled"));
    const actions = el("td", null, "table-actions customer-actions");
    const toggle = el("button", customer.isEnabled ? "Disable" : "Enable", "table-action");
    toggle.type = "button";
    toggle.addEventListener("click", function () { updateCustomerStatus(customer, !customer.isEnabled); });
    const reset = el("button", "Set temp password", "table-action");
    reset.type = "button";
    reset.addEventListener("click", function () { resetCustomerPassword(customer); });
    actions.append(toggle, reset);
    row.append(identity, el("td", joined), el("td", Number(customer.ordersCount || 0).toLocaleString("en-IN")), el("td", null));
    row.lastChild.appendChild(status);
    row.appendChild(actions);
    body.appendChild(row);
  });
}

async function loadCustomers() {
  const requestId = ++customerSearchRequest;
  const state = $("customersState");
  state.hidden = false;
  state.className = "panel-state";
  state.textContent = "Loading customer accounts…";
  const query = $("customerSearch").value.trim();
  try {
    const response = await adminFetch("/api/admin/customers?q=" + encodeURIComponent(query));
    if (!response.ok) throw new Error(await apiErrorMessage(response, "load customer accounts"));
    const customers = await response.json();
    if (requestId !== customerSearchRequest) return;
    if (!Array.isArray(customers) || customers.some(function (customer) {
      return !customer || !Number.isSafeInteger(Number(customer.id)) || typeof customer.email !== "string";
    })) {
      throw new Error("The customer API returned an invalid response.");
    }
    customerList = customers;
    renderCustomers();
  } catch (error) {
    if (requestId !== customerSearchRequest) return;
    state.className = "panel-state error";
    state.textContent = (error.message || "Could not load customer accounts.") + " ";
    const retry = el("button", "Retry", "text-button");
    retry.type = "button";
    retry.addEventListener("click", loadCustomers);
    state.appendChild(retry);
  }
}

async function updateCustomerStatus(customer, isEnabled) {
  const verb = isEnabled ? "Enable" : "Disable";
  if (!await confirmAdminAction(verb + " customer account for " + customer.email + "?", verb + " account")) return;
  try {
    const response = await adminFetch("/api/admin/customers/" + encodeURIComponent(customer.id) + "/status", {
      method: "PATCH",
      body: JSON.stringify({ isEnabled: isEnabled }),
    });
    if (!response.ok) throw new Error(await apiErrorMessage(response, verb.toLowerCase() + " customer"));
    customer.isEnabled = isEnabled;
    renderCustomers();
    setGlobalMessage("Customer account " + (isEnabled ? "enabled." : "disabled."));
  } catch (error) {
    setGlobalMessage(error.message || "Could not update customer status.", true);
  }
}

async function resetCustomerPassword(customer) {
  if (!await confirmAdminAction("Set a temporary password for " + customer.email + "? Share the generated password securely.", "Set password")) return;
  if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
    setGlobalMessage("Secure password generation is unavailable in this browser.", true);
    return;
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const random = new Uint8Array(20);
  window.crypto.getRandomValues(random);
  const password = Array.from(random, function (value) { return alphabet[value % alphabet.length]; }).join("");
  try {
    const response = await adminFetch("/api/admin/customers/" + encodeURIComponent(customer.id) + "/password", {
      method: "PATCH",
      body: JSON.stringify({ password: password }),
    });
    if (!response.ok) throw new Error(await apiErrorMessage(response, "set temporary password"));
    setGlobalMessage("Temporary password for " + customer.email + ": " + password + " (copy and share securely)");
  } catch (error) {
    setGlobalMessage(error.message || "Could not set a temporary password.", true);
  }
}

const SERVICE_REQUEST_STATUSES = ["New", "Contacted", "Scheduled", "Completed", "Cancelled"];

async function loadServiceRequests() {
  const state = $("serviceRequestsState");
  const list = $("serviceRequestsList");
  state.hidden = false;
  state.className = "panel-state";
  state.textContent = "Loading service requests...";
  list.replaceChildren();
  try {
    const response = await adminFetch("/api/admin/service-requests");
    if (!response.ok) throw new Error(await apiErrorMessage(response, "load service requests"));
    const requests = await response.json();
    if (!Array.isArray(requests)) throw new Error("The service request API returned an invalid response.");
    serviceRequestList = requests;
    renderServiceRequests();
  } catch (error) {
    state.className = "panel-state error";
    state.textContent = (error.message || "Could not load service requests.") + " ";
    const retry = el("button", "Retry", "text-button");
    retry.type = "button";
    retry.addEventListener("click", loadServiceRequests);
    state.appendChild(retry);
  }
}

function renderServiceRequests() {
  const state = $("serviceRequestsState");
  const list = $("serviceRequestsList");
  list.replaceChildren();
  if (!serviceRequestList.length) {
    state.className = "panel-state";
    state.textContent = "No service requests have been received yet.";
    state.hidden = false;
    return;
  }
  state.hidden = true;
  serviceRequestList.forEach(function (request) {
    const card = el("article", null, "service-request-card");
    const top = el("div", null, "service-request-head");
    const identity = el("div");
    identity.append(el("strong", request.serviceType || "Service request"), el("small", "Request #" + request.id + " · " + formatOrderDate(request.createdAt)));
    const status = el("span", request.status || "New", "status-pill " + orderStatusClass(request.status || "New"));
    top.append(identity, status);
    card.appendChild(top);
    const contact = el("div", null, "service-request-contact");
    contact.append(el("strong", request.customerName || "—"), el("span", request.phone || "—"));
    if (request.email) contact.appendChild(el("span", request.email));
    card.appendChild(contact);
    card.appendChild(el("p", request.message || "", "service-request-message"));
    const controls = el("div", null, "service-request-controls");
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Status for service request " + request.id);
    SERVICE_REQUEST_STATUSES.forEach(function (value) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    select.value = SERVICE_REQUEST_STATUSES.includes(request.status) ? request.status : "New";
    const save = el("button", "Update status", "button button-secondary");
    save.type = "button";
    save.addEventListener("click", async function () {
      const previousText = save.textContent;
      save.disabled = true;
      save.textContent = "Saving…";
      try {
        const response = await adminFetch("/api/admin/service-requests/" + encodeURIComponent(request.id) + "/status", {
          method: "PATCH",
          body: JSON.stringify({ status: select.value }),
        });
        if (!response.ok) throw new Error(await apiErrorMessage(response, "update service request"));
        request.status = select.value;
        setGlobalMessage("Service request #" + request.id + " updated.");
        renderServiceRequests();
      } catch (error) {
        setGlobalMessage(error.message || "Could not update service request.", true);
        save.disabled = false;
        save.textContent = previousText;
      }
    });
    controls.append(select, save);
    card.appendChild(controls);
    list.appendChild(card);
  });
}

function switchView(view) {
  const dashboard = view === "dashboard";
  const catalogue = view === "catalogue";
  const orders = view === "orders";
  const serviceRequests = view === "service-requests";
  const customers = view === "customers";
  const settings = view === "settings";
  $("dashboardView").hidden = !dashboard;
  $("catalogueView").hidden = !catalogue;
  $("ordersView").hidden = !orders;
  $("customersView").hidden = !customers;
  $("serviceRequestsView").hidden = !serviceRequests;
  $("settingsView").hidden = !settings;
  $("pageTitle").textContent = dashboard ? "Overview" : orders ? "Orders" : customers ? "Customers" : serviceRequests ? "Service requests" : settings ? "Settings" : "Products";
  $("addProductTop").hidden = !catalogue;
  document.querySelectorAll(".nav-link").forEach(function (link) {
    link.classList.toggle("active", link.dataset.view === view);
  });
  if (dashboard) loadDashboardStats();
  if (dashboard && ordersOffset !== 0) loadOrders(0);
  if (customers) loadCustomers();
  if (serviceRequests) loadServiceRequests();
  if (settings) {
    $("settingsCloudName").value = localStorage.getItem(CLOUD_NAME_KEY) || CLOUD_NAME_DEFAULT;
    $("settingsUploadPreset").value = localStorage.getItem(UPLOAD_PRESET_KEY) || UPLOAD_PRESET_DEFAULT;
  }
  closeSidebar();
}

function closeSidebar() {
  $("appView").classList.remove("sidebar-open");
  $("sidebarToggle").setAttribute("aria-expanded", "false");
  $("sidebarToggle").setAttribute("aria-label", "Open admin navigation");
  $("sidebarScrim").hidden = true;
}

function openSidebar() {
  $("appView").classList.add("sidebar-open");
  $("sidebarToggle").setAttribute("aria-expanded", "true");
  $("sidebarToggle").setAttribute("aria-label", "Close admin navigation");
  $("sidebarScrim").hidden = false;
}

function saveSettings(event) {
  event.preventDefault();
  const cloudName = $("settingsCloudName").value.trim();
  const preset = $("settingsUploadPreset").value.trim();
  if (!cloudName || !preset) {
    $("settingsMessage").textContent = "Enter both a cloud name and upload preset.";
    $("settingsMessage").className = "status-text error";
    return;
  }
  localStorage.setItem(CLOUD_NAME_KEY, cloudName);
  localStorage.setItem(UPLOAD_PRESET_KEY, preset);
  $("cloudName").value = cloudName;
  $("uploadPreset").value = preset;
  $("settingsMessage").textContent = "Settings saved in this browser.";
  $("settingsMessage").className = "status-text";
  setGlobalMessage("Image upload settings saved.");
}

$("loginForm").addEventListener("submit", login);
$("logoutBtn").addEventListener("click", function () { showLogin(""); });
$("searchInput").addEventListener("input", renderProducts);
$("adminGlobalSearch").addEventListener("input", function () {
  $("searchInput").value = $("adminGlobalSearch").value;
  renderProducts();
});
$("adminGlobalSearch").addEventListener("keydown", function (event) {
  if (event.key === "Enter") switchView("catalogue");
});
$("sidebarToggle").addEventListener("click", function () {
  if ($("appView").classList.contains("sidebar-open")) closeSidebar();
  else openSidebar();
});
$("sidebarScrim").addEventListener("click", closeSidebar);
$("newOrdersButton").addEventListener("click", function () {
  $("ordersStatusFilter").value = "Pending";
  $("ordersSearch").value = "";
  switchView("orders");
  loadOrders(0);
});
$("statsPeriod").addEventListener("change", loadDashboardStats);
$("ordersSearch").addEventListener("input", renderOrders);
$("ordersStatusFilter").addEventListener("change", renderOrders);
$("exportOrders").addEventListener("click", exportOrdersCsv);
$("customerSearch").addEventListener("input", function () {
  window.clearTimeout(customerSearchTimer);
  customerSearchTimer = window.setTimeout(loadCustomers, 250);
});
$("settingsForm").addEventListener("submit", saveSettings);
$("refreshOrders").addEventListener("click", function () { loadOrders(); });
$("refreshServiceRequests").addEventListener("click", loadServiceRequests);
$("previousOrdersPage").addEventListener("click", function () {
  loadOrders(Math.max(0, ordersOffset - 50));
});
$("nextOrdersPage").addEventListener("click", function () {
  if (ordersOffset + orderList.length < totalOrdersCount) loadOrders(ordersOffset + 50);
});
$("addProductTop").addEventListener("click", function () { openEditor(null); });
document.querySelectorAll("[data-add-product]").forEach(function (button) {
  button.addEventListener("click", function () { openEditor(null); });
});
$("closeEditor").addEventListener("click", closeEditor);
$("cancelEditor").addEventListener("click", closeEditor);
$("closeOrderModal").addEventListener("click", closeOrderDetails);
$("cancelOrderModal").addEventListener("click", closeOrderDetails);
$("orderStatusForm").addEventListener("submit", saveOrderStatus);
$("deliveryChargeForm").addEventListener("submit", saveDeliveryCharge);
$("orderModal").addEventListener("click", function (event) {
  if (event.target === $("orderModal")) closeOrderDetails();
});
$("editorModal").addEventListener("click", function (event) {
  if (event.target === $("editorModal")) closeEditor();
});
$("productForm").addEventListener("submit", saveProduct);
$("categoryForm").addEventListener("submit", addCategory);
$("addFeature").addEventListener("click", function () { addDynamicRow("feature", "", ""); });
$("addSpec").addEventListener("click", function () { addDynamicRow("spec", "", ""); });
$("imageUpload").addEventListener("change", uploadImages);
$("addImageUrl").addEventListener("click", addImageUrl);
["productName", "productDescription", "productCategory", "productPrice", "productOldPrice"].forEach(function (id) {
  $(id).addEventListener("input", updatePreview);
  $(id).addEventListener("change", updatePreview);
});
["cloudName", "uploadPreset"].forEach(function (id) {
  $(id).addEventListener("change", function () {
    localStorage.setItem(id === "cloudName" ? CLOUD_NAME_KEY : UPLOAD_PRESET_KEY, $(id).value.trim());
  });
});
$("productPrice").addEventListener("input", function () {
  const value = $("productPrice").value;
  const amount = Number(value);
  $("productPrice").setCustomValidity(value && (!Number.isFinite(amount) || amount < 0 || amount > 99999999)
    ? "Enter a price between 0 and 99,999,999, or leave this field blank."
    : "");
});
document.querySelectorAll(".nav-link").forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();
    switchView(link.dataset.view);
  });
});
document.querySelectorAll("[data-view-link]").forEach(function (button) {
  button.addEventListener("click", function () {
    switchView(button.dataset.viewLink);
  });
});
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && !$("editorModal").hidden) closeEditor();
  if (event.key === "Escape" && !$("orderModal").hidden) closeOrderDetails();
  if (event.key === "Escape") closeSidebar();
});

async function restoreSession() {
  if (!adminPw) return;
  try {
    const res = await fetch(API_URL + "/api/admin/check", { headers: { "x-admin-password": adminPw } });
    if (!res.ok) {
      showLogin("");
      return;
    }
    $("loginView").hidden = true;
    $("appView").hidden = false;
    switchView("dashboard");
    await Promise.all([loadProducts(), loadOrders(), loadOrderSummary()]);
    await loadCategories();
  } catch (err) {
    showLogin("");
  }
}

restoreSession();
