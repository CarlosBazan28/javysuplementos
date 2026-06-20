# Javy Supplements

Web para venta y cotizacion de suplementos. El proyecto incluye catalogo publico, paginas informativas, carrito de cotizacion por WhatsApp y panel administrativo conectado a Supabase.

## Estado del proyecto

- Frontend en HTML, CSS y JavaScript vanilla.
- No usa framework externo.
- Supabase se usa para productos, sabores, perfiles admin e imagenes.
- WhatsApp se usa como canal principal para cotizaciones.
- La prioridad de UI es mobile primero, luego tablet y desktop.

## Funcionalidades principales

- Home con productos destacados.
- Catalogo de suplementos con filtros y seleccion de sabores.
- Pagina de detalle de producto.
- Carrito/cotizacion por WhatsApp.
- Pagina de contacto con mapa.
- Pagina de testimonios.
- Login de administrador.
- Panel administrativo privado.
- Gestion de productos.
- Gestion de sabores y variantes.
- Clasificacion de productos por tipo de sabor:
  - Tiene sabores.
  - Sin sabor.
  - Pendiente.
- Gestion de productos visibles en inicio.
- Filtros administrativos para revisar productos incompletos.

## Estructura de archivos

```text
.
|-- admin.html                  # Panel administrativo
|-- contacto.html               # Pagina de contacto
|-- index.html                  # Home
|-- login.html                  # Login admin
|-- product-page.html           # Detalle de producto
|-- supplements-page.html       # Catalogo publico
|-- testimonios.html            # Testimonios
|-- css/
|   |-- admin-dashboard.css     # Estilos del panel admin
|   |-- base.css                # Base global
|   |-- tokens.css              # Variables visuales
|   |-- components/             # Componentes compartidos
|   `-- pages/                  # Estilos por pagina
|-- js/
|   |-- admin-dashboard.js      # Logica principal del admin
|   |-- auth.js                 # Autenticacion admin
|   |-- cart.js                 # Carrito/cotizacion
|   |-- db.js                   # Acceso a Supabase
|   |-- icons.js                # Sistema de iconos
|   |-- include-nav.js          # Navegacion reutilizable
|   |-- product-page.js         # Logica detalle de producto
|   |-- script.js               # Home
|   |-- supplements.js          # Catalogo publico
|   `-- supabase-config.js      # Configuracion publica de Supabase
|-- img/
|   |-- icons/                  # Logos, favicon e iconos
|   `-- products/               # Imagenes de productos
|-- Editables/
|   `-- nav.html                # Navegacion compartida
`-- supabase/
    `-- schema.sql              # Referencia de esquema local
```

## Paginas principales

- `index.html`: experiencia inicial y productos destacados.
- `supplements-page.html`: catalogo completo de suplementos.
- `product-page.html`: detalle de producto seleccionado.
- `contacto.html`: formulario de cotizacion, datos de contacto y mapa.
- `testimonios.html`: cards de testimonios.
- `login.html`: acceso de administrador.
- `admin.html`: panel administrativo.

## Panel administrativo

El panel admin permite:

- Crear, editar y eliminar productos.
- Subir o definir URL de imagen de producto.
- Marcar productos como disponibles o no disponibles.
- Marcar productos como destacados.
- Definir productos visibles en el home.
- Gestionar sabores por producto.
- Agregar precio, stock, presentacion y disponibilidad por sabor.
- Clasificar productos como `Tiene sabores`, `Sin sabor` o `Pendiente`.
- Filtrar productos por revision:
  - Sin imagen.
  - Sin sabor.
  - Faltan sabores.
  - Sin sabores activos.
  - Revisar tipo de sabor.
  - No disponibles.
  - Precio vacio.
  - Destacados.

## Supabase

La configuracion publica esta en:

```text
js/supabase-config.js
```

Reglas importantes:

- Solo usar claves publicas tipo `anon`.
- No guardar service role keys en el frontend.
- Mantener reglas RLS y permisos del proyecto en Supabase.
- Las imagenes nuevas se suben al bucket configurado para productos.
- La tabla `products` guarda los datos principales.
- La tabla `product_flavors` guarda sabores y variantes.

## Como correr localmente

Este proyecto puede abrirse como archivos HTML, pero para evitar problemas de rutas es mejor usar un servidor local.

Opcion con Node:

```bash
npx serve .
```

Luego abrir:

```text
http://localhost:3000
```

Si el puerto cambia, usar el puerto que indique la terminal.

## Comandos de verificacion

Antes de hacer commit, ejecutar:

```bash
git status --short
git diff --check
node --check js/admin-dashboard.js
node --check js/cart.js
node --check js/include-nav.js
node --check js/icons.js
```

Si se modifica una pagina publica, revisar tambien el archivo JS relacionado:

```bash
node --check js/script.js
node --check js/supplements.js
node --check js/product-page.js
```

## Checklist visual antes de publicar

- No hay scroll horizontal en mobile.
- Header y navegacion funcionan en mobile y desktop.
- Los botones principales mantienen el mismo estilo.
- El catalogo carga productos correctamente.
- Productos sin imagen muestran placeholder.
- Productos sin sabor muestran `Sin sabor`.
- Productos pendientes muestran texto de consulta cuando aplica.
- El carrito genera mensaje correcto para WhatsApp.
- Contacto muestra formulario, datos y mapa.
- Admin carga despues del login.
- Filtros del admin abren y cierran correctamente.
- El modal de filtros se ve en mobile.
- Gestion de sabores permite agregar, editar y eliminar.

## Convenciones del proyecto

- Mantener HTML, CSS y JavaScript vanilla.
- No agregar frameworks externos sin una razon fuerte.
- Reutilizar clases y patrones existentes.
- Priorizar mobile primero.
- Mantener nombres de clases coherentes:
  - `admin-*` para panel administrativo.
  - `product-*` para productos.
  - `cart-*` para carrito.
- No redisenar el sitio completo para cambios pequenos.
- No guardar secretos privados en archivos frontend.
- Si se cambia CSS/JS con cache en navegador, actualizar el query string del archivo en HTML.

## Flujo de trabajo recomendado

1. Revisar estado:

```bash
git status --short --branch
```

2. Implementar cambios pequenos y enfocados.

3. Validar sintaxis:

```bash
git diff --check
node --check js/admin-dashboard.js
```

4. Probar visualmente mobile primero.

5. Hacer commit con mensaje claro:

```bash
git add <archivos>
git commit -m "Descripcion clara del cambio"
git push origin carlos
```

## Pendientes recomendados

- Agregar pruebas automatizadas basicas para carrito y filtros.
- Documentar tablas de Supabase con mas detalle.
- Crear guia corta para cargar productos nuevos.
- Mejorar SEO por pagina.
- Agregar analitica.
- Conectar formularios a backend o automatizacion.
- Crear historial o auditoria de cambios del admin.

