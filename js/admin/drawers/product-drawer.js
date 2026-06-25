/* ============================================================================
   Drawer de producto (CRÍTICO): formulario por secciones, cascada Familia→Tipo,
   imagen, chips de sabores/tags, objetivos, validación inline y guardado con
   sincronización de sabores. Comportamiento idéntico al monolito original.
   ============================================================================ */
import { state, catById, families, typesOf } from "../state.js";
import { PLACEHOLDER, HOME_MAX, GOAL_SUGGESTIONS } from "../config.js";
import { $, esc, ico } from "../helpers.js";
import { collapse, field, affix, switchRow, switchMarkup, chipTag, bindChips, confirmModal, toast } from "../ui.js";
import { requestRerender } from "../shell.js";
import { reloadProducts } from "../data.js";

// Arreglos de texto (beneficios/uso/descripción) ⇄ textarea (una línea por ítem).
const linesToText = (v) => Array.isArray(v) ? v.join("\n") : (v || "");
const textToLines = (v) => String(v || "").split("\n").map((s) => s.trim()).filter(Boolean);

export function openProductDrawer(product, opts = {}) {
  const isNew = !product || !product.id;
  const data = {
    id: product ? product.id : null,
    name: product ? product.name || "" : "",
    brand: product ? product.brand || "" : "",
    category_id: product ? product.category_id || "" : "",
    presentation: product ? product.presentation || "" : "",
    price: product && product.price ? String(product.price) : "",
    old_price: product && product.old_price ? String(product.old_price) : "",
    image: product ? (product.stored_image_url || product.image || "") : "",
    description_short: product ? product.description_short || "" : "",
    description_long: product ? product.description_long || "" : "",
    beneficios: product ? linesToText(product.beneficios) : "",
    uso: product ? linesToText(product.uso) : "",
    flavors: product ? (product.flavors || []).map((f) => ({ id: f.id || null, name: f.name, available: f.available !== false })) : [],
    noFlavor: product ? product.flavor_mode === "no_flavor" : false,
    tags: product ? [...(product.tags || [])] : [],
    goals: product ? [...(product.goals || [])] : [],
    available: product ? product.available !== false : true,
    featured: product ? !!product.featured : false,
    home: product ? !!product.show_on_home : false,
    home_order: product && product.home_order ? String(product.home_order) : "",
    updated_at: product ? product.updated_at : null,
  };
  // cascada: familia/tipo desde category_id
  let famId = "", typeId = "";
  if (data.category_id) {
    const cat = catById(data.category_id);
    if (cat) {
      if (cat.parent_id) { typeId = cat.id; famId = cat.parent_id; }
      else { famId = cat.id; }
    }
  }
  const draftImageFile = { file: null, cleared: false };
  let touched = false;
  let dirty = false;
  const markDirty = () => { dirty = true; };

  const host = $("#adminDrawerHost");
  const overlay = document.createElement("div");
  overlay.className = "ad-drawer-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  host.appendChild(overlay);

  const metaLine = (!isNew && product.updated_by)
    ? `${esc(product.brand || "")} · última edición por ${esc(product.updated_by)}`
    : (isNew ? (opts.duplicateOf ? `Copia de ${esc(opts.duplicateOf)}` : "Completá los datos esenciales") : esc(product.brand || "Editar producto"));

  function familyOptions() {
    return `<option value="">Elegir…</option>` + families().map((f) => `<option value="${esc(f.id)}"${f.id === famId ? " selected" : ""}>${esc(f.name)}</option>`).join("");
  }
  function typeOptions() {
    const ts = famId ? typesOf(famId) : [];
    return `<option value="">${famId ? "Elegir…" : "—"}</option>` + ts.map((t) => `<option value="${esc(t.id)}"${t.id === typeId ? " selected" : ""}>${esc(t.name)}</option>`).join("");
  }

  overlay.innerHTML = `
    <div class="ad-drawer__scrim" data-close></div>
    <div class="ad-drawer">
      <div class="ad-drawer__head">
        <div><h2>${isNew ? "Nuevo producto" : "Editar producto"}</h2><p data-meta>${metaLine}</p></div>
        <button class="ad-drawer__close" type="button" aria-label="Cerrar" data-close>${ico("x")}</button>
      </div>
      <div class="ad-drawer__body">
        ${collapse("1", "Información esencial", true, `
          ${field("Nombre del producto", true, `<input class="ad-input" data-f="name" value="${esc(data.name)}" placeholder="Ej. Isomorph 28 Whey Isolate" />`, "name")}
          ${field("Marca", false, `<input class="ad-input" data-f="brand" value="${esc(data.brand)}" placeholder="Ej. APS Nutrition" />`)}
          <div class="ad-field-row">
            ${field("Categoría", true, `<select class="ad-select" data-f="family" aria-label="Categoría">${familyOptions()}</select>`, "family")}
            ${field("Subcategoría", false, `<select class="ad-select" data-f="type" aria-label="Subcategoría" ${famId ? "" : "disabled"}>${typeOptions()}</select>`)}
          </div>
          ${field("Presentación", false, `<input class="ad-input" data-f="presentation" value="${esc(data.presentation)}" placeholder="Ej. 5 lb · 300 g · 30 serv" />`)}
        `)}
        ${collapse("2", "Precio y oferta", false, `
          <div class="ad-field-row">
            ${field("Precio actual", true, affix(`<input class="ad-input" inputmode="decimal" data-f="price" value="${esc(data.price)}" placeholder="0.00" />`), "price")}
            ${field("Precio anterior", false, affix(`<input class="ad-input" inputmode="decimal" data-f="old_price" value="${esc(data.old_price)}" placeholder="0.00" />`), "old_price", "Para mostrar oferta")}
          </div>
          <span class="ad-pill ad-pill--home" data-offer-pill style="justify-self:start;display:none"></span>
        `)}
        ${collapse("3", "Imagen", false, `<div data-image-slot></div>`)}
        ${collapse("4", "Sabores / variantes", false, `
          ${switchRow("noflavor", "Este producto no tiene sabores", "Se cotiza sin pedir sabor", data.noFlavor)}
          <div data-flavor-section${data.noFlavor ? " hidden" : ""}>
            ${field("Sabores", false, `
              <div class="ad-flavors" data-flavor-list></div>
              <div class="ad-flavor-add">
                <input class="ad-input" type="text" data-flavor-add placeholder="Agregar sabor (ej. Chocolate)" />
                <button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" data-flavor-add-btn>${ico("plus")}Agregar</button>
              </div>
            `, null, "Marcá cada sabor como disponible o agotado")}
          </div>
        `)}
        ${collapse("5", "Descripción y etiquetas", false, `
          ${field("Descripción corta", false, `<textarea class="ad-textarea" data-f="description_short" placeholder="Una línea que resuma el producto…">${esc(data.description_short)}</textarea>`)}
          ${field("Descripción larga (detalle)", false, `<textarea class="ad-textarea" data-f="description_long" placeholder="Texto completo para la página de detalle…">${esc(data.description_long)}</textarea>`)}
          ${field("Beneficios", false, `<textarea class="ad-textarea" data-f="beneficios" placeholder="Un beneficio por línea…">${esc(data.beneficios)}</textarea>`, null, "Una línea por beneficio")}
          ${field("Modo de uso", false, `<textarea class="ad-textarea" data-f="uso" placeholder="Una indicación por línea…">${esc(data.uso)}</textarea>`, null, "Una línea por indicación")}
          ${field("Tags", false, `<div class="ad-chips-input" data-tags>${data.tags.map(chipTag).join("")}<input type="text" placeholder="Ej. Energía" /></div>`, null, "Palabras clave para búsqueda")}
          ${field("Objetivos", false, `<div style="display:flex;flex-wrap:wrap;gap:8px" data-goals>${GOAL_SUGGESTIONS.concat(data.goals.filter((g) => !GOAL_SUGGESTIONS.includes(g))).map((g) => `<button type="button" class="ad-chip-toggle${data.goals.includes(g) ? " is-active" : ""}" data-goal="${esc(g)}">${esc(g)}</button>`).join("")}</div>`)}
        `)}
        ${collapse("6", "Disponibilidad y visibilidad", true, `
          <div>
            ${switchRow("available", "Disponible", "Visible y cotizable en la tienda", data.available)}
            ${switchRow("featured", "Destacado", "Resalta el producto en su categoría", data.featured)}
            ${switchRow("home", "Mostrar en inicio", "Aparece entre los productos del home (máx. " + HOME_MAX + ")", data.home)}
          </div>
          <div data-home-order-slot>${data.home ? field("Orden en inicio", false, `<input class="ad-input" inputmode="numeric" data-f="home_order" value="${esc(data.home_order)}" placeholder="Ej. 1" style="max-width:120px" />`, null, "Posición entre los destacados del home") : ""}</div>
        `)}
      </div>
      <div class="ad-drawer__foot">
        <button class="ad-btn ad-btn--ghost" type="button" data-close>Cancelar</button>
        ${isNew ? `<button class="ad-btn ad-btn--ghost" type="button" data-save-new title="Guardar y crear otro">${ico("plus")}Y otro</button>` : ""}
        <button class="ad-btn ad-btn--primary" type="button" data-save>${ico("save")}${isNew ? "Crear producto" : "Guardar cambios"}</button>
      </div>
    </div>`;

  if (window.javyIcons) window.javyIcons.enhance(overlay);
  if (window.javyDropdown) window.javyDropdown.enhanceSelects(overlay);
  document.body.style.overflow = "hidden";

  const get = (sel) => overlay.querySelector(sel);
  const fEl = (name) => overlay.querySelector(`[data-f="${name}"]`);

  // collapse toggles
  overlay.querySelectorAll(".ad-collapse__head").forEach((head) => head.addEventListener("click", () => {
    head.parentElement.classList.toggle("is-open");
  }));

  // close handlers — pide confirmación si hay cambios sin guardar
  function destroy() {
    if (window.javyDropdown) window.javyDropdown.destroy(overlay);
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  }
  async function close() {
    if (dirty && !(await confirmModal({ title: "Descartar cambios", body: "Tenés cambios sin guardar. ¿Querés descartarlos?", confirmLabel: "Descartar", danger: true }))) return;
    destroy();
  }
  const onKey = (e) => {
    if (e.key === "Escape" && !document.querySelector(".jdd.is-open")) close();
  };
  document.addEventListener("keydown", onKey);
  overlay.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));

  // cualquier cambio en el formulario marca el drawer como "sucio"
  overlay.querySelector(".ad-drawer__body").addEventListener("input", markDirty);
  overlay.querySelector(".ad-drawer__body").addEventListener("change", markDirty);

  // cascade
  fEl("family").addEventListener("change", (e) => {
    famId = e.target.value; typeId = "";
    const typeSel = fEl("type");
    typeSel.innerHTML = typeOptions();
    typeSel.disabled = !famId;
    if (window.javyDropdown) window.javyDropdown.refresh(typeSel); // re-sincroniza el dropdown
    if (touched) validate();
  });
  fEl("type").addEventListener("change", (e) => { typeId = e.target.value; });

  // offer pill live
  const updateOfferPill = () => {
    const price = Number(fEl("price").value);
    const old = Number(fEl("old_price").value);
    const pill = get("[data-offer-pill]");
    if (price > 0 && old > price) {
      pill.style.display = "inline-flex";
      pill.textContent = `Oferta -${Math.round((1 - price / old) * 100)}%`;
    } else { pill.style.display = "none"; }
  };
  fEl("price").addEventListener("input", () => { updateOfferPill(); if (touched) validate(); });
  fEl("old_price").addEventListener("input", () => { updateOfferPill(); if (touched) validate(); });
  updateOfferPill();

  // image slot
  const imageSlot = get("[data-image-slot]");
  function renderImage() {
    const showSrc = draftImageFile.file ? URL.createObjectURL(draftImageFile.file)
      : (draftImageFile.cleared ? "" : data.image);
    if (showSrc) {
      imageSlot.innerHTML = `<div class="ad-drop ad-drop--filled"><div class="ad-drop__preview"><img src="${esc(showSrc)}" alt="" /><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm ad-drop__change" data-img-change>${ico("upload")}Cambiar</button></div></div>
        <button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-img-clear style="margin-top:8px">${ico("trash")}Quitar imagen</button>
        <input type="file" accept="image/*" data-img-input hidden />`;
    } else {
      imageSlot.innerHTML = `<label class="ad-drop">${ico("upload")}<strong>Subir imagen del producto</strong><small>PNG o WebP con fondo transparente · tocá para elegir</small><input type="file" accept="image/*" data-img-input hidden /></label>`;
    }
    if (window.javyIcons) window.javyIcons.enhance(imageSlot);
    const input = imageSlot.querySelector("[data-img-input]");
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) { draftImageFile.file = file; draftImageFile.cleared = false; renderImage(); }
    });
    const changeBtn = imageSlot.querySelector("[data-img-change]");
    if (changeBtn) changeBtn.addEventListener("click", () => input.click());
    const clearBtn = imageSlot.querySelector("[data-img-clear]");
    if (clearBtn) clearBtn.addEventListener("click", async () => {
      const ok = await confirmModal({ title: "Quitar imagen", body: "La imagen se quitará al guardar. ¿Continuar?", confirmLabel: "Quitar" });
      if (!ok) return;
      draftImageFile.file = null; draftImageFile.cleared = true; renderImage();
    });
  }
  renderImage();

  // sabores con disponibilidad por sabor
  const flavorRows = data.flavors.map((f) => ({ id: f.id, name: f.name, available: f.available }));
  const flavorListEl = get("[data-flavor-list]");
  function renderFlavors() {
    flavorListEl.innerHTML = flavorRows.length
      ? flavorRows.map((f, i) => `
        <div class="ad-flavor-row">
          <span class="ad-flavor-row__name">${esc(f.name)}</span>
          ${switchMarkup(f.available, `data-flavor-toggle="${i}" aria-label="Disponible: ${esc(f.name)}"`)}
          <button class="ad-icon-btn ad-icon-btn--danger" type="button" data-flavor-del="${i}" title="Quitar">${ico("trash")}</button>
        </div>`).join("")
      : `<p class="ad-flavor-empty">Sin sabores todavía. Agregá uno abajo.</p>`;
    if (window.javyIcons) window.javyIcons.enhance(flavorListEl);
    flavorListEl.querySelectorAll("[data-flavor-toggle]").forEach((cb) => cb.addEventListener("change", () => {
      flavorRows[+cb.getAttribute("data-flavor-toggle")].available = cb.checked; markDirty();
    }));
    flavorListEl.querySelectorAll("[data-flavor-del]").forEach((b) => b.addEventListener("click", () => {
      flavorRows.splice(+b.getAttribute("data-flavor-del"), 1); renderFlavors(); markDirty();
    }));
  }
  renderFlavors();
  const addFlavorInput = get("[data-flavor-add]");
  function addFlavor() {
    const v = addFlavorInput.value.trim();
    addFlavorInput.value = "";
    if (!v) return;
    if (flavorRows.some((f) => f.name.toLowerCase() === v.toLowerCase())) { addFlavorInput.focus(); return; }
    flavorRows.push({ id: null, name: v, available: true });
    renderFlavors(); markDirty(); addFlavorInput.focus();
  }
  get("[data-flavor-add-btn]").addEventListener("click", addFlavor);
  addFlavorInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addFlavor(); } });

  // "sin sabor": oculta la lista de sabores
  const noFlavorSwitch = overlay.querySelector('[data-sw="noflavor"]');
  noFlavorSwitch.addEventListener("change", () => { get("[data-flavor-section]").hidden = noFlavorSwitch.checked; });

  // tags
  const tagNames = [...data.tags];
  bindChips(get("[data-tags]"), {
    onAdd: (n) => tagNames.push(n),
    onRemove: (n) => { const i = tagNames.findIndex((x) => x.toLowerCase() === n.toLowerCase()); if (i >= 0) tagNames.splice(i, 1); },
  });

  // goals toggles
  const goalSet = new Set(data.goals);
  get("[data-goals]").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-goal]");
    if (!btn) return;
    const g = btn.getAttribute("data-goal");
    if (goalSet.has(g)) { goalSet.delete(g); btn.classList.remove("is-active"); }
    else { goalSet.add(g); btn.classList.add("is-active"); }
    markDirty();
  });

  // home switch reveals order field
  const homeSwitch = overlay.querySelector('[data-sw="home"]');
  homeSwitch.addEventListener("change", () => {
    const slot = get("[data-home-order-slot]");
    slot.innerHTML = homeSwitch.checked
      ? field("Orden en inicio", false, `<input class="ad-input" inputmode="numeric" data-f="home_order" value="${esc(data.home_order)}" placeholder="Ej. 1" style="max-width:120px" />`, null, "Posición entre los destacados del home")
      : "";
  });

  // validation
  function errors() {
    const price = fEl("price").value.trim();
    const old = fEl("old_price").value.trim();
    return {
      name: !fEl("name").value.trim() ? "El nombre es obligatorio" : "",
      family: !famId ? "Elegí una familia" : "",
      price: !price ? "El precio es obligatorio" : (isNaN(+price) || +price <= 0) ? "Precio inválido" : "",
      old_price: old && (isNaN(+old) || +old <= +price) ? "Debe ser mayor al precio actual" : "",
    };
  }
  function validate() {
    const errs = errors();
    ["name", "family", "price", "old_price"].forEach((k) => {
      const slot = overlay.querySelector(`[data-err="${k}"]`);
      const inputName = k === "family" ? "family" : k;
      const input = overlay.querySelector(`[data-f="${inputName}"]`);
      if (slot) slot.innerHTML = errs[k] ? `${ico("x")}${esc(errs[k])}` : "";
      if (input) input.classList.toggle(input.tagName === "SELECT" ? "ad-select--invalid" : "ad-input--invalid", !!errs[k]);
    });
    return Object.values(errs).every((v) => !v);
  }

  // save
  async function doSave(createAnother) {
    touched = true;
    if (!validate()) {
      toast({ tone: "err", msg: "Revisá los campos marcados" });
      return;
    }
    // aviso de duplicado al crear (mismo nombre + marca)
    if (isNew) {
      const n = fEl("name").value.trim().toLowerCase();
      const b = fEl("brand").value.trim().toLowerCase();
      const dup = state.products.find((p) => (p.name || "").toLowerCase() === n && (p.brand || "").toLowerCase() === b);
      if (dup && !(await confirmModal({ title: "Producto duplicado", body: `Ya existe “${dup.name}”${dup.brand ? " de " + dup.brand : ""}. ¿Crear de todos modos?`, confirmLabel: "Crear igual" }))) return;
    }
    const saveBtn = get("[data-save]");
    const newBtn = get("[data-save-new]");
    saveBtn.disabled = true; if (newBtn) newBtn.disabled = true;
    saveBtn.textContent = "Guardando…";
    const noFlavor = noFlavorSwitch.checked;
    try {
      await saveProduct({
        isNew, data, famId, typeId, draftImageFile,
        values: {
          name: fEl("name").value.trim(),
          brand: fEl("brand").value.trim(),
          presentation: fEl("presentation").value.trim(),
          price: fEl("price").value.trim(),
          old_price: fEl("old_price").value.trim(),
          description_short: fEl("description_short").value.trim(),
          description_long: fEl("description_long").value.trim(),
          beneficios: textToLines(fEl("beneficios").value),
          uso: textToLines(fEl("uso").value),
          home_order: (overlay.querySelector('[data-f="home_order"]') || {}).value || "",
          available: overlay.querySelector('[data-sw="available"]').checked,
          featured: overlay.querySelector('[data-sw="featured"]').checked,
          home: overlay.querySelector('[data-sw="home"]').checked,
          flavors: noFlavor ? [] : flavorRows.map((f) => ({ name: f.name, available: f.available })),
          flavor_mode: noFlavor ? "no_flavor" : (flavorRows.length ? "has_flavors" : "needs_review"),
          tags: tagNames,
          goals: Array.from(goalSet),
        },
        originalFlavors: product ? (product.flavors || []) : [],
      });
      dirty = false;
      if (createAnother) { destroy(); openProductDrawer(null); }
      else close();
    } catch (e) {
      saveBtn.disabled = false; if (newBtn) newBtn.disabled = false;
      saveBtn.innerHTML = `${ico("save")}${isNew ? "Crear producto" : "Guardar cambios"}`;
      if (window.javyIcons) window.javyIcons.enhance(saveBtn);
      if (e.code === "CONFLICT") {
        const force = await confirmModal({ title: "Otro admin editó esto", body: "Otro administrador modificó este producto mientras lo editabas. ¿Querés sobrescribir sus cambios con los tuyos?", confirmLabel: "Sobrescribir", danger: true });
        if (force) { data.updated_at = null; doSave(createAnother); }
      } else {
        toast({ tone: "err", msg: "No se pudo guardar", sub: e.message });
      }
    }
  }
  get("[data-save]").addEventListener("click", () => doSave(false));
  const saveNewBtn = get("[data-save-new]");
  if (saveNewBtn) saveNewBtn.addEventListener("click", () => doSave(true));

  // focus first input
  setTimeout(() => { const f = fEl("name"); if (f) f.focus(); }, 30);
}

