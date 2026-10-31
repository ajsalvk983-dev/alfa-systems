const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const product = products.find(function (p) {
  return p.id === productId;
});

const box = document.getElementById("productDetail");

const CATEGORY_LABELS = {
  platform: "Platform scales",
  counter: "Counter scales",
  label: "Label printing",
  portable: "Portable & precision",
  sealing: "Sealing machines"
};

let detailQty = 1;

// "XX kg" or empty means "not filled in yet", so we don't show it to customers
function hasValue(v) {
  return v && String(v).trim() !== "" && String(v).indexOf("XX") === -1;
}

function buildSpecRows(p) {
  const rows = [];
  if (p.brand) rows.push(["Brand", p.brand]);
  if (CATEGORY_LABELS[p.category]) rows.push(["Category", CATEGORY_LABELS[p.category]]);
  if (hasValue(p.capacity)) rows.push(["Capacity", p.capacity]);
  if (hasValue(p.accuracy)) rows.push(["Accuracy", p.accuracy]);
  Object.keys(p.specs || {}).forEach(function (key) {
    rows.push([key, p.specs[key]]);
  });
  if (hasValue(p.usedFor)) rows.push(["Best for", p.usedFor]);
  return rows;
}

function renderRelated(p) {
  const related = products
    .filter(function (x) {
      return x.category === p.category && x.id !== p.id;
    })
    .concat(
      products.filter(function (x) {
        return x.category !== p.category;
      })
    )
    .slice(0, 4);

  return related
    .map(function (x) {
      return (
        createProductCard(x).outerHTML
      );
    })
    .join("");
}

