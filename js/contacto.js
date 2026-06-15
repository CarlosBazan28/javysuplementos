(function () {
  const form = document.getElementById("contactQuoteForm");
  const whatsappBtn = document.getElementById("contactWhatsappBtn");
  const notice = document.getElementById("contactFormNotice");

  if (!form) return;

  const fields = {
    name: form.elements.name,
    email: form.elements.email,
    phone: form.elements.phone,
    product: form.elements.product,
    message: form.elements.message,
  };

  const errors = {
    name: document.getElementById("contactNameError"),
    email: document.getElementById("contactEmailError"),
    phone: document.getElementById("contactPhoneError"),
    product: document.getElementById("contactProductError"),
    message: document.getElementById("contactMessageError"),
  };

  function isValidEmail(value = "") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  // Teléfono panameño: 8 dígitos (móvil/fijo), tolerante a +507, espacios y guiones.
  function isValidPaPhone(value = "") {
    const digits = value.replace(/[\s\-().]/g, "").replace(/^\+?507/, "");
    return /^[0-9]{7,8}$/.test(digits);
  }

  function setError(name, message = "") {
    const field = fields[name];
    const error = errors[name];
    if (!field || !error) return;

    field.setAttribute("aria-invalid", message ? "true" : "false");
    error.textContent = message;
  }

  function getValue(name) {
    return fields[name]?.value?.trim() || "";
  }

  function validate() {
    let isValid = true;

    if (!getValue("name")) {
      setError("name", "Escribe tu nombre completo.");
      isValid = false;
    } else {
      setError("name");
    }

    if (!getValue("email")) {
      setError("email", "Escribe tu correo electronico.");
      isValid = false;
    } else if (!isValidEmail(getValue("email"))) {
      setError("email", "Escribe un correo valido.");
      isValid = false;
    } else {
      setError("email");
    }

    if (!getValue("phone")) {
      setError("phone", "Escribe tu teléfono.");
      isValid = false;
    } else if (!isValidPaPhone(getValue("phone"))) {
      setError("phone", "Escribe un teléfono panameño válido (8 dígitos).");
      isValid = false;
    } else {
      setError("phone");
    }

    if (!getValue("product")) {
      setError("product", "Indica el producto que quieres cotizar.");
      isValid = false;
    } else {
      setError("product");
    }

    setError("message");
    return isValid;
  }

  function buildMessage() {
    return [
      "Hola Javy, quiero solicitar una cotizacion.",
      "",
      "Datos:",
      `Nombre: ${getValue("name")}`,
      `Correo: ${getValue("email")}`,
      `Telefono: ${getValue("phone")}`,
      "",
      "Producto de interes:",
      getValue("product"),
      "",
      "Mensaje adicional:",
      getValue("message") || "Sin mensaje adicional.",
      "",
      "Quiero saber precio, disponibilidad y opciones de entrega.",
    ].join("\n");
  }

  const WHATSAPP_NUMBER = (typeof JAVY_WHATSAPP_NUMBER !== "undefined" && JAVY_WHATSAPP_NUMBER) || "50763932305";

  // Abre WhatsApp y devuelve la ventana (null si el navegador la bloquea).
  function openWhatsapp(message) {
    if (typeof openJavyWhatsapp === "function") {
      return openJavyWhatsapp(message);
    }
    return window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
  }

  // Muestra el aviso del formulario; opcionalmente con un enlace de respaldo a WhatsApp.
  function showNotice(text, fallbackMessage) {
    if (!notice) return;
    notice.textContent = "";

    notice.appendChild(document.createTextNode(text));
    if (fallbackMessage) {
      notice.appendChild(document.createTextNode(" "));
      const link = document.createElement("a");
      link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(fallbackMessage)}`;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Toca aquí para abrirlo.";
      notice.appendChild(link);
    }
    notice.hidden = false;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (notice) notice.hidden = true;

    if (!validate()) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    const message = buildMessage();
    const win = openWhatsapp(message);

    if (win) {
      showNotice("Solicitud lista. Se abrió WhatsApp con tu cotización para enviarla.");
    } else {
      // Pop-up bloqueado: ofrecer enlace directo como respaldo.
      showNotice("No pudimos abrir WhatsApp automáticamente.", message);
    }
  });

  Object.keys(fields).forEach((name) => {
    fields[name]?.addEventListener("input", () => {
      if (fields[name].getAttribute("aria-invalid") === "true") validate();
      if (notice && !notice.hidden) notice.hidden = true;
    });
  });

  whatsappBtn?.addEventListener("click", () => {
    const message = "Hola Javy, quiero cotizar suplementos y consultar disponibilidad.";
    if (!openWhatsapp(message)) {
      showNotice("No pudimos abrir WhatsApp automáticamente.", message);
    }
  });

  // Precarga "Producto de interés" desde ?product= (p. ej. enlace desde una ficha).
  const productParam = new URLSearchParams(location.search).get("product");
  if (productParam && fields.product && !fields.product.value) {
    fields.product.value = productParam.trim();
  }
})();