async function saveProduct(ctx) {
  const { isNew, data, famId, typeId, draftImageFile, values, originalFlavors } = ctx;
  const db = window.catalogDb;

  // imagen
  let imageUrl = data.image || "";
  let uploadedUrl = null;
  if (draftImageFile.file) {
    uploadedUrl = await db.uploadProductImage(draftImageFile.file);
    imageUrl = uploadedUrl;
  } else if (draftImageFile.cleared) {
    imageUrl = PLACEHOLDER;
  }

  // categoría: el tipo (hoja) si existe, si no la familia
  const leafId = typeId || famId || null;
  const leafCat = leafId ? catById(leafId) : null;

  const payload = {
    name: values.name,
    brand: values.brand,
    category: leafCat ? leafCat.name : (data.category || ""),
    category_id: leafId,
    price: values.price,
    old_price: values.old_price === "" ? null : values.old_price,
    presentation: values.presentation,
    image_url: imageUrl,
    description_short: values.description_short,
    description_long: values.description_long,
    beneficios: values.beneficios,
    uso: values.uso,
    flavor_mode: values.flavor_mode,
    available: values.available,
    is_available: values.available,
    featured: values.featured,
    is_featured: values.featured,
    show_on_home: values.home,
    home_order: values.home ? (values.home_order || null) : null,
    tags: values.tags,
    goals: values.goals,
  };

  let saved;
  try {
    if (isNew) {
      saved = await db.createProduct(payload);
    } else {
      saved = await db.updateProduct(data.id, payload, { expectedUpdatedAt: data.updated_at || undefined });
    }
  } catch (e) {
    if (uploadedUrl) await db.removeProductImage(uploadedUrl); // limpiar huérfana
    throw e;
  }

  // sincronizar sabores por nombre
  await syncFlavorsOnSave(saved.id, originalFlavors, values.flavors);

  await reloadProducts();
  toast({ tone: "ok", msg: isNew ? "Producto creado" : "Cambios guardados", sub: values.name });
  // re-render de la sección activa (equivale al if/else del monolito original)
  requestRerender();
}

