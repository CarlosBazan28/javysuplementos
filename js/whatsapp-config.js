const JAVY_WHATSAPP_NUMBER = "50763932305";

// Devuelve la URL de wa.me; el texto es opcional para enlaces de contacto directo.
function buildJavyWhatsappUrl(message = "") {
  const baseUrl = `https://wa.me/${JAVY_WHATSAPP_NUMBER}`;
  return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
}

// Abre WhatsApp y devuelve la referencia a la ventana (null si el navegador la bloquea),
// para que quien llame pueda ofrecer un enlace de respaldo.
function openJavyWhatsapp(message) {
  return window.open(buildJavyWhatsappUrl(message), "_blank");
}

// Hidrata enlaces declarativos para que el número solo exista en este archivo.
function hydrateJavyWhatsappLinks(root = document) {
  root.querySelectorAll("[data-javy-whatsapp]").forEach((link) => {
    const message = link.getAttribute("data-whatsapp-message") || "";
    link.href = buildJavyWhatsappUrl(message);

    if (link.hasAttribute("data-javy-phone")) {
      link.textContent = `+${JAVY_WHATSAPP_NUMBER.slice(0, 3)} ${JAVY_WHATSAPP_NUMBER.slice(3)}`;
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => hydrateJavyWhatsappLinks());
} else {
  hydrateJavyWhatsappLinks();
}
