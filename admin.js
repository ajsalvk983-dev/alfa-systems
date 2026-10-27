// Admin page uses the store API; the API validates the password for admin routes.
const PW_KEY = "alfaAdminPw";
const CLOUD_NAME_KEY = "ddng8ksv6";
const UPLOAD_PRESET_KEY = "alfa_products";
let adminPw = sessionStorage.getItem(PW_KEY) || "";
let productList = [];
let editorImages = [];
let mainImageIndex = 0;
let editingProduct = false;

function $(id) {
  return document.getElementById(id);
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
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
    await loadProducts();
    await loadOrders();
  } catch (err) {
    setLoginMessage("Cannot reach the store API. Check your connection and try again.", true);
  } finally {
    $("loginBtn").disabled = false;
  }
}

function categoryLabel(category) {
  const labels = {
    platform: "Platform scales",
    counter: "Counter scales",
    label: "Label printing",
    portable: "Portable & precision",
    sealing: "Sealing machines",
  };
  return labels[category] || category || "Uncategorised";
}

function displayPrice(value) {
  if (value === null || value === undefined || value === "") return "On request";
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount)
    ? "\u20B9" + amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : String(value);
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
    const remove = el("button", "Delete", "table-action delete");
    remove.type = "button";
    remove.addEventListener("click", function () { deleteProduct(p); });
    actions.append(edit, remove);
    actionsTd.appendChild(actions);
    row.append(productTd, categoryTd, priceTd, imagesTd, actionsTd);
    body.appendChild(row);
  });
  $("emptyProducts").hidden = filtered.length > 0;
  $("totalProducts").textContent = String(productList.length);
  $("pricedProducts").textContent = String(productList.filter(function (p) { return Boolean(p.price); }).length);
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
    const res = await fetch(API_URL + "/api/products");
    if (!res.ok) throw new Error("Product request failed (" + res.status + ")");
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

async function loadOrders() {
  const box = $("orders");
  box.replaceChildren(el("p", "Loading orders...", "muted"));
  try {
    const res = await adminFetch("/api/admin/orders");
    if (!res.ok) throw new Error("Orders request failed (" + res.status + ")");
    const list = await res.json();
    box.replaceChildren();
    if (!Array.isArray(list) || !list.length) {
      box.appendChild(el("p", "No orders yet.", "muted"));
      return;
    }
    list.forEach(function (order) {
      const card = el("article", null, "order-card");
      card.appendChild(el("h3", "Order #" + order.id));
      card.appendChild(el("p", new Date(order.createdAt).toLocaleString("en-IN")));
      const items = el("ul");
      (order.items || []).forEach(function (item) {
        items.appendChild(el("li", (item.name || "Product") + " × " + item.qty));
      });
      card.appendChild(items);
      box.appendChild(card);
    });
  } catch (err) {
    if (!$("appView").hidden) box.replaceChildren(el("p", "Could not load orders: " + (err.message || "API error"), "muted"));
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
    $("productCategory").value = product.category || "";
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
  $("cloudName").value = localStorage.getItem(CLOUD_NAME_KEY) || "";
  $("uploadPreset").value = localStorage.getItem(UPLOAD_PRESET_KEY) || "";
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
  const price = $("productPrice").value.trim();
  $("previewPrice").textContent = price ? displayPrice(price) : "Price on request";
  const oldPrice = $("productOldPrice").value.trim();
  $("previewOldPrice").hidden = !oldPrice;
  $("previewOldPrice").textContent = oldPrice ? displayPrice(oldPrice) : "";
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
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
    price: $("productPrice").value.trim(),
    oldPrice: $("productOldPrice").value.trim(),
    priceNote: $("productPriceNote").value.trim(),
    capacity: $("productCapacity").value.trim(),
    accuracy: $("productAccuracy").value.trim(),
    usedFor: $("productUsedFor").value.trim(),
    features: features,
    specs: specs,
    images: orderedImages,
    image: orderedImages[0] || "",
  };
  if (!product.price) delete product.price;
  if (!product.oldPrice) delete product.oldPrice;
  return product;
}

async function saveProduct(event) {
  event.preventDefault();
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
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(detail || "The server could not save this product (" + res.status + ").");
    }
    closeEditor();
    if (await loadProducts()) setGlobalMessage(editingProduct ? "Product updated." : "Product added.");
  } catch (err) {
    $("editorStatus").textContent = err.message || "Could not save product.";
    $("editorStatus").className = "status-text error";
  } finally {
    button.disabled = false;
  }
}

async function deleteProduct(product) {
  if (!window.confirm('Delete "' + (product.name || "this product") + '"? This cannot be undone.')) return;
  try {
    const res = await adminFetch("/api/admin/products/" + encodeURIComponent(product.id), { method: "DELETE" });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(detail || "The server could not delete this product (" + res.status + ").");
    }
    if (await loadProducts()) setGlobalMessage("Product deleted.");
  } catch (err) {
    setGlobalMessage(err.message || "Could not delete product.", true);
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

function switchView(view) {
  const orders = view === "orders";
  $("catalogueView").hidden = orders;
  $("ordersView").hidden = !orders;
  $("pageTitle").textContent = orders ? "Orders" : "Products";
  $("addProductTop").hidden = orders;
  document.querySelectorAll(".nav-link").forEach(function (link) {
    link.classList.toggle("active", link.dataset.view === view);
  });
}

$("loginForm").addEventListener("submit", login);
$("logoutBtn").addEventListener("click", function () { showLogin(""); });
$("searchInput").addEventListener("input", renderProducts);
$("addProductTop").addEventListener("click", function () { openEditor(null); });
document.querySelectorAll("[data-add-product]").forEach(function (button) {
  button.addEventListener("click", function () { openEditor(null); });
});
$("closeEditor").addEventListener("click", closeEditor);
$("cancelEditor").addEventListener("click", closeEditor);
$("editorModal").addEventListener("click", function (event) {
  if (event.target === $("editorModal")) closeEditor();
});
$("productForm").addEventListener("submit", saveProduct);
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
document.querySelectorAll(".nav-link").forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();
    switchView(link.dataset.view);
  });
});
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && !$("editorModal").hidden) closeEditor();
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
    await loadProducts();
    await loadOrders();
  } catch (err) {
    showLogin("");
  }
}

restoreSession();