async function syncFlavorsOnSave(productId, originalFlavors, desiredFlavors) {
  const db = window.catalogDb;
  const norm = (s) => String(s || "").trim().toLowerCase();

  // de-duplicar deseados por nombre, conservando disponibilidad
  const seen = new Set();
  const desired = [];
  for (const f of desiredFlavors || []) {
    const name = String(f.name || "").trim();
    if (!name || seen.has(norm(name))) continue;
    seen.add(norm(name));
    desired.push({ name, available: f.available !== false });
  }
  const desiredLower = desired.map((f) => norm(f.name));
  const origByName = new Map(originalFlavors.map((f) => [norm(f.name), f]));

  // borrar los quitados
  for (const f of originalFlavors) {
    if (f.id && !desiredLower.includes(norm(f.name))) {
      try { await db.deleteFlavor(f.id); } catch (_) {}
    }
  }
  // crear nuevos / actualizar disponibilidad de los que siguen
  for (const f of desired) {
    const existing = origByName.get(norm(f.name));
    if (!existing) {
      try { await db.createFlavor(productId, { name: f.name, available: f.available }); } catch (_) {}
    } else if (existing.id && (existing.available !== false) !== f.available) {
      try { await db.setFlavorAvailability(existing.id, f.available); } catch (_) {}
    }
  }
}
