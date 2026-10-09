// Validation shared by the admin forms: the browser runs it first (so errors
// show next to the field without losing anything typed), the server runs it
// again before saving.
export const VARIANT_SLOTS = 4;
export const COMPONENT_SLOTS = 5;

export type FormErrors = Record<string, string>;

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

const WHOLE_NUMBER = /^\d+$/;

export function validateProductForm(fd: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!text(fd, "categoryId")) errors.categoryId = "Alege o categorie.";
  if (!text(fd, "roName")) {
    errors.roName = "Completează numele produsului în română.";
  }

  let validVariants = 0;
  for (let i = 0; i < VARIANT_SLOTS; i++) {
    const nameRo = text(fd, `variantNameRo${i}`);
    const nameEn = text(fd, `variantNameEn${i}`);
    const priceRaw = text(fd, `variantPriceRon${i}`);
    const price = parseFloat(priceRaw);

    if (nameRo && priceRaw === "") {
      errors[`variantPriceRon${i}`] = "Completează prețul acestei variante.";
    } else if (!nameRo && (priceRaw !== "" || nameEn)) {
      errors[`variantNameRo${i}`] = "Completează numele variantei în română.";
    } else if (nameRo && (!Number.isFinite(price) || price < 0)) {
      errors[`variantPriceRon${i}`] =
        "Prețul trebuie să fie un număr, 0 sau mai mare.";
    } else if (nameRo) {
      validVariants += 1;
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

  for (let i = 0; i < COMPONENT_SLOTS; i++) {
    if (!text(fd, `componentNameRo${i}`) && text(fd, `componentNameEn${i}`)) {
      errors[`componentNameRo${i}`] =
        "Completează numele componentei în română.";
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

export function validateCategoryForm(fd: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!text(fd, "line")) errors.line = "Alege categoria principală.";
  if (!text(fd, "roName")) {
    errors.roName = "Completează numele categoriei în română.";
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
