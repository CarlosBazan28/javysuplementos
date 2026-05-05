const authView = document.getElementById("authView");
const adminView = document.getElementById("adminView");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutBtn = document.getElementById("logoutBtn");
const seedProductsBtn = document.getElementById("seedProductsBtn");
const newProductBtn = document.getElementById("newProductBtn");
const adminSearch = document.getElementById("adminSearch");
const adminCategoryFilter = document.getElementById("adminCategoryFilter");
const adminStatus = document.getElementById("adminStatus");
const adminProductList = document.getElementById("adminProductList");
const productForm = document.getElementById("productForm");
const editorTitle = document.getElementById("editorTitle");
const deleteProductBtn = document.getElementById("deleteProductBtn");
const flavorForm = document.getElementById("flavorForm");
const newFlavorName = document.getElementById("newFlavorName");
const newFlavorAvailable = document.getElementById("newFlavorAvailable");
const flavorList = document.getElementById("flavorList");

let adminProducts = [];
let selectedProduct = null;

function withTimeout(promise, ms = 12000, message = "La solicitud tardo demasiado. Revisa internet, Supabase o intenta de nuevo.") {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function setMessage(target, message, isError = false) {
  if (!target) return;
  target.textContent = message || "";
  target.style.color = isError ? "#ff8fa3" : "#a9b4c6";
}

function normalizeText(value = "") {
  return value.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseList(value = "") {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function listToInput(list = []) {
  return list.join(", ");
}

function fillCategoryFilter() {
  const categories = adminProducts
    .map((product) => product.category)
    .filter(Boolean)
    .filter((category, index, list) => list.indexOf(category) === index)
    .sort((a, b) => a.localeCompare(b, "es"));

  adminCategoryFilter.innerHTML = `
    <option value="todos">Todas las categorias</option>
    ${categories.map((category) => `<option>${category}</option>`).join("")}
  `;
}

function getFilteredProducts() {
  const query = normalizeText(adminSearch.value);
  const category = adminCategoryFilter.value;

  return adminProducts.filter((product) => {
    const categoryMatch = category === "todos" || product.category === category;
    const queryMatch = !query || normalizeText([
      product.name,
      product.brand,
      product.category,
      product.presentation,
    ].join(" ")).includes(query);

    return categoryMatch && queryMatch;
  });
}

function renderProductList() {
  const items = getFilteredProducts();
  adminProductList.innerHTML = items.map((product) => `
    <li>
      <button class="admin-product-item${selectedProduct?.id === product.id ? " is-active" : ""}" type="button" data-product-id="${product.id}">
        <strong>${product.name}</strong>
        <span>${product.brand || "Marca"} · ${product.category} · ${product.available ? "Disponible" : "Consultar stock"}</span>
      </button>
    </li>
  `).join("");
}

function resetProductForm() {
  selectedProduct = null;
  editorTitle.textContent = "Nuevo producto";
  deleteProductBtn.hidden = true;
  productForm.reset();
  productForm.elements.available.checked = true;
  productForm.elements.featured.checked = false;
  renderFlavors();
  renderProductList();
}

function selectProduct(product) {
  selectedProduct = product;
  editorTitle.textContent = product.name;
  deleteProductBtn.hidden = false;

  productForm.elements.name.value = product.name || "";
  productForm.elements.brand.value = product.brand || "";
  productForm.elements.category.value = product.category || "";
  productForm.elements.price.value = product.price || "";
  productForm.elements.presentation.value = product.presentation || "";
  productForm.elements.image_url.value = product.image === "img/products/product-placeholder.svg" ? "" : product.image || "";
  productForm.elements.description.value = Array.isArray(product.descripcion) ? product.descripcion.join("\n") : product.description || "";
  productForm.elements.tags.value = listToInput(product.tags);
  productForm.elements.goals.value = listToInput(product.goals);
  productForm.elements.available.checked = product.available !== false;
  productForm.elements.featured.checked = Boolean(product.featured);

  renderFlavors();
  renderProductList();
}

function collectProductData() {
  const formData = new FormData(productForm);
  return {
    name: formData.get("name"),
    brand: formData.get("brand"),
    category: formData.get("category"),
    price: formData.get("price"),
    presentation: formData.get("presentation"),
    image_url: formData.get("image_url"),
    description: formData.get("description"),
    tags: parseList(formData.get("tags") || ""),
    goals: parseList(formData.get("goals") || ""),
    available: productForm.elements.available.checked,
    featured: productForm.elements.featured.checked,
  };
}

function renderFlavors() {
  if (!selectedProduct?.id) {
    flavorList.innerHTML = `<li class="admin-message">Guarda o selecciona un producto para manejar sabores.</li>`;
    flavorForm.hidden = true;
    return;
  }

  flavorForm.hidden = false;
  const flavors = selectedProduct.flavors || [];
  flavorList.innerHTML = flavors.length ? flavors.map((flavor) => `
    <li class="admin-flavor-item" data-flavor-id="${flavor.id}">
      <input value="${flavor.name}" data-flavor-name />
      <label>
        <input type="checkbox" ${flavor.available !== false ? "checked" : ""} data-flavor-available />
        Disponible
      </label>
      <button type="button" data-save-flavor>Guardar</button>
      <button type="button" class="admin-danger" data-delete-flavor>Eliminar</button>
    </li>
  `).join("") : `<li class="admin-message">Este producto no tiene sabores.</li>`;
}

async function loadAdminProducts() {
  setMessage(adminStatus, "Cargando productos desde Supabase...");
  try {
    adminProducts = await withTimeout(
      window.catalogDb.getProductsWithFlavors({ cache: false, fallback: false }),
      12000,
      "El panel abrio, pero la carga de productos tardo demasiado. Revisa schema.sql y las politicas RLS."
    );
    fillCategoryFilter();
    renderProductList();
    setMessage(adminStatus, `${adminProducts.length} productos cargados.`);
  } catch (error) {
    adminProducts = [];
    fillCategoryFilter();
    renderProductList();
    setMessage(adminStatus, `No se pudo cargar Supabase: ${error.message}. Ejecuta schema.sql y revisa RLS/Auth.`, true);
  }
}

async function showAdmin() {
  setMessage(loginMessage, "Login correcto. Abriendo panel...");
  authView.hidden = true;
  authView.setAttribute("hidden", "");
  adminView.hidden = false;
  adminView.removeAttribute("hidden");
  resetProductForm();
  await loadAdminProducts();
}

async function checkSession() {
  if (!window.supabaseClient) {
    setMessage(loginMessage, "Supabase no esta disponible. Revisa el CDN o la conexion.", true);
    return;
  }

  try {
    const { data, error } = await withTimeout(
      supabaseClient.auth.getSession(),
      8000,
      "No se pudo revisar la sesion actual. Intenta entrar manualmente."
    );

    if (error) throw error;
    if (data.session) {
      await showAdmin();
    }
  } catch (error) {
    setMessage(loginMessage, error.message, true);
  }
}

async function handleLogin(event) {
  event?.preventDefault?.();
  setMessage(loginMessage, "Validando...");
  const submitButton = loginForm.querySelector("button[type='submit']");
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Entrando...";
  }

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    if (!email || !password) {
      throw new Error("Escribe el correo y la contrasena del usuario admin.");
    }

    if (!email.includes("@")) {
      throw new Error("El usuario de Supabase Auth debe entrar con formato de correo.");
    }

    if (!window.supabaseClient) {
      throw new Error("Supabase no esta disponible. Revisa el CDN o la conexion.");
    }

    const { data, error } = await withTimeout(
      supabaseClient.auth.signInWithPassword({ email, password })
    );

    if (error) throw error;
    if (!data?.session) {
      throw new Error("El login no devolvio una sesion activa. Revisa si el usuario esta confirmado en Supabase Auth.");
    }

    setMessage(loginMessage, "Login correcto. Preparando panel...");
    await showAdmin();
  } catch (error) {
    setMessage(loginMessage, error.message || "No se pudo iniciar sesion.", true);
  } finally {
    if (submitButton) {
      submitButton.disabled = !adminView.hidden;
      submitButton.textContent = adminView.hidden ? "Entrar" : "Sesion iniciada";
    }
  }
}

loginForm?.addEventListener("submit", handleLogin);
loginForm?.querySelector("button[type='submit']")?.addEventListener("click", (event) => {
  event.preventDefault();
  handleLogin(event);
});

logoutBtn?.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  adminView.hidden = true;
  adminView.setAttribute("hidden", "");
  authView.hidden = false;
  authView.removeAttribute("hidden");
  setMessage(loginMessage, "");
});

