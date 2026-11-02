const AUTH_TOKEN_KEY = "alfaAuthToken";
let currentUser = null;
let currentUserRequest = null;
let authExpiredMessage = "";

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

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
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", "Bearer " + token);
  if (request.body && !(request.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  request.headers = headers;
  const response = await fetch(API_URL + path, request);
  if (response.status === 401 && token) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
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
  if (!getAuthToken()) {
    setCurrentUser(null);
    return null;
  }
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
  if (!data || typeof data.token !== "string" || !data.token || !data.user) {
    throw new Error("The account API returned an incomplete sign-in response.");
  }
  localStorage.setItem(AUTH_TOKEN_KEY, data.token);
  setCurrentUser(data.user);
}

function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  setCurrentUser(null);
}

updateAccountIcons(null);
getUser().catch(function (error) {
  console.warn("Could not verify the customer session:", error.message);
});
