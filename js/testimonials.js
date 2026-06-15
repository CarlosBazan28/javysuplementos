/**
 * Render de testimonios.
 * Toma la lista de window.TESTIMONIALS (js/testimonials-data.js) y arma una card
 * única por cada uno dentro de .stories-grid. No edites esto para agregar testimonios:
 * usa testimonials-data.js.
 */
(function () {
  "use strict";

  function escapeHTML(value = "") {
    return value
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Deriva 2 letras para el avatar a partir del nombre (ej. "Carlos M." -> "CM").
  function buildInitials(nombre = "") {
    const words = nombre.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "JS";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  function renderTags(tags) {
    if (!Array.isArray(tags) || tags.length === 0) return "";
    const items = tags
      .filter(Boolean)
      .map((tag) => `<span>${escapeHTML(tag)}</span>`)
      .join("");
    if (!items) return "";
    return `<div class="mini-tags" aria-label="Datos del testimonio">${items}</div>`;
  }

  // Bloque de fotos antes/después: solo si vienen AMBAS rutas.
  function renderPhotos(testimonial) {
    const { antes, despues, nombre = "" } = testimonial;
    if (!antes || !despues) return "";
    const who = escapeHTML(nombre);
    return `
      <div class="proof-photos">
        <figure class="proof-photo">
          <img src="${escapeHTML(antes)}" alt="Antes de ${who}" loading="lazy" />
          <figcaption>Antes</figcaption>
        </figure>
        <figure class="proof-photo">
          <img src="${escapeHTML(despues)}" alt="Después de ${who}" loading="lazy" />
          <figcaption>Después</figcaption>
        </figure>
      </div>`;
  }

  function renderCard(testimonial) {
    const nombre = escapeHTML(testimonial.nombre || "Cliente Javy");
    const texto = escapeHTML(testimonial.texto || "");
    const objetivo = testimonial.objetivo
      ? `<p class="story-card__type">${escapeHTML(testimonial.objetivo)}</p>`
      : "";
    const initials = escapeHTML(
      testimonial.iniciales || buildInitials(testimonial.nombre || "")
    );

    const photos = renderPhotos(testimonial);
    // Con fotos no mostramos avatar (la card lidera con la imagen).
    const avatar = photos
      ? ""
      : `<div class="story-avatar" aria-hidden="true">${initials}</div>`;

    return `
      <article class="story-card">
        ${photos}
        ${avatar}
        <div class="story-card__content">
          <p class="story-card__label">Experiencia de cliente</p>
          <h3>${nombre}</h3>
          ${objetivo}
          <p class="story-card__quote">${texto}</p>
          ${renderTags(testimonial.tags)}
        </div>
      </article>`;
  }

  function init() {
    const grid = document.querySelector(".stories-grid");
    if (!grid) return;

    const testimonials = Array.isArray(window.TESTIMONIALS)
      ? window.TESTIMONIALS
      : [];

    grid.innerHTML = testimonials.map(renderCard).join("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
