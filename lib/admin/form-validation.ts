// Validation shared by the admin forms: the browser runs it first (so errors
// show next to the field without losing anything typed), the server runs it
// again before saving.
import { MAX_DISCOUNT_PERCENT } from "@/lib/pricing";
import { isCategoryColor } from "@/lib/category-colors";

export const VARIANT_SLOTS = 4;
// Pieces (parts with their own colour choice) per variant, and per product
// without variants.
export const PIECE_SLOTS = 5;

// Pieces of all variants and of the product itself live in one table with a
// unique sort order per product: variant v, piece j -> v*10+j; product-level
// piece j -> 100+j.
export function variantPieceSort(variantIndex: number, pieceIndex: number) {
  return variantIndex * 10 + pieceIndex;
}
export function productPieceSort(pieceIndex: number) {
  return 100 + pieceIndex;
}

export type FormErrors = Record<string, string>;

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

const WHOLE_NUMBER = /^\d+$/;

export function validateProductForm(fd: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!text(fd, "categoryId")) errors.categoryId = "Alege categoria principală și apoi o subcategorie.";
  if (!text(fd, "roName")) {
    errors.roName = "Completează numele produsului în română.";
  }

  let validVariants = 0;
  for (let i = 0; i < VARIANT_SLOTS; i++) {
    const nameRo = text(fd, `variantNameRo${i}`);
    const nameEn = text(fd, `variantNameEn${i}`);
    const priceRaw = text(fd, `variantPriceRon${i}`);
    const price = parseFloat(priceRaw);
    const discountRaw = text(fd, `variantDiscount${i}`);

    let hasPieces = false;
    for (let j = 0; j < PIECE_SLOTS; j++) {
      const pieceRo = text(fd, `variantPieceNameRo${i}_${j}`);
      const pieceEn = text(fd, `variantPieceNameEn${i}_${j}`);
      if (pieceRo) hasPieces = true;
      if (!pieceRo && pieceEn) {
        errors[`variantPieceNameRo${i}_${j}`] =
          "Completează numele piesei în română.";
      }
    }

    if (nameRo && priceRaw === "") {
      errors[`variantPriceRon${i}`] = "Completează prețul acestei variante.";
    } else if (!nameRo && (priceRaw !== "" || nameEn || hasPieces || discountRaw)) {
      errors[`variantNameRo${i}`] = "Completează numele variantei în română.";
    } else if (nameRo && (!Number.isFinite(price) || price < 0)) {
      errors[`variantPriceRon${i}`] =
        "Prețul trebuie să fie un număr, 0 sau mai mare.";
    } else if (nameRo) {
      validVariants += 1;
    }

    if (
      nameRo &&
      discountRaw !== "" &&
      (!WHOLE_NUMBER.test(discountRaw) ||
        parseInt(discountRaw, 10) > MAX_DISCOUNT_PERCENT)
    ) {
      errors[`variantDiscount${i}`] =
        `Reducerea trebuie să fie un număr întreg între 0 și ${MAX_DISCOUNT_PERCENT}.`;
    }
  }

  if (validVariants === 0) {
    const priceRaw = text(fd, "priceRon");
    const price = parseFloat(priceRaw);
    if (priceRaw === "") {
      errors.priceRon =
        "Completează prețul sau adaugă cel puțin o variantă cu preț propriu.";
    } else if (!Number.isFinite(price) || price < 0) {
      errors.priceRon = "Prețul trebuie să fie un număr, 0 sau mai mare.";
    }
  }

  for (let j = 0; j < PIECE_SLOTS; j++) {
    if (!text(fd, `componentNameRo${j}`) && text(fd, `componentNameEn${j}`)) {
      errors[`componentNameRo${j}`] =
        "Completează numele piesei în română.";
    }
  }

  for (const [key, label] of [
    ["quantityOnHand", "stocul"],
    ["lowStockThreshold", "pragul de stoc redus"],
  ] as const) {
    const raw = text(fd, key);
    if (raw === "") {
      errors[key] = `Completează ${label} (0 sau mai mult).`;
    } else if (!WHOLE_NUMBER.test(raw)) {
      errors[key] = `Câmpul trebuie să fie un număr întreg, 0 sau mai mare.`;
    }
  }

  return errors;
}

export function validateSubcategoryForm(fd: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!text(fd, "mainCategoryId")) {
    errors.mainCategoryId = "Alege categoria principală.";
  }
  if (!text(fd, "roName")) {
    errors.roName = "Completează numele subcategoriei în română.";
  }
  const order = text(fd, "sortOrder");
  if (order !== "" && !/^-?\d+$/.test(order)) {
    errors.sortOrder = "Ordinea trebuie să fie un număr întreg.";
  }
  return errors;
}

export function validateMainCategoryForm(fd: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!text(fd, "roName")) {
    errors.roName = "Completează numele categoriei în română.";
  }
  if (!isCategoryColor(text(fd, "color"))) {
    errors.color = "Alege o culoare din listă.";
  }
  const order = text(fd, "sortOrder");
  if (order !== "" && !/^-?\d+$/.test(order)) {
    errors.sortOrder = "Ordinea trebuie să fie un număr întreg.";
  }
  return errors;
}

export function hasErrors(errors: FormErrors) {
  return Object.keys(errors).length > 0;
}
