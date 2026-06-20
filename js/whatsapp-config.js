const JAVY_WHATSAPP_NUMBER = "50763932305";

// Devuelve la URL de wa.me con el mensaje ya codificado.
function buildJavyWhatsappUrl(message) {
  const number = (typeof JAVY_WHATSAPP_NUMBER !== "undefined" && JAVY_WHATSAPP_NUMBER) || "50763932305";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// Abre WhatsApp y devuelve la referencia a la ventana (null si el navegador la bloquea),
// para que quien llame pueda ofrecer un enlace de respaldo.
function openJavyWhatsapp(message) {
  return window.open(buildJavyWhatsappUrl(message), "_blank");
}
