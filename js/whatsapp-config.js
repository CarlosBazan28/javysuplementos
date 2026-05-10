const JAVY_WHATSAPP_NUMBER = "50763932305";

function openJavyWhatsapp(message) {
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${JAVY_WHATSAPP_NUMBER}?text=${encodedMessage}`;
  window.open(url, "_blank");
}
