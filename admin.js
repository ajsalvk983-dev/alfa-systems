// Admin page: change prices and see orders. It talks to the backend in alfa-backend.
// Needs api.js (API_URL) to be loaded first.
const PW_KEY = "alfaAdminPw";
let adminPw = sessionStorage.getItem(PW_KEY) || "";

function $(id) {
  return document.getElementById(id);
}

// small helper: make an element, optionally with text and a class
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function setMsg(text, isError) {
  const m = $("msg");
  m.textContent = text || "";
  m.className = isError ? "msg bad" : "msg";
}

function logout(message) {
  adminPw = "";
  sessionStorage.removeItem(PW_KEY);
  $("panel").hidden = true;
  $("logoutBtn").hidden = true;
  $("loginBox").hidden = false;
  setMsg(message || "", Boolean(message));
}

// every admin request sends the password in a header; the server checks it
async function adminFetch(path, options) {
  options = options || {};
  options.headers = Object.assign(
    { "x-admin-password": adminPw, "Content-Type": "application/json" },
    options.headers
  );
  const res = await fetch(API_URL + path, options);
  if (res.status === 401) {
    logout("Wrong password");
    throw new Error("Not allowed");
  }
  return res;
}

async function login() {
  const typed = $("pw").value;
  if (!typed) {
    setMsg("Type the admin password", true);
    return;
  }
  try {
    const res = await fetch(API_URL + "/api/admin/check", { headers: { "x-admin-password": typed } });
    if (!res.ok) {
      setMsg("Wrong password", true);
      return;
    }
    adminPw = typed;
    sessionStorage.setItem(PW_KEY, typed); // forgotten when this tab is closed
    $("pw").value = "";
    openPanel();
  } catch (err) {
    setMsg("Cannot reach the server. Is node server.js running?", true);
  }
}

function openPanel() {
  setMsg("");
  $("loginBox").hidden = true;
  $("panel").hidden = false;
  $("logoutBtn").hidden = false;
  showProducts();
  showOrders();
}

function numberInput(value) {
  const input = el("input");
  input.type = "number";
  input.min = "0";
  input.step = "0.01";
  input.inputMode = "decimal";
  input.value = value === null || value === undefined ? "" : value;
  return input;
}

function field(labelText, input) {
  const wrap = el("label", null, "field");
  wrap.appendChild(el("span", labelText));
  wrap.appendChild(input);
  return wrap;
}

function productRow(p) {
  const row = el("div", null, "row");
  row.appendChild(el("h3", p.name));

  const price = numberInput(p.price);
  const oldPrice = numberInput(p.oldPrice);
  const note = el("input");
  note.type = "text";
  note.maxLength = 120;
  note.value = p.priceNote || "";

  const fields = el("div", null, "fields");
  fields.appendChild(field("Price (\u20B9)", price));
  fields.appendChild(field("Old price (\u20B9), optional", oldPrice));
  fields.appendChild(field("Note, e.g. + GST", note));
  row.appendChild(fields);

  const save = el("button", "Save");
  save.type = "button";
  const status = el("span", "", "status");
  save.addEventListener("click", async function () {
    save.disabled = true;
    status.textContent = "Saving...";
    try {
      const res = await adminFetch("/api/admin/products/" + encodeURIComponent(p.id), {
        method: "PUT",
        body: JSON.stringify({ price: price.value, oldPrice: oldPrice.value, priceNote: note.value }),
      });
      status.textContent = res.ok ? "Saved" : "Could not save";
    } catch (err) {
      status.textContent = "Could not save";
    }
    save.disabled = false;
  });

  const actions = el("div", null, "actions");
  actions.appendChild(save);
  actions.appendChild(status);
  row.appendChild(actions);
  return row;
}

async function showProducts() {
  const box = $("products");
  box.textContent = "Loading...";
  try {
    const res = await fetch(API_URL + "/api/products");
        if (!res.ok) throw new Error("products " + res.status);
    const list = await res.json();
    box.textContent = "";
    list.forEach(function (p) {
      box.appendChild(productRow(p));
    });
  } catch (err) {
    box.textContent = "Could not load products.";
  }
}

async function showOrders() {
  const box = $("orders");
  box.textContent = "Loading...";
  try {
    const res = await adminFetch("/api/admin/orders");
       if (!res.ok) throw new Error("orders " + res.status);
    const list = await res.json();
    box.textContent = "";
    if (!list.length) {
      box.textContent = "No orders yet.";
      return;
    }
    list.forEach(function (o) {
      const card = el("div", null, "row");
      card.appendChild(el("h3", "Order #" + o.id));
      card.appendChild(el("p", new Date(o.createdAt).toLocaleString("en-IN"), "when"));
      const ul = el("ul");
      o.items.forEach(function (i) {
        ul.appendChild(el("li", i.name + " x " + i.qty));
      });
      card.appendChild(ul);
      box.appendChild(card);
    });
  } catch (err) {
    if (!$("panel").hidden) box.textContent = "Could not load orders.";
  }
}

$("loginBtn").addEventListener("click", login);
$("pw").addEventListener("keydown", function (e) {
  if (e.key === "Enter") login();
});
$("logoutBtn").addEventListener("click", function () {
  logout("");
});

// opened again in the same tab: check the saved password still works
if (adminPw) {
  fetch(API_URL + "/api/admin/check", { headers: { "x-admin-password": adminPw } })
    .then(function (res) {
      if (res.ok) openPanel();
      else logout("");
    })
    .catch(function () {
      logout("");
    });
}