const CHECKOUT_ORDERS_KEY = "alfaCheckoutOrderAccess";
let checkoutCart = [];
let checkoutProducts = new Map();
let checkoutDeliveryCharges = null;
let checkoutSubmitting = false;

function checkoutElement(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function checkoutCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function checkoutStoredOrders() {
  try {
    const records = JSON.parse(localStorage.getItem(CHECKOUT_ORDERS_KEY) || "[]");
    return Array.isArray(records) ? records : [];
  } catch (error) {
    return [];
  }
}

function setCheckoutMessage(message, isError) {
  const node = document.getElementById("checkoutMessage");
  node.textContent = message || "";
  node.className = isError ? "checkout-message error" : "checkout-message";
}

function resolveCheckoutCart() {
  checkoutCart = load(CART_KEY)
    .filter(function (item) { return item && typeof item === "object" && item.id; })
    .map(function (item) {
      const product = checkoutProducts.get(String(item.id));
      return {
        id: String(item.id),
        qty: getSafeQuantity(item.qty),
        product: product || null,
      };
    });
  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const list = document.getElementById("checkoutItems");
  list.replaceChildren();
  const empty = checkoutCart.length === 0;
  document.getElementById("checkoutLoading").hidden = true;
  document.getElementById("checkoutForm").hidden = empty;
  document.getElementById("checkoutEmpty").hidden = !empty;
  if (empty) {
    document.getElementById("checkoutSubtotal").textContent = checkoutCurrency(0);
    document.getElementById("checkoutDeliveryCharge").textContent = checkoutCurrency(0);
    document.getElementById("checkoutTotal").textContent = checkoutCurrency(0);
    document.getElementById("placeOrderButton").disabled = true;
    return;
  }

  let totalCents = 0;
  let hasUnavailableProduct = false;
  let hasUnpricedProduct = false;
  checkoutCart.forEach(function (item, index) {
    const product = item.product;
    if (!product) {
      hasUnavailableProduct = true;
    }
    const price = product ? getNumericPrice(product.price) : null;
    if (price === null) hasUnpricedProduct = true;
    else totalCents += Math.round(price * 100) * item.qty;

    const row = checkoutElement("article", null, "checkout-item");
    if (product && product.image) {
      const image = checkoutElement("img", null, "checkout-item-image");
      image.src = product.image;
      image.alt = "";
      row.appendChild(image);
    } else {
      row.appendChild(checkoutElement("div", "ALFA", "checkout-item-image checkout-image-placeholder"));
    }
    const detail = checkoutElement("div");
    detail.appendChild(checkoutElement("strong", product ? (product.name || "Product") : "Product unavailable", "checkout-item-name"));
    const priceLabel = !product ? "Unavailable" : price === null ? "Price on request" : checkoutCurrency(price);
    const meta = checkoutElement("div", null, "checkout-item-meta");
    const quantity = checkoutElement("span", null, "checkout-qty");
    const decrease = checkoutElement("button", "−");
    decrease.type = "button";
    decrease.disabled = item.qty <= 1 || checkoutSubmitting;
    decrease.setAttribute("aria-label", "Decrease quantity");
    decrease.addEventListener("click", function () { changeCheckoutQuantity(index, -1); });
    const quantityText = checkoutElement("strong", String(item.qty));
    const increase = checkoutElement("button", "+");
    increase.type = "button";
    increase.disabled = item.qty >= 99 || checkoutSubmitting;
    increase.setAttribute("aria-label", "Increase quantity");
    increase.addEventListener("click", function () { changeCheckoutQuantity(index, 1); });
    quantity.append(decrease, quantityText, increase);
    meta.append(quantity, checkoutElement("strong", priceLabel));
    detail.append(meta);
    const subtotal = !product ? "Unavailable" : price === null ? "Price on request" : checkoutCurrency(price * item.qty);
    detail.appendChild(checkoutElement("div", "Item subtotal: " + subtotal, "checkout-item-price"));
    const remove = checkoutElement("button", "Remove item", "checkout-remove");
    remove.type = "button";
    remove.disabled = checkoutSubmitting;
    remove.addEventListener("click", function () { removeCheckoutItem(index); });
    detail.appendChild(remove);
    row.appendChild(detail);
    list.appendChild(row);
  });

  const warning = document.getElementById("checkoutPriceWarning");
  if (hasUnavailableProduct) {
    warning.textContent = "One or more cart products are unavailable. Return to your cart and review it before ordering.";
    warning.hidden = false;
  } else if (hasUnpricedProduct) {
    warning.textContent = "At least one product has no listed price. ALFA SYSTEMS will confirm the product price and final order amount.";
    warning.hidden = false;
  } else {
    warning.hidden = true;
    warning.textContent = "";
  }
  const canCalculate = !hasUnavailableProduct;
  const deliveryMethod = selectedCheckoutValue("deliveryMethod");
  const deliveryCharge = checkoutDeliveryCharges && checkoutDeliveryCharges[deliveryMethod];
  const hasDeliveryCharge = Number.isFinite(deliveryCharge) && deliveryCharge >= 0;
  const deliveryChargeConfirmed = deliveryMethod === "Store Pickup";
  document.getElementById("checkoutSubtotal").textContent = canCalculate && !hasUnpricedProduct
    ? checkoutCurrency(totalCents / 100)
    : hasUnpricedProduct ? "Price to be confirmed" : "Unavailable";
  document.getElementById("checkoutDeliveryCharge").textContent = deliveryChargeConfirmed && hasDeliveryCharge
    ? checkoutCurrency(deliveryCharge)
    : "To be confirmed";
  document.getElementById("checkoutTotal").textContent = canCalculate && !hasUnpricedProduct && deliveryChargeConfirmed
    ? checkoutCurrency((totalCents + (deliveryChargeConfirmed ? Math.round(deliveryCharge * 100) : 0)) / 100)
    : hasUnpricedProduct ? "Price to be confirmed" : canCalculate ? "To be confirmed" : "Unavailable";
  document.getElementById("placeOrderButton").disabled = checkoutSubmitting || hasUnavailableProduct ||
    (deliveryMethod === "Store Pickup" && !hasDeliveryCharge);
}

function persistCartQuantities() {
  const existing = load(CART_KEY);
  const byId = new Map(checkoutCart.map(function (item) { return [item.id, item.qty]; }));
  const updated = existing
    .filter(function (item) { return item && typeof item === "object" && byId.has(String(item.id)); })
    .map(function (item) {
      item.qty = byId.get(String(item.id));
      return item;
    });
  save(CART_KEY, updated);
  updateBadge();
}

function changeCheckoutQuantity(index, delta) {
  const item = checkoutCart[index];
  if (!item || checkoutSubmitting) return;
  item.qty = Math.min(99, Math.max(1, item.qty + delta));
  persistCartQuantities();
  renderCheckoutSummary();
}

function removeCheckoutItem(index) {
  if (checkoutSubmitting) return;
  checkoutCart.splice(index, 1);
  persistCartQuantities();
  setCheckoutMessage("", false);
  renderCheckoutSummary();
}

function selectedCheckoutValue(name) {
  const input = document.querySelector('input[name="' + name + '"]:checked');
  return input ? input.value : "";
}

function validateCheckoutForm() {
  const form = document.getElementById("checkoutForm");
  const phone = document.getElementById("customerPhone");
  phone.value = phone.value.replace(/\s+/g, "");
  const pincode = document.getElementById("deliveryPincode");
  pincode.value = pincode.value.trim();
  if (!checkoutCart.length) {
    setCheckoutMessage("Your cart is empty.", true);
    return false;
  }
  if (checkoutCart.some(function (item) { return !item.product; })) {
    setCheckoutMessage("Review unavailable products before placing your order.", true);
    return false;
  }
  if (!form.checkValidity()) {
    form.reportValidity();
    setCheckoutMessage("Please complete the required fields with valid information.", true);
    return false;
  }
  return true;
}

function showOrderConfirmation(order) {
  document.getElementById("checkoutForm").hidden = true;
  document.getElementById("checkoutLoading").hidden = true;
  document.getElementById("checkoutError").hidden = true;
  document.getElementById("checkoutEmpty").hidden = true;
  document.getElementById("confirmationOrderId").textContent = "#" + order.orderId;
  const createdAt = new Date(order.createdAt);
  document.getElementById("confirmationDate").textContent = Number.isNaN(createdAt.getTime())
    ? "Just now"
    : createdAt.toLocaleString("en-IN");
  document.getElementById("confirmationSubtotal").textContent = order.subtotal === null || order.subtotal === undefined
    ? "Price to be confirmed"
    : checkoutCurrency(Number(order.subtotal));
  const deliveryConfirmed = order.deliveryMethod === "Store Pickup";
  document.getElementById("confirmationDeliveryCharge").textContent = deliveryConfirmed
    ? checkoutCurrency(Number(order.deliveryCharge))
    : "To be confirmed";
  document.getElementById("confirmationTotal").textContent = !deliveryConfirmed || order.totalAmount === null || order.totalAmount === undefined
    ? "To be confirmed"
    : checkoutCurrency(Number(order.totalAmount));
  document.getElementById("confirmationPayment").textContent = order.paymentMethod;
  document.getElementById("confirmationPaymentStatus").textContent = order.paymentStatus;
  document.getElementById("confirmationDelivery").textContent = order.deliveryMethod;
  document.getElementById("confirmationStatus").textContent = order.status || "Pending";
  document.getElementById("confirmationCustomer").textContent = order.customer && order.customer.name || "—";
  document.getElementById("confirmationPhone").textContent = order.customer && order.customer.phone || "—";
  const delivery = order.delivery || {};
  document.getElementById("confirmationAddress").textContent = [
    delivery.address,
    delivery.city,
    delivery.district,
    delivery.state,
    delivery.pincode,
  ].filter(Boolean).join(", ") || "—";
  const confirmationWhatsApp = document.getElementById("confirmationWhatsApp");
  confirmationWhatsApp.href = "https://wa.me/919846500877?text=" +
    encodeURIComponent("Hello ALFA SYSTEMS, I placed order #" + order.orderId + " and would like to confirm the order details.");
  const items = document.getElementById("confirmationItems");
  items.replaceChildren();
  (Array.isArray(order.items) ? order.items : []).forEach(function (item) {
    const row = checkoutElement("article", null, "checkout-item");
    if (item.image) {
      const image = checkoutElement("img", null, "checkout-item-image");
      image.src = item.image;
      image.alt = "";
      row.appendChild(image);
    }
    const details = checkoutElement("div");
    details.appendChild(checkoutElement("strong", item.name || "Product", "checkout-item-name"));
    const itemPrice = item.unitPrice === null || item.unitPrice === undefined
      ? "Price to be confirmed"
      : checkoutCurrency(Number(item.unitPrice));
    details.appendChild(checkoutElement("div", "Quantity: " + getSafeQuantity(item.qty) + " · " + itemPrice, "checkout-item-price"));
    row.appendChild(details);
    items.appendChild(row);
  });
  document.getElementById("orderConfirmation").hidden = false;
}

async function submitCheckout(event) {
  event.preventDefault();
  if (checkoutSubmitting || !validateCheckoutForm()) return;
  checkoutSubmitting = true;
  const button = document.getElementById("placeOrderButton");
  const label = button.querySelector("span");
  const previousLabel = label.textContent;
  label.textContent = "Placing order…";
  button.disabled = true;
  const controls = Array.from(document.getElementById("checkoutForm").elements);
  controls.forEach(function (control) { control.disabled = true; });
  setCheckoutMessage("Submitting your order securely…", false);

  const request = {
    items: checkoutCart.map(function (item) { return { id: item.id, qty: item.qty }; }),
    checkout: {
      customer: {
        name: document.getElementById("customerName").value.trim(),
        phone: document.getElementById("customerPhone").value.trim(),
        email: document.getElementById("customerEmail").value.trim(),
      },
      delivery: {
        method: selectedCheckoutValue("deliveryMethod"),
        address: document.getElementById("deliveryAddress").value.trim(),
        city: document.getElementById("deliveryCity").value.trim(),
        district: document.getElementById("deliveryDistrict").value.trim(),
        state: document.getElementById("deliveryState").value.trim(),
        pincode: document.getElementById("deliveryPincode").value.trim(),
        note: document.getElementById("deliveryNote").value.trim(),
      },
      paymentMethod: selectedCheckoutValue("paymentMethod"),
    },
  };
  try {
    const response = await fetch(API_URL + "/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const body = await response.json().catch(function () { return {}; });
      throw new Error(body.error || "Could not place your order (HTTP " + response.status + ").");
    }
    const order = await response.json();
    if (!order.orderId || !order.accessToken || !Array.isArray(order.items)) {
      throw new Error("The order was saved, but the confirmation response was incomplete. Contact ALFA SYSTEMS with your order details.");
    }

    let tokenSaved = true;
    try {
      const saved = checkoutStoredOrders();
      saved.unshift({ orderId: order.orderId, accessToken: order.accessToken });
      localStorage.setItem(CHECKOUT_ORDERS_KEY, JSON.stringify(saved.slice(0, 100)));
      save(CART_KEY, []);
      updateBadge();
    } catch (storageError) {
      tokenSaved = false;
    }
    showOrderConfirmation(order);
    if (!tokenSaved) {
      const warning = document.getElementById("confirmationStorageWarning");
      warning.textContent = "Order placed, but this browser could not save the secure My Orders access link. Save your order ID: #" + order.orderId;
      warning.hidden = false;
    }
  } catch (error) {
    setCheckoutMessage(error.message || "Could not place your order. Please try again.", true);
  } finally {
    checkoutSubmitting = false;
    controls.forEach(function (control) { control.disabled = false; });
    label.textContent = previousLabel;
    button.disabled = checkoutCart.length === 0 || checkoutCart.some(function (item) {
      return !item.product;
    }) || !checkoutDeliveryCharges ||
      (selectedCheckoutValue("deliveryMethod") === "Store Pickup" &&
        !Number.isFinite(checkoutDeliveryCharges["Store Pickup"]));
  }
}

const checkoutErrorBox = document.getElementById("checkoutError");

document.getElementById("checkoutForm").addEventListener("submit", submitCheckout);
document.querySelectorAll('input[name="deliveryMethod"]').forEach(function (input) {
  input.addEventListener("change", function () {
    document.getElementById("selectedDeliveryText").textContent = "Selected: " + selectedCheckoutValue("deliveryMethod");
    renderCheckoutSummary();
  });
});
document.getElementById("customerPhone").addEventListener("input", function (event) {
  event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
});
document.getElementById("deliveryPincode").addEventListener("input", function (event) {
  event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
});

async function initializeCheckout() {
  const errorBox = checkoutErrorBox;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(function () { controller.abort(); }, 12000);
    let response;
    let optionsResponse;
    try {
      [response, optionsResponse] = await Promise.all([
        fetch(API_URL + "/api/products", { signal: controller.signal }),
        fetch(API_URL + "/api/checkout/options", { signal: controller.signal }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error("Could not load current product details (HTTP " + response.status + ").");
    if (!optionsResponse.ok) throw new Error("Could not load current delivery options (HTTP " + optionsResponse.status + ").");
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("The products API returned an invalid response.");
    const options = await optionsResponse.json();
    const deliveryCharges = options && options.deliveryCharges;
    if (!deliveryCharges ||
        !(deliveryCharges["Home Delivery"] === null ||
          (Number.isFinite(deliveryCharges["Home Delivery"]) && deliveryCharges["Home Delivery"] >= 0)) ||
        !(Number.isFinite(deliveryCharges["Store Pickup"]) && deliveryCharges["Store Pickup"] >= 0)) {
      throw new Error("The checkout options API returned invalid delivery charges.");
    }
    products.splice(0, products.length, ...data);
    checkoutDeliveryCharges = deliveryCharges;
    checkoutProducts = new Map(data.map(function (product) { return [String(product.id), product]; }));
    resolveCheckoutCart();
    updateBadge();
    document.getElementById("checkoutError").hidden = true;
    if (!checkoutCart.length) document.getElementById("checkoutEmpty").hidden = false;
  } catch (error) {
    document.getElementById("checkoutLoading").hidden = true;
    errorBox.textContent = (error.message || "Could not load the checkout.") + " Return to your cart or try again.";
    errorBox.hidden = false;
    const retry = checkoutElement("button", "Retry", "checkout-retry");
    retry.type = "button";
    retry.addEventListener("click", function () {
      errorBox.hidden = true;
      document.getElementById("checkoutLoading").hidden = false;
      initializeCheckout();
    });
    errorBox.appendChild(retry);
  }
}

initializeCheckout();
