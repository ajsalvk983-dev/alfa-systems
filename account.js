(function () {
  const loginView = document.getElementById("accountLogin");
  const profileView = document.getElementById("accountProfile");
  const message = document.getElementById("accountMessage");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const profileForm = document.getElementById("profileForm");
  const passwordForm = document.getElementById("passwordForm");
  let busy = false;

  function showMessage(text, isError) {
    message.textContent = text || "";
    message.classList.toggle("is-error", Boolean(isError));
    message.hidden = !text;
  }

  function setBusy(form, state, buttonText) {
    form.querySelectorAll("button, input").forEach(function (control) {
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
    showMessage("");
  }

  function showProfile(user) {
    loginView.hidden = true;
    profileView.hidden = false;
    document.getElementById("profileName").value = user.name;
    document.getElementById("profileEmail").value = user.email;
    document.getElementById("profileHeading").textContent = "Welcome, " + user.name;
    showMessage("");
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
      const data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      saveAuthSession(data);
      showProfile(data.user);
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
          email: document.getElementById("profileEmail").value.trim(),
        }),
      });
      const data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || "Could not update your profile.");
      setCurrentUser(data.user);
      showMessage("Your profile has been updated.");
      document.getElementById("profileHeading").textContent = "Welcome, " + data.user.name;
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
      const data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || "Could not update your password.");
      passwordForm.reset();
      showMessage("Your password has been changed.");
    } catch (error) {
      showMessage(error.message || "Could not update your password.", true);
    } finally {
      busy = false;
      setBusy(passwordForm, false);
    }
  });

  document.getElementById("logoutButton").addEventListener("click", function () {
    logout();
    profileView.hidden = true;
    loginView.hidden = false;
    loginForm.reset();
    signupForm.reset();
    selectTab("login");
    showMessage("You have been signed out.");
  });

  getUser().then(function (user) {
    if (user) showProfile(user);
  }).catch(function (error) {
    showMessage(error.message || "Could not load your account.", true);
  });
})();
