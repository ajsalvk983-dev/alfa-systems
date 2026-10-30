const MY_CHECKOUT_ORDERS_KEY = "alfaCheckoutOrderAccess";

function myOrderElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined && text !== null) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function readCheckoutOrderAccess() {
  try {
    const records = JSON.parse(localStorage.getItem(MY_CHECKOUT_ORDERS_KEY) || "[]");
    return Array.isArray(records) ? records.filter(function (record) {
      return record &&
        /^\d+$/.test(String(record.orderId)) &&
        typeof record.accessToken === "string" &&
        /^[a-f0-9]{64}$/.test(record.accessToken);
    }) : [];
  } catch (error) {
    return [];
  }
}

function myOrderDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-IN");
}

function myOrderCurrency(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount)
    : "—";
}

function renderDatabaseOrder(order) {
  const card = myOrderElement("article", null, "database-order-card");
  const head = myOrderElement("div", null, "database-order-head");
  const title = myOrderElement("div");
  title.append(
    myOrderElement("strong", "Order #" + order.orderId),
    myOrderElement("small", myOrderDate(order.createdAt))
  );
  const status = myOrderElement("span", order.status || "Pending", "database-order-status");
  const statusClass = String(order.status || "Pending").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  status.classList.add("status-" + statusClass);
  head.append(title, status);
  card.appendChild(head);

  const items = myOrderElement("div", null, "database-order-items");
  (Array.isArray(order.items) ? order.items : []).forEach(function (item) {
    const row = myOrderElement("div", null, "database-order-item");
    row.append(
      myOrderElement("span", item.name || "Product"),
      myOrderElement("strong", "× " + item.qty)
    );
    items.appendChild(row);
  });
  card.appendChild(items);
  const subtotalRow = myOrderElement("div", null, "database-order-total");
  subtotalRow.append(
    myOrderElement("span", "Product subtotal"),
    myOrderElement("strong", order.subtotal === null || order.subtotal === undefined
      ? "Price to be confirmed"
      : myOrderCurrency(order.subtotal))
  );
  card.appendChild(subtotalRow);
  const deliveryPending = order.deliveryMethod === "Home Delivery" && order.deliveryChargeConfirmed === false;
  const deliveryRow = myOrderElement("div", null, "database-order-total");
  deliveryRow.append(
    myOrderElement("span", "Delivery charge"),
    myOrderElement("strong", deliveryPending ? "To be confirmed" : myOrderCurrency(order.deliveryCharge))
  );
  card.appendChild(deliveryRow);
  const totalRow = myOrderElement("div", null, "database-order-total");
  totalRow.append(
    myOrderElement("span", deliveryPending || order.totalAmount === null ? "Final total" : "Total"),
    myOrderElement("strong", deliveryPending || order.totalAmount === null ? "To be confirmed" : myOrderCurrency(order.totalAmount))
  );
  card.appendChild(totalRow);
  const meta = myOrderElement("div", null, "database-order-meta");
  if (order.paymentMethod) meta.appendChild(myOrderElement("span", "Payment method: " + order.paymentMethod));
  if (order.paymentStatus) meta.appendChild(myOrderElement("span", "Payment status: " + order.paymentStatus));
  if (order.deliveryMethod) meta.appendChild(myOrderElement("span", order.deliveryMethod));
  if (order.paymentMethod || order.paymentStatus || order.deliveryMethod) card.appendChild(meta);

  const details = myOrderElement("details", null, "database-order-details");
  details.appendChild(myOrderElement("summary", "View order details"));
  const detailGrid = myOrderElement("div", null, "database-order-detail-grid");
  const customer = order.customer || {};
  const delivery = order.delivery || {};
  [
    ["Customer", customer.name],
    ["Phone", customer.phone],
    ["Email", customer.email],
    ["Delivery address", [delivery.address, delivery.city, delivery.district, delivery.state, delivery.pincode].filter(Boolean).join(", ")],
    ["Delivery note", delivery.note],
    ["Payment", order.paymentMethod],
    ["Status", order.status || "Pending"],
  ].forEach(function (entry) {
    if (!entry[1]) return;
    const row = myOrderElement("div");
    row.append(myOrderElement("span", entry[0]), myOrderElement("strong", entry[1]));
    detailGrid.appendChild(row);
  });
  details.appendChild(detailGrid);
  card.appendChild(details);
  return card;
}

async function loadDatabaseOrders() {
  const state = document.getElementById("databaseOrdersState");
  const list = document.getElementById("databaseOrdersList");
  const records = readCheckoutOrderAccess();
  list.replaceChildren();
  if (!records.length) {
    state.className = "database-orders-state";
    state.textContent = "Checkout orders placed on this browser will appear here.";
    return;
  }

  state.className = "database-orders-state";
  state.textContent = "Loading " + records.length + (records.length === 1 ? " saved order…" : " saved orders…");
  const results = await Promise.all(records.map(async function (record) {
    try {
      const response = await fetch(API_URL + "/api/orders/" + encodeURIComponent(record.orderId), {
        headers: { "x-order-access-token": record.accessToken },
      });
      if (!response.ok) throw new Error(response.status === 404 ? "Order access is unavailable." : "Could not load this order.");
      return { order: await response.json() };
    } catch (error) {
      return { error: "Order #" + record.orderId + ": " + (error.message || "Could not load this order.") };
    }
  }));
  const successful = results.filter(function (result) { return result.order; });
  successful.forEach(function (result) { list.appendChild(renderDatabaseOrder(result.order)); });
  const failures = results.filter(function (result) { return result.error; });
  if (successful.length) {
    state.textContent = failures.length
      ? "Some saved orders could not be loaded."
      : successful.length + (successful.length === 1 ? " checkout order saved on this browser." : " checkout orders saved on this browser.");
    if (failures.length) {
      const details = myOrderElement("p", failures.map(function (result) { return result.error; }).join(" "));
      state.appendChild(details);
    }
  } else {
    state.className = "database-orders-state error";
    state.textContent = failures.map(function (result) { return result.error; }).join(" ");
    const retry = myOrderElement("button", "Retry", "checkout-retry");
    retry.type = "button";
    retry.addEventListener("click", loadDatabaseOrders);
    state.appendChild(retry);
  }
}

loadDatabaseOrders();