newProductBtn?.addEventListener("click", resetProductForm);
adminSearch?.addEventListener("input", renderProductList);
adminCategoryFilter?.addEventListener("change", renderProductList);

adminProductList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-product-id]");
  if (!button) return;
  const product = adminProducts.find((item) => item.id === button.dataset.productId);
  if (product) selectProduct(product);
});

productForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const productData = collectProductData();

  try {
    setMessage(adminStatus, "Guardando producto...");
    if (selectedProduct?.id) {
      selectedProduct = await window.catalogDb.updateProduct(selectedProduct.id, productData);
    } else {
      selectedProduct = await window.catalogDb.createProduct(productData);
    }

    await loadAdminProducts();
    const refreshed = adminProducts.find((product) => product.id === selectedProduct.id);
    if (refreshed) selectProduct(refreshed);
    setMessage(adminStatus, "Producto guardado.");
  } catch (error) {
    setMessage(adminStatus, error.message, true);
  }
});

deleteProductBtn?.addEventListener("click", async () => {
  if (!selectedProduct) return;
  const ok = window.confirm(`Eliminar ${selectedProduct.name}? Esta accion borra tambien sus sabores.`);
  if (!ok) return;

  try {
    await window.catalogDb.deleteProduct(selectedProduct.id);
    await loadAdminProducts();
    resetProductForm();
    setMessage(adminStatus, "Producto eliminado.");
  } catch (error) {
    setMessage(adminStatus, error.message, true);
  }
});

flavorForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedProduct?.id || !newFlavorName.value.trim()) return;

  try {
    await window.catalogDb.createFlavor(selectedProduct.id, {
      name: newFlavorName.value,
      available: newFlavorAvailable.checked,
    });
    newFlavorName.value = "";
    newFlavorAvailable.checked = true;
    await loadAdminProducts();
    selectProduct(adminProducts.find((product) => product.id === selectedProduct.id));
    setMessage(adminStatus, "Sabor agregado.");
  } catch (error) {
    setMessage(adminStatus, error.message, true);
  }
});

flavorList?.addEventListener("click", async (event) => {
  const item = event.target.closest("[data-flavor-id]");
  if (!item) return;

  const flavorId = item.dataset.flavorId;
  const name = item.querySelector("[data-flavor-name]")?.value || "";
  const available = item.querySelector("[data-flavor-available]")?.checked || false;

  try {
    if (event.target.closest("[data-save-flavor]")) {
      await window.catalogDb.updateFlavor(flavorId, { name, available });
      setMessage(adminStatus, "Sabor actualizado.");
    }

    if (event.target.closest("[data-delete-flavor]")) {
      const ok = window.confirm("Eliminar este sabor?");
      if (!ok) return;
      await window.catalogDb.deleteFlavor(flavorId);
      setMessage(adminStatus, "Sabor eliminado.");
    }

    await loadAdminProducts();
    selectProduct(adminProducts.find((product) => product.id === selectedProduct.id));
  } catch (error) {
    setMessage(adminStatus, error.message, true);
  }
});

seedProductsBtn?.addEventListener("click", async () => {
  const ok = window.confirm("Migrar productos locales a Supabase? Se evitaran duplicados usando legacy_id.");
  if (!ok) return;

  try {
    setMessage(adminStatus, "Migrando productos locales...");
    const result = await window.catalogDb.seedProductsFromLocalData();
    await loadAdminProducts();
    setMessage(adminStatus, `Migracion lista. Creados: ${result.created}. Omitidos: ${result.skipped}. Sabores: ${result.flavorsCreated}. Errores: ${result.errors.length}.`, Boolean(result.errors.length));
  } catch (error) {
    setMessage(adminStatus, error.message, true);
  }
});

checkSession();
