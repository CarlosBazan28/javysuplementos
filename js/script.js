const productos = [
  {
    id: "creatina-nutrex-60",
    nombre: "Creatina Nutrex - 60 Servidas",
    descripcion: "Monohidrato de creatina pura para fuerza y rendimiento.",
    precio: 15.99,
    imagen: "img/products/creatine-nutrex-60srv.png",
  },
  {
    id: "creatina-nutrex-fruit-punch-60",
    nombre: "Creatina Nutrex - 60 Servidas (Sabor Fruit Punch)",
    descripcion: "Creatina micronizada con sabor Fruit Punch para mejor experiencia.",
    precio: 16.99,
    imagen: "img/products/creatine-fruit-punch-60srv.png",
  },
  {
    id: "lcarnitina-nutrex",
    nombre: "L-Carnitina Nutrex",
    descripcion: "Ayuda a convertir la grasa en energía y mejora la resistencia.",
    precio: 19.99,
    imagen: "img/products/lcarnite-60caps.png",
  },
  {
    id: "whey-nutrex-2lb",
    nombre: "Whey Nutrex 2lb",
    descripcion: "Proteína de suero premium ideal para la recuperación muscular.",
    precio: 29.99,
    imagen: "img/products/whey-nutrex-2lb.png",
  },
  {
    id: "whey-nutrex-5lb",
    nombre: "Whey Nutrex 5lb",
    descripcion: "Mayor rendimiento con proteína de alta pureza y excelente sabor.",
    precio: 54.99,
    imagen: "img/products/whey-nutrex-5lb.png",
  },
  {
    id: "isofit-nutrex-2lb",
    nombre: "Isofit Nutrex 2lb",
    descripcion: "Aislado de suero 100% puro, rápida absorción y alto valor biológico.",
    precio: 42.99,
    imagen: "img/products/isofit-2lb-nutrex.png",
  },
  {
    id: "isofit-nutrex-5lb",
    nombre: "Isofit Nutrex 5lb",
    descripcion: "Aislado de suero ultra premium para resultados profesionales.",
    precio: 79.99,
    imagen: "img/products/isofit-5lb-nutrex.png",
  },
  {
    id: "iso100-2lb",
    nombre: "ISO 100 2lb",
    descripcion: "Proteína hidrolizada Dymatize para máxima digestión y pureza.",
    precio: 43.99,
    imagen: "img/products/iso100-2lb.png",
  },
  {
    id: "iso100-5lb",
    nombre: "ISO 100 5lb",
    descripcion: "Versión avanzada de ISO 100 con proteína ultra filtrada.",
    precio: 79.99,
    imagen: "img/products/iso100-5lb.png",
  },
  {
    id: "lipo6-black-intense",
    nombre: "Lipo 6 Black Intense Nutrex",
    descripcion: "Termogénico potente para energía, enfoque y quema de grasa extrema.",
    precio: 29.99,
    imagen: "img/products/lipo-6-black-60caps.png",
  },
];

const lista = document.getElementById("top-products__list");

productos.forEach((p) => {
  const card = document.createElement("article");
  card.classList.add("product-card");

  card.innerHTML = `
        <img src="${p.imagen}" alt=${p.nombre} class="product-card__img"  loading="lazy" />

        <div class="product-card__info">
          <h3 class="product-card__name">${p.nombre}</h3>
          <p class="product-card__price">${p.precio}</p>
          <p class="product-card__disclaimer">Disponibilidad sujeta a confirmación por WhatsApp</p>
        </div>

        <div class="product-card__actions">
          <button class="product-card__btn product-card__btn--buy">Whatsapp</button>
          <button class="product-card__btn product-card__btn--info">Más información</button>  
        </div>
    `;

  
  const btnWhatsapp = card.querySelector(".product-card__btn--buy");
  btnWhatsapp.addEventListener("click", () => {
    const mensaje = encodeURIComponent(
      `Hola Javy, quiero más información sobre: ${p.nombre}`
    );
    window.open(`https://wa.me/50763932305?text=${mensaje}`, "_blank");
  });

  const btnInfo = card.querySelector(".product-card__btn--info");
  btnInfo.addEventListener("click", () => {
    window.location.href = `product-page.html?id=${encodeURIComponent(p.id)}`;
  });

  lista.appendChild(card);
});
