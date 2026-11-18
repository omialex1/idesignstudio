// Main categories that show their products straight in a row on the homepage (with arrows
// when they do not fit) instead of one card per subcategory. It follows the address of the
// main category.
export const PRODUCT_ROW_MAINS = ["handmade"];

export function showsProductsRow(mainSlug: string) {
  return PRODUCT_ROW_MAINS.includes(mainSlug);
}
