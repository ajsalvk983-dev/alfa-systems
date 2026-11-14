let currentUser = null;
let currentUserRequest = null;
let authExpiredMessage = "";

function updateAccountIcons(user) {
  document.querySelectorAll(".account-link").forEach(function (link) {
    const icon = link.querySelector("i");
    let initial = link.querySelector(".account-initial");
    if (!initial) {
      initial = document.createElement("span");
      initial.className = "account-initial";
      initial.setAttribute("aria-hidden", "true");
      link.appendChild(initial);
    }
    initial.textContent = user && user.name ? user.name.trim().charAt(0).toUpperCase() : "";
    initial.hidden = !initial.textContent;
    if (icon) icon.hidden = Boolean(user);
    link.setAttribute("aria-label", user ? "Account: " + user.name : "Account");
    link.title = user ? user.name : "Account";
  });
}

function setCurrentUser(user) {
  currentUser = user || null;
  currentUserRequest = null;
  updateAccountIcons(currentUser);
  window.dispatchEvent(new CustomEvent("alfa-auth-change", { detail: currentUser }));
}

async function authFetch(path, options) {
  const request = Object.assign({}, options || {});
  const headers = new Headers(request.headers || {});
  if (request.body && !(request.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  request.headers = headers;
  request.credentials = "include";
  const response = await fetch(API_URL + path, request);
  if (response.status === 401) {
    setCurrentUser(null);
    authExpiredMessage = "Your session expired. Please sign in again.";
    window.dispatchEvent(new CustomEvent("alfa-auth-expired", {
      detail: { message: authExpiredMessage },
    }));
  }
  return response;
}

function getAuthExpiredMessage() {
  const message = authExpiredMessage;
  authExpiredMessage = "";
  return message;
}

async function getUser(forceRefresh) {
  if (!forceRefresh && currentUser) return currentUser;
  if (!forceRefresh && currentUserRequest) return currentUserRequest;
  currentUserRequest = (async function () {
    const response = await authFetch("/api/auth/me");
    if (response.status === 401) return null;
    if (!response.ok) {
      const body = await response.json().catch(function () { return {}; });
      throw new Error(body.error || "Could not verify your account.");
    }
    const data = await response.json();
    if (!data || !data.user || !data.user.id || !data.user.name || !data.user.email) {
      throw new Error("The account API returned an invalid response.");
    }
    setCurrentUser(data.user);
    return currentUser;
  })();
  return currentUserRequest;
}

function saveAuthSession(data) {
  if (!data || !data.user) {
    throw new Error("The account API returned an incomplete sign-in response.");
  }
  setCurrentUser(data.user);
}

async function logout() {
  try {
    await authFetch("/api/auth/logout", { method: "POST" });
  } finally {
    setCurrentUser(null);
  }
}

updateAccountIcons(null);
getUser().catch(function (error) {
  console.warn("Could not verify the customer session:", error.message);
});
