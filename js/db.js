const PRODUCT_BASE_SELECT = `
  id,
  slug,
  nombre,
  subtitulo,
  precio_centavos,
  moneda,
  tag,
  imagen_url,
  alt,
  whatsapp_mensaje,
  beneficios,
  descripcion,
  uso,
  is_active,
  name,
  brand,
  category,
  price,
  presentation,
  image_url,
  description,
  old_price,
  description_short,
  description_long,
  label,
  show_on_home,
  home_order,
  is_available,
  is_featured,
  available,
  featured,
  flavor_mode,
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
    presentation,
    price,
    stock,
    available,
    is_available,
    created_at
  )
`;

const DB_PLACEHOLDER_IMAGE = "img/products/product-placeholder.svg";
const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const DEFAULT_CATEGORIES = [
  { name: "Proteinas", slug: "proteinas", sort_order: 1 },
  { name: "Creatinas", slug: "creatinas", sort_order: 2 },
  { name: "Pre-entrenos", slug: "pre-entrenos", sort_order: 3 },
  { name: "Quemadores", slug: "quemadores", sort_order: 4 },
  { name: "Vitaminas", slug: "vitaminas", sort_order: 5 },
  { name: "Aminoacidos", slug: "aminoacidos", sort_order: 6 },
  { name: "Accesorios", slug: "accesorios", sort_order: 7 },
  { name: "Otros", slug: "otros", sort_order: 8 },
];

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

