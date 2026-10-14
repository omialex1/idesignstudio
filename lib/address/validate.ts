import { POSTAL_CODE_PATTERN, normalizePhone } from "@/lib/validation/phone";
import { canonicalCounty } from "@/lib/geo/ro-counties";
import { checkLocality } from "@/lib/geo/localities";

// The one place where phone, county, locality and postal code are checked and
// cleaned, used by the checkout and by the saved address in the account.
// Empty fields are skipped (callers decide which ones are required).
export type AddressError =
  | "invalid_phone"
  | "invalid_county"
  | "invalid_postal_code"
  | "ambiguous_locality";

export type AddressResult =
  | {
      ok: true;
      phone: string;
      county: string;
      city: string;
      postalCode: string;
      // locality written by the customer that is not in the official list
      unverified: boolean;
    }
  | { ok: false; error: AddressError };

export function validateAddress(input: {
  phone: string;
  county: string;
  city: string;
  postalCode: string;
}): AddressResult {
  let phone = "";
  if (input.phone) {
    const normalized = normalizePhone(input.phone);
    if (!normalized) return { ok: false, error: "invalid_phone" };
    phone = normalized;
  }

  let county = "";
  if (input.county) {
    const official = canonicalCounty(input.county);
    if (!official) return { ok: false, error: "invalid_county" };
    county = official;
  }

  if (input.postalCode && !POSTAL_CODE_PATTERN.test(input.postalCode)) {
    return { ok: false, error: "invalid_postal_code" };
  }

  // Checked against the official list: a name that is not in it is accepted but
  // flagged; a name shared by several villages has to be picked exactly.
  let city = input.city;
  let unverified = false;
  if (county && city) {
    const found = checkLocality(county, city);
    if (found.status === "exact") city = found.value;
    else if (found.status === "ambiguous") {
      return { ok: false, error: "ambiguous_locality" };
    } else unverified = true;
  }

  return {
    ok: true,
    phone,
    county,
    city,
    postalCode: input.postalCode,
    unverified,
  };
}
