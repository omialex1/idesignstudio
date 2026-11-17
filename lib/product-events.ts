// A small message between the variant buttons and the photo gallery of a product page:
// when the customer picks a variant, the gallery shows the photo whose title is the
// name of that variant (e.g. a photo titled "Brad mic" for the variant "Brad mic").
export const VARIANT_SELECTED_EVENT = "product-variant-selected";

export type VariantSelectedDetail = {
  // the names of the variant (Romanian and English): a photo with one of them as its
  // title is the photo of this variant
  names: string[];
};

// Titles are compared without capitals, accents or extra spaces, so "Brad Mic",
// "brad mic" and "Brád  mic" are the same title.
export function normalizeTitle(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
