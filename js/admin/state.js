/* ============================================================================
   Estado central del panel + getters derivados de la jerarquía de categorías.
   ============================================================================ */

export const state = {
  products: [],
  categories: [],
  combos: [],
  admins: [],
  userId: null,
  userEmail: null,
  active: "dashboard",
  productFilter: "all",
  productCategory: "all",
  productSubcategory: "all",
  search: "",
  combosSupported: true,
  categoriesSupported: true,
};

/* Orden estable: por sort_order y, a igualdad, alfabético en español. */
export function byOrder(a, b) {
  const oa = a.sort_order ?? 100, ob = b.sort_order ?? 100;
  if (oa !== ob) return oa - ob;
  return (a.name || "").localeCompare(b.name || "", "es");
}

/* Jerarquía Familia → Tipo sobre state.categories. */
export const families = () => state.categories.filter((c) => !c.parent_id).sort(byOrder);
export const typesOf = (famId) => state.categories.filter((c) => c.parent_id === famId).sort(byOrder);
export const catById = (id) => state.categories.find((c) => c.id === id) || null;
