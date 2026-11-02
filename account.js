(function () {
  const loginView = document.getElementById("accountLogin");
  const profileView = document.getElementById("accountProfile");
  const message = document.getElementById("accountMessage");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const resetPasswordForm = document.getElementById("resetPasswordForm");
  const profileForm = document.getElementById("profileForm");
  const passwordForm = document.getElementById("passwordForm");
  const addressForm = document.getElementById("addressForm");
  const addressList = document.getElementById("accountAddressesList");
  const query = new URLSearchParams(window.location.search);
  const resetToken = query.get("reset") || "";
  let busy = false;
  let currentAccountUser = null;
  let addresses = [];

  function showMessage(text, isError) {
    message.textContent = text || "";
    message.classList.toggle("is-error", Boolean(isError));
    message.hidden = !text;
  }

  function setBusy(form, state, buttonText) {
    form.querySelectorAll("button, input, textarea, select").forEach(function (control) {
      control.disabled = state;
    });
    const button = form.querySelector('[type="submit"]');
    if (button && state) {
      button.dataset.label = button.textContent;
      button.textContent = buttonText;
    } else if (button && button.dataset.label) {
      button.textContent = button.dataset.label;
      delete button.dataset.label;
    }
  }

  function selectTab(name) {
    document.querySelectorAll("[data-account-tab]").forEach(function (button) {
      const selected = button.dataset.accountTab === name;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    loginForm.hidden = name !== "login";
    signupForm.hidden = name !== "signup";
    forgotPasswordForm.hidden = name !== "forgot";
    resetPasswordForm.hidden = name !== "reset";
    showMessage("");
  }

  function selectDashboardTab(name) {
    document.querySelectorAll("[data-dashboard-tab]").forEach(function (button) {
      const selected = button.dataset.dashboardTab === name;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    document.querySelectorAll("[data-dashboard-panel]").forEach(function (panel) {
      panel.hidden = panel.dataset.dashboardPanel !== name;
    });
    showMessage("");
  }

  function showLogin() {
    currentAccountUser = null;
    profileView.hidden = true;
    loginView.hidden = false;
    selectTab("login");
  }

  function showProfile(user) {
    currentAccountUser = user;
    loginView.hidden = true;
    profileView.hidden = false;
    document.getElementById("profileName").value = user.name || "";
    document.getElementById("profileEmail").value = user.email || "";
    document.getElementById("profilePhone").value = user.phone || "";
    document.getElementById("profileHeading").textContent = "Welcome, " + (user.name || "customer");
    const verification = document.getElementById("accountVerification");
    verification.hidden = Boolean(user.emailVerified);
    verification.querySelector("span").textContent = user.emailVerified
      ? "Email verified"
      : "Your email address is not verified. You can still place orders.";
    selectDashboardTab("profile");
    loadDashboard();
  }

  async function responseData(response, fallback) {
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || fallback);
    return data;
  }

  async function submitAuth(event, action, loadingText) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    busy = true;
    setBusy(form, true, loadingText);
    showMessage("Please wait…");
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const response = await fetch(API_URL + "/api/auth/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await responseData(response, "Could not sign in.");
      saveAuthSession(data);
      showProfile(data.user);
      if (action === "signup") showMessage(data.message, !data.emailVerificationSent);
      else showMessage("You are signed in.");
    } catch (error) {
      showMessage(error.message || "Could not complete sign-in.", true);
    } finally {
      busy = false;
      setBusy(form, false);
    }
  }

  loginForm.addEventListener("submit", function (event) {
    submitAuth(event, "login", "Signing in…");
  });
  signupForm.addEventListener("submit", function (event) {
    submitAuth(event, "signup", "Creating account…");
  });

  document.querySelectorAll("[data-account-tab]").forEach(function (button) {
    button.addEventListener("click", function () {
      selectTab(button.dataset.accountTab);
    });
  });
  document.querySelectorAll("[data-dashboard-tab]").forEach(function (button) {
    button.addEventListener("click", function () {
      selectDashboardTab(button.dataset.dashboardTab);
    });
  });
  document.querySelectorAll("[data-return-login]").forEach(function (button) {
    button.addEventListener("click", function () { selectTab("login"); });
  });

  document.getElementById("forgotPasswordToggle").addEventListener("click", function () {
    forgotPasswordForm.elements.email.value = loginForm.elements.email.value;
    selectTab("forgot");
  });
  forgotPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (busy || !forgotPasswordForm.reportValidity()) return;
    busy = true;
    setBusy(forgotPasswordForm, true, "Sending…");
    try {
      const response = await fetch(API_URL + "/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotPasswordForm.elements.email.value.trim() }),
      });
      const data = await responseData(response, "Could not request a password reset.");
      showMessage(data.message || "If an account exists for that email, a reset link will be sent.");
    } catch (error) {
      showMessage(error.message || "Could not request a password reset.", true);
    } finally {
      busy = false;
      setBusy(forgotPasswordForm, false);
    }
  });

  resetPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (busy || !resetPasswordForm.reportValidity()) return;
    const password = resetPasswordForm.elements.password.value;
    if (password !== resetPasswordForm.elements.confirmPassword.value) {
      showMessage("Your new passwords do not match.", true);
      return;
    }
    if (!resetToken) {
      showMessage("This password reset link is invalid or expired.", true);
      return;
    }
    busy = true;
    setBusy(resetPasswordForm, true, "Resetting…");
    try {
      const response = await fetch(API_URL + "/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: password }),
      });
      const data = await responseData(response, "Could not reset your password.");
      window.history.replaceState(null, "", window.location.pathname);
      resetPasswordForm.reset();
      selectTab("login");
      showMessage(data.message || "Your password has been reset. Please sign in.");
    } catch (error) {
      showMessage(error.message || "Could not reset your password.", true);
    } finally {
      busy = false;
      setBusy(resetPasswordForm, false);
    }
  });

  async function verifyEmailLink() {
    const token = query.get("verify");
    if (!token) return;
    try {
      const response = await fetch(API_URL + "/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token }),
      });
      const data = await responseData(response, "Could not verify your email address.");
      window.history.replaceState(null, "", window.location.pathname);
      showMessage(data.message || "Your email address has been verified.");
    } catch (error) {
      showMessage(error.message || "This verification link is invalid or expired.", true);
    }
  }

  document.querySelectorAll("[data-password-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      const input = document.getElementById(button.dataset.passwordToggle);
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.textContent = showing ? "Show" : "Hide";
      button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    });
  });

  profileForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (busy || !profileForm.reportValidity()) return;
    busy = true;
    setBusy(profileForm, true, "Saving…");
    try {
      const response = await authFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: document.getElementById("profileName").value.trim(),
          phone: document.getElementById("profilePhone").value.trim(),
        }),
      });
      const data = await responseData(response, "Could not update your profile.");
      setCurrentUser(data.user);
      showProfile(data.user);
      showMessage("Your profile has been updated.");
    } catch (error) {
      showMessage(error.message || "Could not update your profile.", true);
    } finally {
      busy = false;
      setBusy(profileForm, false);
    }
  });

  passwordForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (busy || !passwordForm.reportValidity()) return;
    const newPassword = document.getElementById("newPassword").value;
    if (newPassword !== document.getElementById("confirmPassword").value) {
      showMessage("Your new passwords do not match.", true);
      return;
    }
    busy = true;
    setBusy(passwordForm, true, "Updating…");
    try {
      const response = await authFetch("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: document.getElementById("currentPassword").value,
          newPassword: newPassword,
        }),
      });
      const data = await responseData(response, "Could not update your password.");
      saveAuthSession({ token: data.token, user: currentAccountUser });
      passwordForm.reset();
      showMessage("Your password has been changed. Other devices have been signed out.");
    } catch (error) {
      showMessage(error.message || "Could not update your password.", true);
    } finally {
      busy = false;
      setBusy(passwordForm, false);
    }
  });

  document.getElementById("logoutAllButton").addEventListener("click", async function () {
    try {
      const response = await authFetch("/api/auth/logout-all", { method: "POST" });
      await responseData(response, "Could not sign out other devices.");
      logout();
      showLogin();
      showMessage("You have been signed out on all devices.");
    } catch (error) {
      showMessage(error.message || "Could not sign out other devices.", true);
    }
  });

  document.getElementById("deleteAccountForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || !window.confirm("Delete your account and anonymise your order and service records? This cannot be undone.")) return;
    try {
      const response = await authFetch("/api/auth/account", {
        method: "DELETE",
        body: JSON.stringify({ password: form.elements.password.value }),
      });
      await responseData(response, "Could not delete your account.");
      logout();
      form.reset();
      showLogin();
      showMessage("Your account has been deleted and personal order details anonymised.");
    } catch (error) {
      showMessage(error.message || "Could not delete your account.", true);
    }
  });

  function addressPayload(form) {
    return {
      label: form.elements.label.value.trim(),
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      address: form.elements.address.value.trim(),
      city: form.elements.city.value.trim(),
      district: form.elements.district.value.trim(),
      state: form.elements.state.value.trim(),
      pincode: form.elements.pincode.value.trim(),
      note: form.elements.note.value.trim(),
      isDefault: form.elements.isDefault.checked,
    };
  }

  function resetAddressForm() {
    addressForm.reset();
    addressForm.elements.id.value = "";
    addressForm.elements.name.value = currentAccountUser ? currentAccountUser.name || "" : "";
    addressForm.elements.phone.value = currentAccountUser ? currentAccountUser.phone || "" : "";
    addressForm.elements.state.value = "Kerala";
    document.getElementById("addressFormHeading").textContent = "Add an address";
    document.getElementById("cancelAddressEdit").hidden = true;
  }

  function renderAddresses() {
    addressList.replaceChildren();
    if (!addresses.length) {
      addressList.textContent = "No saved addresses yet.";
      return;
    }
    addresses.forEach(function (address) {
      const card = document.createElement("article");
      card.className = "account-record-card";
      const heading = document.createElement("h3");
      heading.textContent = address.label + (address.isDefault ? " · Default" : "");
      const detail = document.createElement("p");
      detail.textContent = [address.name, address.phone, address.address, address.city, address.district, address.state, address.pincode, address.note]
        .filter(Boolean).join(" · ");
      const actions = document.createElement("div");
      actions.className = "account-record-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", function () {
        Object.keys(addressPayload(addressForm)).forEach(function (key) {
          if (key === "isDefault") addressForm.elements.isDefault.checked = address.isDefault;
          else if (addressForm.elements[key]) addressForm.elements[key].value = address[key] || "";
        });
        addressForm.elements.id.value = address.id;
        document.getElementById("addressFormHeading").textContent = "Edit address";
        document.getElementById("cancelAddressEdit").hidden = false;
        addressForm.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      actions.appendChild(edit);
      if (!address.isDefault) {
        const makeDefault = document.createElement("button");
        makeDefault.type = "button";
        makeDefault.textContent = "Make default";
        makeDefault.addEventListener("click", function () {
          saveAddress(address.id, Object.assign({}, address, { isDefault: true }));
        });
        actions.appendChild(makeDefault);
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Delete";
      remove.addEventListener("click", function () { deleteAddress(address.id); });
      actions.appendChild(remove);
      card.append(heading, detail, actions);
      addressList.appendChild(card);
    });
  }

  async function loadAddresses() {
    const response = await authFetch("/api/auth/addresses");
    const data = await responseData(response, "Could not load your saved addresses.");
    if (!Array.isArray(data)) throw new Error("The addresses API returned an invalid response.");
    addresses = data;
    renderAddresses();
  }

  async function saveAddress(id, payload) {
    try {
      const response = await authFetch("/api/auth/addresses" + (id ? "/" + encodeURIComponent(id) : ""), {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      await responseData(response, "Could not save this address.");
      resetAddressForm();
      await loadAddresses();
      showMessage("Your address has been saved.");
    } catch (error) {
      showMessage(error.message || "Could not save this address.", true);
    }
  }

  async function deleteAddress(id) {
    if (!window.confirm("Delete this saved address?")) return;
    try {
      const response = await authFetch("/api/auth/addresses/" + encodeURIComponent(id), { method: "DELETE" });
      await responseData(response, "Could not delete this address.");
      await loadAddresses();
      showMessage("Your address has been deleted.");
    } catch (error) {
      showMessage(error.message || "Could not delete this address.", true);
    }
  }

  addressForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!addressForm.reportValidity()) return;
    saveAddress(addressForm.elements.id.value, addressPayload(addressForm));
  });
  document.getElementById("cancelAddressEdit").addEventListener("click", resetAddressForm);

  async function loadAccountOrders() {
    const state = document.getElementById("accountOrdersState");
    const list = document.getElementById("accountOrdersList");
    try {
      const response = await authFetch("/api/orders/mine");
      const data = await responseData(response, "Could not load your orders.");
      if (!Array.isArray(data)) throw new Error("The orders API returned an invalid response.");
      list.replaceChildren();
      data.forEach(function (order) {
        if (typeof window.renderDatabaseOrder === "function") {
          list.appendChild(window.renderDatabaseOrder(order));
        }
      });
      state.textContent = data.length ? data.length + (data.length === 1 ? " order in your account." : " orders in your account.") : "Orders placed while signed in will appear here.";
    } catch (error) {
      state.textContent = error.message || "Could not load your orders.";
      state.classList.add("is-error");
    }
  }

  async function loadServiceRequests() {
    const state = document.getElementById("accountServicesState");
    const list = document.getElementById("accountServicesList");
    try {
      const response = await authFetch("/api/auth/service-requests");
      const data = await responseData(response, "Could not load your service requests.");
      if (!Array.isArray(data)) throw new Error("The service requests API returned an invalid response.");
      list.replaceChildren();
      data.forEach(function (request) {
        const card = document.createElement("article");
        card.className = "account-record-card";
        const heading = document.createElement("h3");
        heading.textContent = request.serviceType + " · " + request.status;
        const detail = document.createElement("p");
        detail.textContent = new Date(request.createdAt).toLocaleDateString("en-IN") + " · " + request.message;
        card.append(heading, detail);
        list.appendChild(card);
      });
      state.textContent = data.length ? data.length + (data.length === 1 ? " request saved." : " requests saved.") : "Service requests you send while signed in will appear here.";
    } catch (error) {
      state.textContent = error.message || "Could not load your service requests.";
      state.classList.add("is-error");
    }
  }

  function localWishlist() {
    try {
      const value = JSON.parse(localStorage.getItem("alfaWishlist") || "[]");
      return Array.isArray(value) ? value.map(function (item) { return String(item && item.id ? item.id : item); }).filter(Boolean).slice(0, 200) : [];
    } catch (error) {
      return [];
    }
  }

  async function loadWishlist() {
    const state = document.getElementById("accountWishlistState");
    const list = document.getElementById("accountWishlistList");
    try {
      const pending = localWishlist();
      for (const id of pending) {
        const response = await authFetch("/api/auth/wishlist/" + encodeURIComponent(id), { method: "POST" });
        await responseData(response, "Could not sync your saved products.");
      }
      if (pending.length) localStorage.removeItem("alfaWishlist");
      const response = await authFetch("/api/auth/wishlist");
      const products = await responseData(response, "Could not load your wishlist.");
      if (!Array.isArray(products)) throw new Error("The wishlist API returned an invalid response.");
      list.replaceChildren();
      products.forEach(function (product) {
        const card = document.createElement("article");
        card.className = "account-record-card account-wishlist-card";
        const title = document.createElement("a");
        title.href = "product.html?id=" + encodeURIComponent(product.id);
        title.textContent = product.name || "Product";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Remove";
        remove.addEventListener("click", async function () {
          try {
            const result = await authFetch("/api/auth/wishlist/" + encodeURIComponent(product.id), { method: "DELETE" });
            await responseData(result, "Could not remove this product.");
            await loadWishlist();
          } catch (error) {
            showMessage(error.message || "Could not remove this product.", true);
          }
        });
        card.append(title, remove);
        list.appendChild(card);
      });
      state.textContent = products.length ? products.length + (products.length === 1 ? " saved product." : " saved products.") : "Save products from the catalogue to find them here.";
    } catch (error) {
      state.textContent = error.message || "Could not load your wishlist.";
      state.classList.add("is-error");
    }
  }

  function loadDashboard() {
    resetAddressForm();
    loadAddresses().catch(function (error) {
      addressList.textContent = error.message || "Could not load your saved addresses.";
    });
    loadAccountOrders();
    loadServiceRequests();
    loadWishlist();
  }

  document.getElementById("resendVerificationButton").addEventListener("click", async function () {
    try {
      const response = await authFetch("/api/auth/resend-verification", { method: "POST" });
      const data = await responseData(response, "Could not send a verification email.");
      showMessage(data.message || "A new verification link has been sent.");
    } catch (error) {
      showMessage(error.message || "Could not send a verification email.", true);
    }
  });

  document.getElementById("logoutButton").addEventListener("click", function () {
    logout();
    showLogin();
    loginForm.reset();
    signupForm.reset();
    showMessage("You have been signed out.");
  });

  window.addEventListener("alfa-auth-expired", function (event) {
    showLogin();
    showMessage(event.detail && event.detail.message || "Your session expired. Please sign in again.", true);
  });

  signupForm.elements.phone.addEventListener("input", function (event) {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
  });
  document.getElementById("profilePhone").addEventListener("input", function (event) {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
  });

  if (resetToken) {
    loginView.hidden = false;
    profileView.hidden = true;
    selectTab("reset");
  } else {
    verifyEmailLink().finally(function () {
      getUser().then(function (user) {
        if (user) showProfile(user);
        else if (typeof getAuthExpiredMessage === "function") {
          const expiredMessage = getAuthExpiredMessage();
          if (expiredMessage) showMessage(expiredMessage, true);
        }
      }).catch(function (error) {
        showMessage(error.message || "Could not load your account.", true);
      });
    });
  }
})();
