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
      setError("phone", "Escribe tu telefono.");
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

  function openWhatsapp(message) {
    if (typeof openJavyWhatsapp === "function") {
      openJavyWhatsapp(message);
      return;
    }

    window.open(`https://wa.me/${JAVY_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    notice.hidden = true;

    if (!validate()) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    openWhatsapp(buildMessage());
    notice.textContent = "Solicitud lista. Se abrira WhatsApp con tu cotizacion para enviarla.";
    notice.hidden = false;
  });

  Object.keys(fields).forEach((name) => {
    fields[name]?.addEventListener("input", () => {
      if (fields[name].getAttribute("aria-invalid") === "true") validate();
      if (!notice.hidden) notice.hidden = true;
    });
  });

  whatsappBtn?.addEventListener("click", () => {
    openWhatsapp("Hola Javy, quiero cotizar suplementos y consultar disponibilidad.");
  });
})();