if (!product) {
  box.innerHTML =
    '<div class="pd-missing"><h3>Product not found</h3>' +
    '<a href="products.html" class="btn btn-primary">Back to products</a></div>';
} else {
  const images = product.images && product.images.length ? product.images : [product.image];
  const categoryLabel = CATEGORY_LABELS[product.category] || "Products";
  const currentPrice = getNumericPrice(product.price);
  const discount = getDiscount(product);

  const thumbs =
    images.length > 1
      ? '<div class="pd-thumbs">' +
        images
          .map(function (src, i) {
            return (
              '<button type="button" class="pd-thumb' + (i === 0 ? " active" : "") + '" onclick="showImage(' + i + ')" aria-label="Photo ' + (i + 1) + '">' +
              '<img src="' + esc(cld(src, 160)) + '" alt="" /></button>'
            );
          })
          .join("") +
        "</div>"
      : "";

  const features = (product.features || [])
    .map(function (f) {
      return "<li>" + esc(f) + "</li>";
    })
    .join("");

  const specRows = buildSpecRows(product)
    .map(function (row) {
      return "<tr><th>" + esc(row[0]) + "</th><td>" + esc(row[1]) + "</td></tr>";
    })
    .join("");

  const quickFacts = [];
  if (hasValue(product.capacity)) quickFacts.push("<b>" + esc(product.capacity) + "</b> capacity");
  if (hasValue(product.accuracy)) quickFacts.push("<b>" + esc(product.accuracy) + "</b> accuracy");
  const quickFactsHtml = quickFacts.length
    ? '<div class="pd-facts">' + quickFacts.map(function (f) { return "<span>" + f + "</span>"; }).join("") + "</div>"
    : "";

  box.innerHTML =
    '<nav class="pd-crumbs" aria-label="Breadcrumb">' +
    '<a href="alfa.html">Home</a><span>/</span>' +
    '<a href="products.html?category=' + encodeURIComponent(product.category || "") + '">' + esc(categoryLabel) + "</a><span>/</span>" +
    "<b>" + esc(product.name) + "</b></nav>" +

    '<div class="pd-main">' +
      '<div class="pd-gallery">' +
        '<div class="pd-photo"><img id="pdMainImg" src="' + esc(cld(images[0], 900)) + '" alt="' + esc(product.name) + '" /></div>' +
        thumbs +
      "</div>" +

      '<div class="pd-info">' +
        '<p class="pd-brand">' + esc(product.brand || "") + "</p>" +
        '<h1 class="pd-title">' + esc(product.name) + "</h1>" +
        '<p class="pd-desc">' + esc(hasValue(product.usedFor) ? "Suitable for " + product.usedFor + "." : product.description) + "</p>" +
        quickFactsHtml +

        '<div class="pd-price">' +
          '<div class="pd-price-line"><strong>' +
            (currentPrice === null
              ? (typeof product.price === "string" && product.price.trim() ? formatPrice(product.price) : "Ask price")
              : formatPrice(currentPrice)) +
          "</strong>" +
          (discount ? '<s>' + formatPrice(currentPrice + discount.amount) + '</s><span class="pd-discount">' + discount.percent + "% off</span>" : "") +
          "</div>" +
          "<small>" + esc(product.priceNote || "Price and availability will be confirmed by ALFA SYSTEMS.") + "</small>" +
        "</div>" +

        '<div class="pd-buy">' +
          '<div class="pd-qty">' +
            '<button type="button" onclick="changeDetailQty(-1)" aria-label="Decrease quantity">&minus;</button>' +
            '<span id="pdQty">1</span>' +
            '<button type="button" onclick="changeDetailQty(1)" aria-label="Increase quantity">+</button>' +
          "</div>" +
          '<div class="pd-actions">' +
            '<button type="button" class="pd-btn pd-btn-solid" onclick="buyNow()"><i class="fa-solid fa-arrow-right"></i> Buy now</button>' +
            '<button type="button" class="pd-btn pd-btn-outline" onclick="addDetailToCart()">Add to cart</button>' +
          "</div>" +
        "</div>" +

        '<div class="pd-notes">' +
          '<div class="pd-note"><i class="fa-solid fa-scale-balanced" aria-hidden="true"></i><div><b>Best for</b><span>' + esc(hasValue(product.usedFor) ? product.usedFor : "Retail, commercial and industrial weighing applications") + "</span></div></div>" +
          '<div class="pd-note"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i><div><b>Need help choosing?</b><span><a href="https://wa.me/' + Whatsapp_nmbr + '?text=' + encodeURIComponent("Hello, I need help choosing " + product.name) + '" target="_blank" rel="noopener">Chat with ALFA SYSTEMS on WhatsApp</a></span></div></div>' +
        "</div>" +
      "</div>" +
    "</div>" +

    '<section class="pd-overview">' +
      "<h2>Product description</h2>" +
      "<p>" + esc(product.description) + "</p>" +
      (hasValue(product.usedFor) ? "<p><strong>Recommended use:</strong> " + esc(product.usedFor) + "</p>" : "") +
    "</section>" +

    '<div class="pd-details">' +
      '<section class="pd-section">' +
        "<h2>Key features</h2>" +
        '<ul class="pd-features">' + features + "</ul>" +
      "</section>" +
      '<section class="pd-section">' +
        "<h2>Full specifications</h2>" +
        '<table class="pd-specs"><tbody>' + specRows + "</tbody></table>" +
      "</section>" +
    "</div>" +

    '<section class="pd-section pd-related">' +
      "<h2>You may also like</h2>" +
      '<div class="pd-related-row">' + renderRelated(product) + "</div>" +
    "</section>";

  document.title = product.name + " | ALFA SYSTEMS";
}

function showImage(i) {
  const images = product.images && product.images.length ? product.images : [product.image];
  document.getElementById("pdMainImg").src = cld(images[i], 900);
  document.querySelectorAll(".pd-thumb").forEach(function (t, idx) {
    t.classList.toggle("active", idx === i);
  });
}

function changeDetailQty(delta) {
  detailQty = Math.min(Math.max(detailQty + delta, 1), 99);
  document.getElementById("pdQty").textContent = detailQty;
}

function addDetailToCart() {
  const cart = load(CART_KEY);
  const existing = cart.find(function (item) {
    return item && ((product.id && String(item.id) === String(product.id)) || item.name === product.name);
  });
  if (existing) {
    mergeCatalogueData(existing, product);
    existing.qty = Math.min(getSafeQuantity(existing.qty) + detailQty, 99);
  } else {
    cart.push(cartItemFromProduct(product, detailQty));
  }
  save(CART_KEY, cart);
  updateBadge();
  showToast(product.name + " added to cart");
}

function buyNow() {
  addDetailToCart();
  window.location.href = "checkout.html";
}