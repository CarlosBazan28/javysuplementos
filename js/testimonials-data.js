/**
 * Testimonios de Javy Suplementos.
 *
 * ====== CÓMO AGREGAR UN TESTIMONIO ======
 * Copia un bloque { ... } completo, pégalo dentro de la lista y rellena los campos.
 * No hace falta tocar el HTML ni el CSS: la página se arma sola desde esta lista.
 *
 * Campos OBLIGATORIOS:
 *   nombre   → nombre del cliente (ej. "Carlos M.")
 *   texto    → lo que el cliente cuenta de su experiencia
 *
 * Campos OPCIONALES (puedes borrarlos si no aplican):
 *   objetivo  → su meta o tipo de experiencia (ej. "Ganar masa muscular")
 *   tags      → lista de etiquetas cortas (ej. ["Proteína", "Creatina"])
 *   iniciales → 2 letras para el avatar; si no la pones, se sacan del nombre
 *   antes     → ruta de la foto "antes" (ej. "img/testimonials/juan-antes.webp")
 *   despues   → ruta de la foto "después"
 *               (las fotos solo se muestran si pones AMBAS, antes y después)
 * =========================================
 */
window.TESTIMONIALS = [
  {
    nombre: "Carlos M.",
    objetivo: "Ganar masa muscular",
    texto:
      "Organizó su suplementación para apoyar fuerza, recuperación y consumo diario de proteína.",
    tags: ["Proteína", "Creatina", "Volumen"],
  },
  {
    nombre: "Luis A.",
    objetivo: "Primera compra de suplementos",
    texto:
      "Me ayudaron a elegir lo básico para empezar sin comprar productos que no necesitaba.",
    tags: ["Proteína", "Creatina", "Guía de uso"],
  },
  {
    nombre: "Diana M.",
    objetivo: "Energía y rendimiento",
    texto:
      "Recibió recomendación para mantener energía en sus entrenamientos y mejorar la recuperación durante su etapa de definición.",
    tags: ["Aminoácidos", "Quemador", "Recuperación"],
  },
  {
    nombre: "Cliente principiante",
    objetivo: "Producto recomendado: proteína ISO",
    texto:
      "Buscaba una proteína ligera para complementar su alimentación y recibió una opción según su presupuesto y objetivo.",
    tags: ["Proteína ISO", "Asesoría", "Presupuesto"],
    iniciales: "ISO",
  },
  {
    nombre: "Javier R.",
    objetivo: "Cotización por WhatsApp",
    texto:
      "Cotizó varios productos, confirmó disponibilidad y recibió orientación antes de cerrar su pedido.",
    tags: ["WhatsApp", "Disponibilidad", "Entrega"],
  },
];
