(function () {
  const grid = document.getElementById("catalogGrid");
  const search = document.getElementById("catalogSearch");
  const category = document.getElementById("categoryFilter");
  const brand = document.getElementById("brandFilter");
  const capacity = document.getElementById("capacityFilter");
  const sort = document.getElementById("sortFilter");
  const resultCount = document.getElementById("catalogResultCount");
  const filterToggle = document.getElementById("catalogFiltersToggle");
  const filterCount = document.getElementById("catalogFilterCount");
  const filterBackdrop = document.getElementById("catalogFiltersBackdrop");
  const filterClose = document.getElementById("catalogFiltersClose");
  const filterReset = document.getElementById("catalogFiltersReset");
  const filterShow = document.getElementById("catalogFiltersShow");
  const activeFilters = document.getElementById("catalogActiveFilters");
  const chips = Array.from(document.querySelectorAll(".chip[data-filter]"));
  const params = new URLSearchParams(window.location.search);
  const categoryParam = params.get("category") || "";
  const queryParam = params.get("q") || "";

  const categoryLabels = {
    platform: "Platform scales",
    counter: "Counter scales",
    label: "Label printing",
    portable: "Portable & precision",
    sealing: "Sealing machines",
  };
  const categoryValues = Array.from(new Set(products.map(function (product) {
    return String(product.category || "").trim();
  }).filter(Boolean))).sort(function (a, b) { return a.localeCompare(b); });
  categoryValues.forEach(function (value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = categoryLabels[value] || value.replace(/[-_]+/g, " ").replace(/\b\w/g, function (letter) {
      return letter.toUpperCase();
    });
    category.appendChild(option);
  });
  if (categoryValues.includes(categoryParam)) category.value = categoryParam;
  search.value = queryParam;

  const brands = Array.from(new Set(products.map(function (product) {
    return String(product.brand || "").trim();
  }).filter(Boolean))).sort(function (a, b) { return a.localeCompare(b); });
  brands.forEach(function (name) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    brand.appendChild(option);
  });

  const capacities = Array.from(new Set(products.map(function (product) {
    const value = String(product.capacity || "").trim();
    return value && value.indexOf("XX") === -1 ? value : "";
  }).filter(Boolean))).sort(function (a, b) {
    const left = parseFloat(a);
    const right = parseFloat(b);
    return Number.isFinite(left) && Number.isFinite(right) ? left - right : a.localeCompare(b);
  });
  capacities.forEach(function (value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    capacity.appendChild(option);
  });

  function filteredProducts() {
    const query = search.value.trim().toLowerCase();
    const selectedCategory = category.value;
    const selectedBrand = brand.value;
    const selectedCapacity = capacity.value;
    const results = products.filter(function (product) {
      const searchValue = [product.name, product.brand, product.category, product.description, product.usedFor, product.capacity, product.accuracy]
        .join(" ").toLowerCase();
      return (!query || searchValue.includes(query)) &&
        (!selectedCategory || product.category === selectedCategory) &&
        (!selectedBrand || product.brand === selectedBrand) &&
        (!selectedCapacity || product.capacity === selectedCapacity);
    });

    if (sort.value === "name") {
      results.sort(function (a, b) { return String(a.name || "").localeCompare(String(b.name || "")); });
    } else if (sort.value === "price-low" || sort.value === "price-high") {
      results.sort(function (a, b) {
        const aPrice = getNumericPrice(a.price);
        const bPrice = getNumericPrice(b.price);
        if (aPrice === null) return 1;
        if (bPrice === null) return -1;
        return sort.value === "price-low" ? aPrice - bPrice : bPrice - aPrice;
      });
    }
    return results;
  }

  function render() {
    const results = filteredProducts();
    chips.forEach(function (chip) {
      const active = (category.value || "all") === chip.dataset.filter;
      chip.classList.toggle("active", active);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
    });
    grid.replaceChildren();
    resultCount.textContent = results.length + (results.length === 1 ? " product" : " products");
    const activeCount = [category.value, brand.value, capacity.value, sort.value !== "default" ? sort.value : ""].filter(Boolean).length;
    filterCount.textContent = String(activeCount);
    filterCount.hidden = activeCount === 0;
    filterShow.textContent = "Show " + results.length + (results.length === 1 ? " product" : " products");
    activeFilters.replaceChildren();
    [
      [category, "Category"],
      [brand, "Brand"],
      [capacity, "Capacity"],
      [sort.value !== "default" ? sort : null, "Sort"],
    ].forEach(function (entry) {
      const control = entry[0];
      if (!control || !control.value) return;
      const option = control.options[control.selectedIndex];
      const chip = document.createElement("button");
      chip.type = "button";
      chip.textContent = entry[1] + ": " + (option ? option.textContent : control.value) + " ×";
      chip.setAttribute("aria-label", "Remove " + entry[1].toLowerCase() + " filter");
      chip.addEventListener("click", function () {
        control.value = control === sort ? "default" : "";
        render();
      });
      activeFilters.appendChild(chip);
    });
    if (!results.length) {
      const empty = document.createElement("div");
      empty.className = "catalog-empty";
      empty.innerHTML = "<h2>No products match your search.</h2><p>Try a different search or clear one or more filters.</p>";
      grid.appendChild(empty);
      return;
    }
    results.forEach(function (product) {
      grid.appendChild(createProductCard(product));
    });
  }

  [search, category, brand, capacity, sort].forEach(function (control) {
    control.addEventListener("input", render);
    control.addEventListener("change", render);
  });

  function setFilterSheetOpen(open) {
    filterBackdrop.classList.toggle("open", open);
    filterToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("filters-open", open);
  }
  filterToggle.addEventListener("click", function () {
    if (!window.matchMedia("(max-width: 700px)").matches) {
      category.focus();
      return;
    }
    setFilterSheetOpen(!filterBackdrop.classList.contains("open"));
  });
  filterClose.addEventListener("click", function () { setFilterSheetOpen(false); });
  filterBackdrop.addEventListener("click", function (event) {
    if (event.target === filterBackdrop) setFilterSheetOpen(false);
  });
  filterReset.addEventListener("click", function () {
    search.value = "";
    category.value = "";
    brand.value = "";
    capacity.value = "";
    sort.value = "default";
    render();
  });
  filterShow.addEventListener("click", function () { setFilterSheetOpen(false); });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && filterBackdrop.classList.contains("open")) setFilterSheetOpen(false);
  });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      category.value = chip.dataset.filter === "all" ? "" : chip.dataset.filter;
      render();
    });
  });

  render();
})();
