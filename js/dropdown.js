/* ============================================================================
   javyDropdown — mejora visual de <select> nativos en un dropdown propio.
   El <select> queda como FUENTE DE VERDAD (oculto): se sigue leyendo .value,
   escuchando "change" e iterando <option>. Al elegir en el dropdown se setea
   select.value y se dispara "change" (bubbles), así nada del flujo existente
   (cotización, carrito, filtros) se rompe.

   El menú se "portalea" al <body> con position:fixed al abrir, para escapar de
   contenedores con overflow/scroll (carrito, drawers, .ad-collapse).

   Uso:
     window.javyDropdown.enhanceSelects(root)  // tras pintar HTML con <select>
     window.javyDropdown.refresh(selectEl)     // tras cambiar value/options en sitio
   Excluir un select: atributo  data-jdd-skip
   ============================================================================ */
(function () {
  "use strict";

  let dropdownId = 0;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function chevron() {
    if (window.javyIcons && typeof window.javyIcons.get === "function") {
      return window.javyIcons.get("arrow-down", "jdd__ico");
    }
    return '<svg class="jdd__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  }

  function selectedLabel(select) {
    const opt = select.options[select.selectedIndex];
    return opt ? opt.textContent.trim() : "";
  }

  function optButton(opt) {
    const active = opt.selected;
    return `<button type="button" role="option" tabindex="-1" class="jdd__opt${active ? " is-active" : ""}"`
      + (opt.disabled ? " disabled" : "")
      + ` data-value="${esc(opt.value)}" aria-selected="${active ? "true" : "false"}">${esc(opt.textContent.trim())}</button>`;
  }

  function buildMenu(select) {
    let html = "";
    Array.from(select.children).forEach((node) => {
      if (node.tagName === "OPTGROUP") {
        html += `<div class="jdd__option-group" role="group" aria-label="${esc(node.label)}">`;
        html += `<div class="jdd__group" aria-hidden="true">${esc(node.label)}</div>`;
        html += Array.from(node.children).map(optButton).join("");
        html += "</div>";
      } else if (node.tagName === "OPTION") {
        html += optButton(node);
      }
    });
    return html;
  }

  function sync(dd) {
    const select = dd._select;
    dd._value.textContent = selectedLabel(select);
    dd._menu.innerHTML = buildMenu(select);
    dd._btn.disabled = select.disabled;
    dd._btn.setAttribute("aria-disabled", select.disabled ? "true" : "false");
    if (dd._label) {
      dd._btn.setAttribute("aria-label", `${dd._label}: ${selectedLabel(select)}`);
    }
  }

  function positionMenu(dd) {
    const r = dd._btn.getBoundingClientRect();
    const menu = dd._menu, gap = 6, padding = 8;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const width = Math.min(Math.round(r.width), Math.max(0, viewportWidth - padding * 2));
    const left = Math.min(
      Math.max(padding, Math.round(r.left)),
      Math.max(padding, viewportWidth - width - padding)
    );
    menu.style.position = "fixed";
    menu.style.left = left + "px";
    menu.style.width = width + "px";
    menu.style.maxWidth = `calc(100vw - ${padding * 2}px)`;
    menu.style.right = "auto";
    menu.style.zIndex = "1000";
    const below = window.innerHeight - r.bottom;
    const need = Math.min(menu.scrollHeight, 320) + gap;
    if (below < need && r.top > below) {           // no cabe abajo y hay más espacio arriba → desplegar hacia arriba
      menu.style.top = "auto";
      menu.style.bottom = Math.round(window.innerHeight - r.top + gap) + "px";
      menu.style.maxHeight = Math.max(80, Math.round(r.top - gap - padding)) + "px";
    } else {
      menu.style.bottom = "auto";
      menu.style.top = Math.round(r.bottom + gap) + "px";
      menu.style.maxHeight = Math.max(80, Math.min(320, Math.round(below - gap - padding))) + "px";
    }
  }

  function enabledOptions(dd) {
    return Array.from(dd._menu.querySelectorAll(".jdd__opt:not(:disabled)"));
  }

  function focusOption(dd, index) {
    const items = enabledOptions(dd);
    if (!items.length) return;
    const safeIndex = Math.min(Math.max(index, 0), items.length - 1);
    items[safeIndex].focus({ preventScroll: true });
    items[safeIndex].scrollIntoView({ block: "nearest" });
  }

  function close(dd, restoreFocus) {
    if (!dd.classList.contains("is-open")) return;
    dd.classList.remove("is-open");
    dd._btn.setAttribute("aria-expanded", "false");
    const menu = dd._menu;
    menu.hidden = true;
    menu.removeAttribute("style");       // limpiar el posicionamiento del portal
    dd.appendChild(menu);                // devolver el menú dentro del wrapper
    if (dd._onDoc) { document.removeEventListener("click", dd._onDoc); dd._onDoc = null; }
    if (dd._onKey) { document.removeEventListener("keydown", dd._onKey, true); dd._onKey = null; }
    if (dd._onScroll) {
      window.removeEventListener("scroll", dd._onScroll, true);
      dd._onScroll = null;
    }
    if (dd._onResize) {
      window.removeEventListener("resize", dd._onResize);
      dd._onResize = null;
    }
    window.clearTimeout(dd._typeaheadTimer);
    dd._typeahead = "";
    if (restoreFocus) dd._btn.focus({ preventScroll: true });
  }

  function open(dd, preferredIndex) {
    document.querySelectorAll(".jdd.is-open").forEach((o) => { if (o !== dd) close(o); });
    sync(dd);
    dd.classList.add("is-open");
    dd._btn.setAttribute("aria-expanded", "true");
    const menu = dd._menu;
    document.body.appendChild(menu);     // portal: escapa overflow/clipping de ancestros
    menu.hidden = false;
    positionMenu(dd);
    const items = enabledOptions(dd);
    const activeIndex = items.findIndex((item) => item.classList.contains("is-active"));
    focusOption(dd, preferredIndex == null ? Math.max(activeIndex, 0) : preferredIndex);
    dd._onDoc = (e) => { if (!dd.contains(e.target) && !menu.contains(e.target)) close(dd); };
    dd._onKey = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close(dd, true);
    };
    dd._onScroll = (e) => {
      if (e.target === menu || menu.contains(e.target)) return;
      close(dd);
    };
    document.addEventListener("click", dd._onDoc);
    document.addEventListener("keydown", dd._onKey, true);
    window.addEventListener("scroll", dd._onScroll, true);
    dd._onResize = () => close(dd);
    window.addEventListener("resize", dd._onResize);
  }

  function labelText(select) {
    const textFromLabel = (label) => {
      const clone = label.cloneNode(true);
      clone.querySelectorAll("select").forEach((node) => node.remove());
      return clone.textContent.trim();
    };
    const ariaLabel = select.getAttribute("aria-label");
    if (ariaLabel) return ariaLabel.trim();
    const labelledBy = select.getAttribute("aria-labelledby");
    if (labelledBy) {
      const text = labelledBy.split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() || "")
        .filter(Boolean)
        .join(" ");
      if (text) return text;
    }
    if (select.labels?.length) return textFromLabel(select.labels[0]);
    const wrappingLabel = select.closest("label");
    if (wrappingLabel) return textFromLabel(wrappingLabel);
    const directLabel = select.parentElement?.querySelector(":scope > label");
    return directLabel ? directLabel.textContent.trim() : "";
  }

  function focusAfterTrigger(dd, backwards) {
    const selector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled]):not([type='hidden'])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");
    const focusables = Array.from(document.querySelectorAll(selector)).filter((element) => {
      if (element === dd._select || dd._menu.contains(element)) return false;
      if (element.matches("[tabindex='-1'], [aria-hidden='true']")) return false;
      if (element.closest("[hidden], [inert]")) return false;
      const style = window.getComputedStyle(element);
      return style.visibility !== "hidden" && style.display !== "none" && element.getClientRects().length > 0;
    });
    const currentIndex = focusables.indexOf(dd._btn);
    const target = focusables[currentIndex + (backwards ? -1 : 1)];
    if (target) target.focus({ preventScroll: true });
  }

  function enhance(select) {
    if (!select || select.dataset.jddDone === "1" || select.hasAttribute("data-jdd-skip")) return;
    select.dataset.jddDone = "1";

    const dd = document.createElement("div");
    dd.className = "jdd";
    dd._select = select;
    select._jdd = dd;

    const aria = labelText(select);
    dd._label = aria;
    const menuId = `jdd-menu-${++dropdownId}`;
    dd.innerHTML =
      `<button type="button" class="jdd__btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="${menuId}"` +
        (aria ? ` aria-label="${esc(aria)}"` : "") + '>' +
        '<span class="jdd__value"></span>' +
        '<span class="jdd__chev">' + chevron() + '</span>' +
      '</button>' +
      `<div class="jdd__menu" id="${menuId}" role="listbox" tabindex="-1" hidden></div>`;

    select.parentNode.insertBefore(dd, select);
    dd.appendChild(select);              // el select queda dentro del wrapper, oculto por CSS
    select.setAttribute("tabindex", "-1");
    select.setAttribute("aria-hidden", "true");

    dd._btn = dd.querySelector(".jdd__btn");
    dd._menu = dd.querySelector(".jdd__menu");
    dd._value = dd.querySelector(".jdd__value");
    dd._typeahead = "";
    dd._typeaheadTimer = null;
    sync(dd);

    Array.from(select.labels || []).forEach((label) => {
      label.addEventListener("click", (event) => {
        if (event.target === select) return;
        event.preventDefault();
        dd._btn.focus({ preventScroll: true });
      });
    });

    dd._btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (select.disabled) return;
      dd.classList.contains("is-open") ? close(dd) : open(dd);
    });
    dd._btn.addEventListener("keydown", (e) => {
      if (select.disabled || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const items = enabledOptions(dd);
      const target = e.key === "ArrowUp" || e.key === "End" ? Math.max(items.length - 1, 0) : 0;
      if (!dd.classList.contains("is-open")) open(dd, target);
      else focusOption(dd, target);
    });
    dd._menu.addEventListener("click", (e) => {
      const opt = e.target.closest(".jdd__opt");
      if (!opt || opt.disabled) return;
      const val = opt.getAttribute("data-value");
      if (select.value !== val) {
        select.value = val;
        close(dd, true);
        select.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        close(dd, true);
      }
      if (document.body.contains(dd)) sync(dd);
    });
    dd._menu.addEventListener("keydown", (e) => {
      const items = enabledOptions(dd);
      if (!items.length) return;
      const current = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        focusOption(dd, (current + step + items.length) % items.length);
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        focusOption(dd, e.key === "Home" ? 0 : items.length - 1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        document.activeElement?.click();
      } else if (e.key === "Tab") {
        e.preventDefault();
        const backwards = e.shiftKey;
        close(dd);
        focusAfterTrigger(dd, backwards);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        dd._typeahead += e.key.toLocaleLowerCase();
        window.clearTimeout(dd._typeaheadTimer);
        dd._typeaheadTimer = window.setTimeout(() => { dd._typeahead = ""; }, 500);
        const start = Math.max(current, -1);
        const ordered = items.slice(start + 1).concat(items.slice(0, start + 1));
        const match = ordered.find((item) =>
          item.textContent.trim().toLocaleLowerCase().startsWith(dd._typeahead)
        );
        if (match) match.focus({ preventScroll: true });
      }
    });
    // si otro código cambia el select y dispara change, reflejarlo
    select.addEventListener("change", () => { if (document.body.contains(dd)) sync(dd); });
  }

  function enhanceSelects(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll("select").forEach(enhance);
  }

  function refresh(select) {
    if (select && select._jdd && document.body.contains(select._jdd)) sync(select._jdd);
  }

  function destroy(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll(".jdd").forEach((dd) => close(dd));
  }

  function closeAll() {
    document.querySelectorAll(".jdd.is-open").forEach((dd) => close(dd));
  }

  window.javyDropdown = { enhance, enhanceSelects, refresh, destroy, closeAll };
})();
