// Phone numbers for the checkout. Romanian numbers must have the right number
// of digits; foreign numbers (written with + and the country code) are allowed
// because a customer may live abroad, but still need a plausible length.
//
// normalizePhone returns the number in international form (+40712345678) or
// null when it is not valid. The same function runs in the browser (to show the
// error next to the field) and on the server (the real check).

export function normalizePhone(raw: string): string | null {
  let value = raw.trim().replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(value)) return null;

  if (value.startsWith("00")) value = `+${value.slice(2)}`;

  // Romanian number written with the country code: +40 and 9 more digits
  if (value.startsWith("+40")) {
    const national = value.slice(3).replace(/^0/, ""); // tolerate +40 0712...
    return /^[237]\d{8}$/.test(national) ? `+40${national}` : null;
  }

  // Foreign number: + country code, 8 to 15 digits in total
  if (value.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
  }

  // Romanian national format: 10 digits, mobile (07..) or landline (02../03..)
  if (/^0[237]\d{8}$/.test(value)) return `+40${value.slice(1)}`;
  return null;
}

export const POSTAL_CODE_PATTERN = /^\d{6}$/;
