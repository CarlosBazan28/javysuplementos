const PRODUCT_BASE_SELECT = `
  id,
  name,
  brand,
  category,
  price,
  presentation,
  image_url,
  description,
  available,
  featured,
  tags,
  goals,
  legacy_id,
  created_at,
  updated_at
`;

const PRODUCT_SELECT = `
  ${PRODUCT_BASE_SELECT},
  product_flavors (
    id,
    name,
    available,
    created_at
  )
`;

const DB_PLACEHOLDER_IMAGE = "img/products/product-placeholder.svg";

let productsCache = null;
let productsCacheSource = "local";

function hasSupabaseClient() {
  return typeof supabaseClient !== "undefined" && Boolean(supabaseClient);
}

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeFlavor(flavor, index = 0) {
  if (typeof flavor === "string") {
    return {
      id: `local-flavor-${index}-${flavor.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: flavor,
      available: true,
    };
  }

  return {
    id: flavor?.id || `local-flavor-${index}`,
    name: flavor?.name || flavor?.nombre || "",
    available: flavor?.available ?? flavor?.disponible ?? true,
  };
}

function normalizeProductFromDb(product) {
  const flavors = (product.product_flavors || product.flavors || product.sabores || [])
    .map(normalizeFlavor)
    .filter((flavor) => flavor.name)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const image = product.image_url || product.image || product.imagen || DB_PLACEHOLDER_IMAGE;
  const available = product.available ?? product.disponible ?? true;
  const featured = product.featured ?? product.destacado ?? false;
  const goals = asArray(product.goals || product.objetivos);
  const tags = asArray(product.tags || product.etiquetas);
  const name = product.name || product.nombre || "";
  const brand = product.brand || product.marca || "";
  const category = product.category || product.categoria || "Producto";
  const presentation = product.presentation || product.presentacion || "";
  const price = Number(product.price ?? product.precio ?? 0);
  const descriptionText = product.description || product.descripcion || product.subtitulo || "";
  const descriptionLines = Array.isArray(descriptionText)
    ? descriptionText
    : descriptionText.toString().split("\n").filter(Boolean);

  return {
    id: product.id,
    legacy_id: product.legacy_id || product.legacyId || product.id,
    name,
    brand,
    category,
    price,
    presentation,
    image,
    image_url: image,
    description: descriptionText,
    available,
    featured,
    tags,
    goals,
    flavors,
    created_at: product.created_at,
    updated_at: product.updated_at,
    source: product.source || "supabase",

    nombre: name,
    marca: brand,
    categoria: category,
    precio: price,
    presentacion: presentation,
    imagen: image,
    imagenPendiente: image === DB_PLACEHOLDER_IMAGE,
    disponible: available,
    destacado: featured,
    sabores: flavors.map((flavor) => flavor.name),
    objetivos: goals,
    tag: available ? "Disponible" : "Consultar stock",
    alt: name,
    subtitulo: product.subtitulo || `${category}${presentation ? ` ${presentation}` : ""}.`,
    beneficios: product.beneficios || [
      goals.length ? `Apoya objetivos de ${goals.join(", ").toLowerCase()}.` : "Apoya tu rutina de suplementacion.",
      "Producto disponible para cotizacion por WhatsApp.",
      "Javy puede orientarte sobre uso, sabor y disponibilidad.",
    ],
    descripcion: descriptionLines.length ? descriptionLines : [
      `${name} es un producto de ${brand || "marca por confirmar"} dentro de la categoria ${category.toLowerCase()}.`,
      `Precio de catalogo: $${price.toFixed(2)}.`,
    ],
    uso: product.uso || [
      "Consultar la dosis indicada en la etiqueta del producto.",
      "Usar como complemento de una alimentacion y entrenamiento adecuados.",
      "Si tienes condiciones medicas o sensibilidad a estimulantes, consulta antes de usar.",
    ],
  };
}

function normalizeLocalProduct(product) {
  return normalizeProductFromDb({
    ...product,
    id: product.id,
    name: product.nombre,
    brand: product.marca,
    category: product.categoria,
    price: product.precio,
    presentation: product.presentacion,
    image_url: product.imagen,
    available: product.disponible,
    featured: product.destacado,
    goals: product.objetivos,
    flavors: product.sabores,
    legacy_id: product.id,
    source: "local",
  });
}

function isUsableRemoteProduct(product) {
  const isRepairPlaceholder =
    product.name === "Producto sin nombre" &&
    product.category === "Producto" &&
    !product.legacy_id &&
    !product.brand &&
    !product.presentation &&
    !product.description;

  return !isRepairPlaceholder;
}

function getLocalProducts() {
  if (typeof PRODUCT_LIST !== "undefined") {
    return PRODUCT_LIST.map(normalizeLocalProduct);
  }

  if (typeof PRODUCTS !== "undefined") {
    return Object.values(PRODUCTS).map(normalizeLocalProduct);
  }

  return [];
}

function mapProductToDb(productData = {}) {
  return {
    name: productData.name?.trim(),
    brand: productData.brand?.trim() || null,
    category: productData.category?.trim(),
    price: productData.price === "" || productData.price == null ? null : Number(productData.price),
    presentation: productData.presentation?.trim() || null,
    image_url: productData.image_url?.trim() || productData.image?.trim() || null,
    description: productData.description?.trim() || null,
    available: productData.available ?? true,
    featured: productData.featured ?? false,
    tags: asArray(productData.tags),
    goals: asArray(productData.goals),
    legacy_id: productData.legacy_id?.trim() || null,
  };
}

function ensureSupabaseForWrite() {
  if (!hasSupabaseClient()) {
    throw new Error("Supabase no esta disponible. Revisa el CDN y supabase-config.js.");
  }
}

async function getProductsWithFlavors(options = {}) {
  const useCache = options.cache !== false;
  const allowFallback = options.fallback !== false;

  if (useCache && productsCache) return productsCache;

  if (hasSupabaseClient()) {
    try {
      const { data, error } = await supabaseClient
        .from("products")
        .select(PRODUCT_SELECT)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data?.length) {
        const normalizedProducts = data.map(normalizeProductFromDb);
        const usableProducts = normalizedProducts.filter(isUsableRemoteProduct);

        if (usableProducts.length || !allowFallback) {
          productsCache = allowFallback ? usableProducts : normalizedProducts;
          productsCacheSource = "supabase";
          return productsCache;
        }

        console.warn("Supabase solo tiene productos de reparacion. La web usara datos locales hasta migrar el catalogo.");
      }

      if (data?.length && !allowFallback) {
        productsCache = data.map(normalizeProductFromDb);
        productsCacheSource = "supabase";
        return productsCache;
      }
    } catch (error) {
      console.warn("No se pudieron cargar productos desde Supabase:", error.message);
      if (!allowFallback) throw error;
    }
  }

  if (!allowFallback) return [];

  productsCache = getLocalProducts();
  productsCacheSource = "local";
  return productsCache;
}

async function getProductById(id) {
  const products = await getProductsWithFlavors();
  return products.find((product) => product.id === id || product.legacy_id === id) || null;
}

async function createProduct(productData) {
  ensureSupabaseForWrite();
  const payload = mapProductToDb(productData);
  const { data, error } = await supabaseClient
    .from("products")
    .insert(payload)
    .select(PRODUCT_BASE_SELECT)
    .single();

  if (error) throw error;
  productsCache = null;
  return normalizeProductFromDb(data);
}

async function updateProduct(id, productData) {
  ensureSupabaseForWrite();
  const payload = mapProductToDb(productData);
  delete payload.legacy_id;

  const { data, error } = await supabaseClient
    .from("products")
    .update(payload)
    .eq("id", id)
    .select(PRODUCT_BASE_SELECT)
    .single();

  if (error) throw error;
  productsCache = null;
  return normalizeProductFromDb(data);
}

async function deleteProduct(id) {
  ensureSupabaseForWrite();
  const { error } = await supabaseClient.from("products").delete().eq("id", id);
  if (error) throw error;
  productsCache = null;
}

async function createFlavor(productId, flavorData) {
  ensureSupabaseForWrite();
  const { data, error } = await supabaseClient
    .from("product_flavors")
    .insert({
      product_id: productId,
      name: flavorData.name?.trim(),
      available: flavorData.available ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  productsCache = null;
  return normalizeFlavor(data);
}

async function updateFlavor(id, flavorData) {
  ensureSupabaseForWrite();
  const { data, error } = await supabaseClient
    .from("product_flavors")
    .update({
      name: flavorData.name?.trim(),
      available: flavorData.available ?? true,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  productsCache = null;
  return normalizeFlavor(data);
}

async function deleteFlavor(id) {
  ensureSupabaseForWrite();
  const { error } = await supabaseClient.from("product_flavors").delete().eq("id", id);
  if (error) throw error;
  productsCache = null;
}

async function seedProductsFromLocalData() {
  ensureSupabaseForWrite();

  const localProducts = getLocalProducts();
  if (!localProducts.length) {
    return { created: 0, skipped: 0, flavorsCreated: 0, errors: ["No hay productos locales para migrar."] };
  }

  const legacyIds = localProducts.map((product) => product.legacy_id).filter(Boolean);
  const { data: existingRows, error: existingError } = await supabaseClient
    .from("products")
    .select("id, legacy_id")
    .in("legacy_id", legacyIds);

  if (existingError) throw existingError;

  const existingByLegacyId = new Map((existingRows || []).map((row) => [row.legacy_id, row.id]));
  const summary = { created: 0, skipped: 0, flavorsCreated: 0, errors: [] };

  for (const product of localProducts) {
    if (existingByLegacyId.has(product.legacy_id)) {
      summary.skipped += 1;
      continue;
    }

    try {
      const createdProduct = await createProduct({
        name: product.name,
        brand: product.brand,
        category: product.category,
        price: product.price,
        presentation: product.presentation,
        image_url: product.image,
        description: Array.isArray(product.descripcion) ? product.descripcion.join("\n") : product.description,
        available: product.available,
        featured: product.featured,
        tags: product.tags,
        goals: product.goals,
        legacy_id: product.legacy_id,
      });

      summary.created += 1;

      for (const flavor of product.flavors) {
        await createFlavor(createdProduct.id, {
          name: flavor.name,
          available: flavor.available,
        });
        summary.flavorsCreated += 1;
      }
    } catch (error) {
      summary.errors.push(`${product.name}: ${error.message}`);
    }
  }

  productsCache = null;
  return summary;
}

function getProductsCacheSource() {
  return productsCacheSource;
}

window.catalogDb = {
  getProductsWithFlavors,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createFlavor,
  updateFlavor,
  deleteFlavor,
  normalizeProductFromDb,
  seedProductsFromLocalData,
  getProductsCacheSource,
  isUuid,
};