function createSlug(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getProductSlug(productData = {}) {
  const source = productData.slug || productData.legacy_id || [
    productData.brand,
    productData.name,
    productData.presentation,
  ].filter(Boolean).join(" ");

  return createSlug(source) || `producto-${Date.now()}`;
}

function getUsefulText(...values) {
  return values.find((value) => {
    if (typeof value !== "string") return false;
    const cleanValue = value.trim();
    return cleanValue && cleanValue !== "Producto sin nombre";
  })?.trim() || "";
}

function toTextLines(value, fallback = []) {
  if (Array.isArray(value)) return value.map((item) => item?.toString().trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback;
}

function isPlaceholderImage(image = "") {
  return !image || image === DB_PLACEHOLDER_IMAGE || image.includes("product-placeholder.svg");
}

function isLocalProductImage(image = "") {
  return /^\.?\/?img\/products\//.test(image);
}

function findLocalProductMatch(product = {}) {
  if (typeof PRODUCTS === "undefined") return null;

  const candidates = [
    product.legacy_id,
    product.legacyId,
    product.local_id,
    product.slug,
    product.id,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (PRODUCTS[candidate]) return PRODUCTS[candidate];
  }

  const name = getUsefulText(product.name, product.nombre);
  if (!name) return null;

  const productSlug = createSlug(name);
  return Object.values(PRODUCTS).find((localProduct) => createSlug(localProduct.nombre || localProduct.name) === productSlug) || null;
}

function normalizeFlavor(flavor, index = 0) {
  if (typeof flavor === "string") {
    return {
      id: `local-flavor-${index}-${flavor.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: flavor,
      presentation: "",
      price: null,
      stock: null,
      available: true,
    };
  }

  return {
    id: flavor?.id || `local-flavor-${index}`,
    name: flavor?.name || flavor?.nombre || "",
    presentation: flavor?.presentation || flavor?.presentacion || "",
    price: flavor?.price == null || flavor?.price === "" ? null : Number(flavor.price),
    stock: flavor?.stock == null || flavor?.stock === "" ? null : Number(flavor.stock),
    available: flavor?.available ?? flavor?.is_available ?? flavor?.disponible ?? true,
  };
}

function normalizeFlavorMode(value, flavors = []) {
  if (["has_flavors", "no_flavor", "needs_review"].includes(value)) return value;
  return flavors.length ? "has_flavors" : "needs_review";
}

function normalizeProductFromDb(product) {
  const flavors = (product.product_flavors || product.flavors || product.sabores || [])
    .map(normalizeFlavor)
    .filter((flavor) => flavor.name)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const localProduct = findLocalProductMatch(product);
  const remoteImage = product.image_url || product.imagen_url || product.image || product.imagen || "";
  const localImage = localProduct?.imagen || localProduct?.image || "";
  const image = localImage && (isPlaceholderImage(remoteImage) || isLocalProductImage(remoteImage))
    ? localImage
    : remoteImage || localImage || DB_PLACEHOLDER_IMAGE;
  const available = product.is_available ?? product.available ?? product.is_active ?? product.disponible ?? true;
  const featured = product.is_featured ?? product.featured ?? product.destacado ?? false;
  const flavorMode = normalizeFlavorMode(product.flavor_mode || product.flavorMode, flavors);
  const showOnHome = product.show_on_home ?? product.en_inicio ?? featured ?? false;
  const homeOrder = product.home_order == null || product.home_order === "" ? null : Number(product.home_order);
  const goals = asArray(product.goals || product.objetivos);
  const tags = asArray(product.tags || product.etiquetas);
  const name = getUsefulText(product.name, product.nombre);
  const brand = product.brand || product.marca || "";
  const category = getUsefulText(product.category === "Producto" ? "" : product.category, product.categoria, product.tag) || "Producto";
  const presentation = product.presentation || product.presentacion || "";
  const price = Number(product.price ?? product.precio ?? (product.precio_centavos != null ? product.precio_centavos / 100 : 0));
  const descriptionText = product.description_long || product.description || product.descripcion || product.subtitulo || "";
  const descriptionShort = product.description_short || product.subtitulo || descriptionText;
  const descriptionLines = Array.isArray(descriptionText)
    ? descriptionText
    : descriptionText.toString().split("\n").filter(Boolean);

  return {
    id: product.id,
    slug: product.slug || createSlug(product.legacy_id || name),
    legacy_id: product.legacy_id || product.legacyId || product.id,
    name,
    brand,
    category,
    price,
    old_price: product.old_price == null || product.old_price === "" ? null : Number(product.old_price),
    presentation,
    image,
    image_url: image,
    // Imagen tal cual está guardada en la BD, sin el fallback a imagen local.
    // El admin debe editar/persistir ESTO, no el `image` resuelto para mostrar.
    stored_image_url: remoteImage,
    description: descriptionText,
    description_short: descriptionShort,
    description_long: descriptionText,
    available,
    is_available: available,
    featured,
    is_featured: featured,
    flavor_mode: flavorMode,
    show_on_home: showOnHome,
    home_order: homeOrder,
    label: product.label || product.tag_visual || "",
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
    modoSabor: flavorMode,
    enInicio: showOnHome,
    sabores: flavors.map((flavor) => flavor.name),
    objetivos: goals,
    tag: available ? "Disponible" : "Consultar stock",
    alt: name,
    subtitulo: descriptionShort || `${category}${presentation ? ` ${presentation}` : ""}.`,
    beneficios: toTextLines(product.beneficios, [
      goals.length ? `Apoya objetivos de ${goals.join(", ").toLowerCase()}.` : "Apoya tu rutina de suplementacion.",
      "Producto disponible para cotizacion por WhatsApp.",
      "Javy puede orientarte sobre uso, sabor y disponibilidad.",
    ]),
    descripcion: descriptionLines.length ? descriptionLines : [
      `${name} es un producto de ${brand || "marca por confirmar"} dentro de la categoria ${category.toLowerCase()}.`,
      `Precio de catalogo: $${price.toFixed(2)}.`,
    ],
    uso: toTextLines(product.uso, [
      "Consultar la dosis indicada en la etiqueta del producto.",
      "Usar como complemento de una alimentacion y entrenamiento adecuados.",
      "Si tienes condiciones medicas o sensibilidad a estimulantes, consulta antes de usar.",
    ]),
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
  const name = productData.name?.trim();
  const brand = productData.brand?.trim() || null;
  const category = productData.category?.trim();
  const price = productData.price === "" || productData.price == null ? null : Number(productData.price);
  const oldPrice = productData.old_price === "" || productData.old_price == null ? null : Number(productData.old_price);
  const presentation = productData.presentation?.trim() || null;
  const imageUrl = productData.image_url?.trim() || productData.image?.trim() || DB_PLACEHOLDER_IMAGE;
  const descriptionShort = productData.description_short?.trim() || productData.subtitulo?.trim() || null;
  const descriptionLong = productData.description_long?.trim() || productData.description?.trim() || null;
  const descriptionLines = toTextLines(productData.descripcion || descriptionLong || descriptionShort);
  const description = descriptionLines.join("\n") || null;
  const available = productData.is_available ?? productData.available ?? true;
  const featured = productData.is_featured ?? productData.featured ?? false;
  const flavorMode = normalizeFlavorMode(productData.flavor_mode || productData.flavorMode);
  const showOnHome = productData.show_on_home ?? productData.featured ?? false;
  const homeOrder = productData.home_order === "" || productData.home_order == null ? null : Number(productData.home_order);
  const label = productData.label?.trim() || null;
  const subtitle = descriptionShort || productData.subtitulo || `${category || "Producto"}${presentation ? ` ${presentation}` : ""}.`;
  const benefits = toTextLines(productData.beneficios, [
    category ? `Producto de la categoria ${category}.` : "Producto disponible para cotizacion.",
    "Javy puede confirmar disponibilidad, precio final y forma de entrega por WhatsApp.",
  ]);
  const usage = toTextLines(productData.uso, [
    "Consultar la dosis indicada en la etiqueta del producto.",
    "Usar como complemento de una alimentacion y entrenamiento adecuados.",
  ]);

  return {
    slug: getProductSlug(productData),
    nombre: name,
    subtitulo: subtitle,
    precio_centavos: price == null ? 0 : Math.round(price * 100),
    moneda: "USD",
    tag: available ? "Disponible" : "Consultar stock",
    imagen_url: imageUrl,
    alt: name,
    whatsapp_mensaje: `Hola Javy, quiero asesoría sobre ${name}.`,
    beneficios: benefits,
    descripcion: descriptionLines.length ? descriptionLines : [subtitle],
    uso: usage,
    is_active: available,
    name,
    brand,
    category,
    price,
    old_price: oldPrice,
    presentation,
    image_url: imageUrl,
    description,
    description_short: descriptionShort || subtitle,
    description_long: descriptionLong || description,
    available,
    is_available: available,
    featured,
    is_featured: featured,
    flavor_mode: flavorMode,
    show_on_home: Boolean(showOnHome),
    home_order: homeOrder,
    label,
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

async function getCategories() {
  if (hasSupabaseClient()) {
    try {
      const { data, error } = await supabaseClient
        .from("categories")
        .select("id, name, slug, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      if (data?.length) return data;
    } catch (error) {
      console.warn("No se pudieron cargar categorias desde Supabase:", error.message);
    }
  }

  return DEFAULT_CATEGORIES;
}

async function getAdminProfile(userId) {
  ensureSupabaseForWrite();
  if (!userId) return null;

  const { data, error } = await supabaseClient
    .from("admin_profiles")
    .select("id, user_id, role, is_active")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getHomeProducts() {
  const products = await getProductsWithFlavors();
  const homeProducts = products
    .filter((product) => product.show_on_home)
    .sort((a, b) => {
      const orderA = a.home_order ?? 999;
      const orderB = b.home_order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, "es");
    });

  if (homeProducts.length) return homeProducts.slice(0, 8);

  return products
    .filter((product) => product.featured)
    .slice(0, 8);
}

async function updateHomeProducts(productIds = []) {
  ensureSupabaseForWrite();

  const cleanIds = [...new Set(productIds.filter(Boolean))];
  if (cleanIds.length < 4) {
    throw new Error("No puedes mostrar menos de 4 productos en el inicio.");
  }

  if (cleanIds.length > 8) {
    throw new Error("No puedes mostrar mas de 8 productos en el inicio.");
  }

  const { error: resetError } = await supabaseClient
    .from("products")
    .update({ show_on_home: false, home_order: null, is_featured: false, featured: false })
    .not("id", "is", null);

  if (resetError) throw resetError;

  for (const [index, id] of cleanIds.entries()) {
    const { error } = await supabaseClient
      .from("products")
      .update({
        show_on_home: true,
        home_order: index + 1,
        is_featured: true,
        featured: true,
      })
      .eq("id", id);

    if (error) throw error;
  }

  productsCache = null;
  return getHomeProducts();
}

async function uploadProductImage(file) {
  ensureSupabaseForWrite();
  if (!file) return "";

  // Validar antes de subir: el bucket es público y la extensión del nombre
  // es falsificable, así que comprobamos el tipo MIME real y el tamaño.
  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen (JPG, PNG o WebP).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen supera el límite de 5 MB. Optimízala antes de subirla.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
  const safeName = createSlug(file.name.replace(/\.[^.]+$/, "")) || "producto";
  const path = `${Date.now()}-${safeName}.${extension}`;

  const { error } = await supabaseClient.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabaseClient.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

// Borra del bucket una imagen recién subida cuya URL pública conocemos.
// Se usa para limpiar huérfanas cuando el guardado del producto falla
// después de haber subido la imagen. Best-effort: no propaga errores.
async function removeProductImage(publicUrl) {
  if (!publicUrl) return;
  const marker = `/${PRODUCT_IMAGE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return; // no es una URL de nuestro bucket (p.ej. imagen externa)
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
  try {
    await supabaseClient.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
  } catch (_) {
    // Silencioso: limpiar la huérfana es secundario al error original.
  }
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

// Update parcial: toca SOLO las columnas de disponibilidad. No pasa por
// mapProductToDb, así que no reescribe imagen, slug ni precio_centavos.
async function setProductAvailability(id, available) {
  ensureSupabaseForWrite();
  const isAvailable = Boolean(available);
  const { data, error } = await supabaseClient
    .from("products")
    .update({
      available: isAvailable,
      is_available: isAvailable,
      is_active: isAvailable,
      tag: isAvailable ? "Disponible" : "Consultar stock",
    })
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
      presentation: flavorData.presentation?.trim() || null,
      price: flavorData.price === "" || flavorData.price == null ? null : Number(flavorData.price),
      stock: flavorData.stock === "" || flavorData.stock == null ? null : Number(flavorData.stock),
      available: flavorData.is_available ?? flavorData.available ?? true,
      is_available: flavorData.is_available ?? flavorData.available ?? true,
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
      presentation: flavorData.presentation?.trim() || null,
      price: flavorData.price === "" || flavorData.price == null ? null : Number(flavorData.price),
      stock: flavorData.stock === "" || flavorData.stock == null ? null : Number(flavorData.stock),
      available: flavorData.is_available ?? flavorData.available ?? true,
      is_available: flavorData.is_available ?? flavorData.available ?? true,
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
        description_short: product.subtitulo,
        description_long: Array.isArray(product.descripcion) ? product.descripcion.join("\n") : product.description,
        beneficios: product.beneficios,
        descripcion: product.descripcion,
        uso: product.uso,
        available: product.available,
        is_available: product.available,
        featured: product.featured,
        is_featured: product.featured,
        show_on_home: product.show_on_home || product.featured,
        home_order: product.home_order,
        label: product.label,
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
  getCategories,
  getAdminProfile,
  getHomeProducts,
  updateHomeProducts,
  uploadProductImage,
  removeProductImage,
  createProduct,
  updateProduct,
  setProductAvailability,
  deleteProduct,
  createFlavor,
  updateFlavor,
  deleteFlavor,
  normalizeProductFromDb,
  seedProductsFromLocalData,
  getProductsCacheSource,
  isUuid,
};
