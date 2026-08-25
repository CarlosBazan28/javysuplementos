# Estándar de contenido de las fichas

Qué debe decir la ficha de un producto para publicarse. Aplica a **todos** los productos:
los que ya están y los que se agreguen desde hoy.

Lo verifica `scripts/validar-contenido.mjs`. Si el validador falla, el producto no sale.

---

## La regla que manda sobre todas

> **No inventar nada.**

Ya estaba escrita en [`revisar-manual.md`](revisar-manual.md); esto solo la formaliza. Si un
dato no se puede verificar, **se omite**. Una ficha corta y cierta vale más que una larga
con relleno: el relleno no vende, y un dato falso se paga con una devolución o con la
confianza del cliente.

---

## Antes de escribir: identidad confirmada

Sin estos tres campos no se escribe contenido. Son los que permiten buscar información
veraz; sin ellos cualquier texto es adivinanza.

| Campo | Qué tiene que ser | Qué NO vale |
|---|---|---|
| `brand` | El fabricante | El ingrediente (`Maltodextrin`, `Potassium`), el sabor, o el nombre del producto |
| `nombre` | El nombre exacto de la línea | Genérico (`Whey Protein` a secas) |
| `presentation` | Tamaño + servidas | Vacío |

Un producto sin identidad confirmada **no se llena**: va a la lista de revisión manual
hasta que alguien mire el envase.

---

## La plantilla

### 1. Descripción — 1 párrafo, 250–400 caracteres

Qué es, qué lo distingue y para quién es. **Debe incluir al menos un dato numérico de
etiqueta** (gramos de proteína, mg de cafeína, servidas). Ese número es la prueba de que
alguien miró el producto de verdad.

### 2. Beneficios — exactamente 4

Cada viñeta atada a un hecho del producto, no a una promesa. Una frase, punto final.

### 3. Modo de uso — exactamente 3 líneas

Dosis concreta · cuándo tomarlo · advertencia **solo si aplica a este producto**.

> Los 4 y el 3 no son arbitrarios: son los que ya cumplen, sin una sola excepción, los 62
> productos que quedaron bien escritos. La plantilla describe lo que funciona, no un ideal.

---

## Ejemplo aprobado

**Optimum Nutrition · Amino Energy · 270 g / 30 servidas**

> **Descripción**
> Lo que distingue a Amino Energy es que junta las dos cosas en un mismo polvo: 5 g de una
> mezcla de aminoácidos libres micronizados, con BCAA, EAA, taurina, glutamina, arginina,
> citrulina y beta-alanina, más 100 mg de cafeína de té verde y café verde por servida de
> dos medidas. El envase de 270 g rinde 30 servidas.
>
> **Beneficios**
> - Combina 5 g de aminoácidos con 100 mg de cafeína en una sola bebida.
> - La cafeína proviene de té verde y café verde, sin azúcar agregada.
> - La dosis se regula sumando o quitando medidas del envase.
> - Amplia variedad de sabores dentro de la misma línea.
>
> **Modo de uso**
> - Mezclar 2 medidas en unos 330 ml de agua fría.
> - Se toma antes, durante o después del entrenamiento.
> - Evitarlo cerca de la hora de dormir o si hay sensibilidad a estimulantes.

Por qué pasa: cada afirmación tiene un número o un hecho detrás, la advertencia aplica
(sí lleva cafeína), y no hay un solo adjetivo de folleto.

---

## Ejemplo rechazado

Esto estuvo publicado hasta el 2026-08-20:

> ~~ZMA 90 cápsulas es un producto de ZMA dentro de la categoría salud y bienestar.~~
> ~~Precio de catálogo: $22.00.~~
> ~~Modo de uso: Consultar la dosis indicada en la etiqueta.~~
> ~~Si tienes sensibilidad a **estimulantes**, consulta antes de usar.~~

Cuatro fallos en cuatro líneas:

1. **Tautología** — repite el nombre y la categoría; no informa nada.
2. **Precio en el texto** — se desactualizó. El producto costaba $15.50 y la ficha decía
   $22.00. Pasó en 28 productos a la vez.
3. **Modo de uso que no dice el modo de uso** — "consultar la etiqueta" es devolverle la
   pregunta al cliente.
4. **Advertencia falsa** — el ZMA no lleva estimulantes. Venía de copiar la plantilla de un
   pre-entreno. Había 35 productos con esta advertencia mal puesta.

---

## Prohibido

| No poner | Por qué |
|---|---|
| Precios | Se desactualiza solo. El precio vive en `price`, y ahí se muestra. |
| Lista de sabores | Ya se renderiza desde `product_flavors`. Duplicarla la desincroniza. |
| "X es un producto de X dentro de la categoría Y" | No dice nada. |
| "Cura", "previene", "quema grasa", "elimina" | Declaración de salud: riesgo legal. |
| "El mejor", "increíble", "revolucionario" | Publicidad sin sustento. |
| Advertencias que no aplican | Ver el caso ZMA de arriba. |
| Dato sin fuente | Si no está en la etiqueta ni en la marca, no va. |

**Sobre estimulantes:** la advertencia se pone únicamente si el producto lleva cafeína u
otro estimulante. Se comprueba en la etiqueta, no se asume por la categoría.

---

## De dónde sale la información

En este orden. Si ninguna sirve, el producto no se llena.

1. **La foto del envase** (`img/products/`). Es fuente primaria y sale gratis: la etiqueta
   suele ser legible. Sirve para servidas, gramaje y dosis.
2. **El sitio del fabricante.** Cubre bien las marcas grandes (Optimum, Mutant, Nutrex,
   MuscleTech, BSN).
3. **El catálogo del proveedor.** Sirve para presentación y tamaño, **no** para composición.
4. **Nada de lo anterior** → a la lista de revisión manual. No se inventa.

---

## Al agregar un producto nuevo

1. Confirmar identidad (marca, nombre, presentación).
2. Buscar la fuente y anotar cuál se usó.
3. Escribir descripción + 4 beneficios + 3 usos.
4. Correr el validador:

```bash
node scripts/validar-contenido.mjs
```

5. Si pasa, publicar. Si no, corregir o dejar el producto sin publicar.
