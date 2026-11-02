const LIVE_API = "https://alfa-backend-mtwa.onrender.com";
const IS_LOCAL_HOST = /^(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)$/.test(window.location.hostname);
const USE_LOCAL_API = IS_LOCAL_HOST && new URLSearchParams(window.location.search).get("api") === "local";
const API_URL = USE_LOCAL_API ? "http://" + window.location.hostname + ":3000" : LIVE_API;
let productLoadPromise = null;


function loadProducts() {
  if (productLoadPromise) return productLoadPromise;
  if (typeof products !== "undefined") {
    products.forEach(function (product) {
      product.price = null;
      product.oldPrice = null;
      product.priceNote = "";
    });
  }
  productLoadPromise = (async function () {
    let timer;
    try {
      const controller = new AbortController();
      timer = setTimeout(function () { controller.abort(); }, 12000);
      const response = await fetch(API_URL + "/api/products", { signal: controller.signal });
      if (!response.ok) throw new Error("API " + response.status);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("The products API returned an invalid response.");
      if (typeof products !== "undefined") products.splice(0, products.length, ...data);
      return true;
    } catch (error) {
      if (typeof products !== "undefined") {
        products.forEach(function (product) {
          product.price = null;
          product.oldPrice = null;
          product.priceNote = "";
        });
      }
      console.warn("Using products.js without prices (API not reachable):", error.message);
      return false;
    } finally {
      clearTimeout(timer);
    }
  })();
  return productLoadPromise;
}