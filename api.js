const LIVE_API = "https://alfa-backend-mtwa.onrender.com";
const IS_LOCAL_HOST = /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)$/.test(window.location.hostname);
const USE_LOCAL_API = IS_LOCAL_HOST && new URLSearchParams(window.location.search).get("api") === "local";
const API_URL = USE_LOCAL_API ? "http://" + window.location.hostname + ":3000" : LIVE_API;


async function loadProducts() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, 12000);
    const res = await fetch(API_URL + "/api/products", { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error("API " + res.status);
    const data = await res.json();
    if (Array.isArray(data) && data.length) products.splice(0, products.length, ...data);
  } catch (err) {
    console.warn("Using products.js (API not reachable):", err.message);
  }
}