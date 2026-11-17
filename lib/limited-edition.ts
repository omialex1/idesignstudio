// Products of the "Sezon și cadouri" subcategory are limited editions: they get a small
// "Limited edition" label on their cards and on their page. It follows the address of
// the subcategory, so every product put in it gets the label by itself.
export const LIMITED_EDITION_SUBCATEGORY = "sezon-si-cadouri";

export function isLimitedEdition(categorySlug: string | null | undefined) {
  return categorySlug === LIMITED_EDITION_SUBCATEGORY;
}
