(function () {
  const whatsappMessage = "Hola Javy, quiero recibir orientacion para elegir suplementos segun mi objetivo.";
  const whatsappLinks = document.querySelectorAll("[data-about-whatsapp]");
  const locationDialog = document.getElementById("locationChooser");
  const locationOpeners = document.querySelectorAll("[data-open-location]");
  const firstLocationLink = locationDialog?.querySelector("[data-location-first]");
  let lastLocationTrigger = null;

  const whatsappUrl = typeof buildJavyWhatsappUrl === "function"
    ? buildJavyWhatsappUrl(whatsappMessage)
    : "";

  whatsappLinks.forEach((link) => {
    if (whatsappUrl) {
      link.href = whatsappUrl;
      return;
    }

    link.removeAttribute("href");
    link.setAttribute("aria-disabled", "true");
    link.title = "WhatsApp no esta disponible en este momento";
  });

  function openLocationDialog(trigger) {
    if (!locationDialog) return;
    lastLocationTrigger = trigger;

    if (typeof locationDialog.showModal === "function") {
      locationDialog.showModal();
    } else {
      locationDialog.setAttribute("open", "");
    }

    window.setTimeout(() => firstLocationLink?.focus(), 0);
  }

  locationOpeners.forEach((trigger) => {
    trigger.addEventListener("click", () => openLocationDialog(trigger));
  });

  locationDialog?.addEventListener("close", () => {
    lastLocationTrigger?.focus();
  });
})();
