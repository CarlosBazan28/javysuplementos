(function () {
  try {
    if (localStorage.getItem("javy-theme") === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (error) {
    // Sin localStorage (modo privado, etc.): el sitio se queda en oscuro, su tema por defecto.
  }
})();
