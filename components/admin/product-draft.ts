// Draft of the product form: what was typed or chosen and not yet saved is kept in
// the browser, so a mistaken Back, a closed tab or a reload does not start over.
// Photos picked for a new product are files and are not kept.

export type DraftState = {
  tiered: boolean;
  variantRows: number;
  pieceRows: number;
  variantPieceRows: number[];
  line: string;
  subcategoryId: string;
  colorsOn: boolean;
  offered: Record<string, boolean>;
  variantNames: string[];
};

export type Draft = {
  savedAt: number;
  state: DraftState;
  // text fields by name
  fields: Record<string, string>;
  // checkboxes the form leaves to the browser, by "name|value"
  checks: Record<string, boolean>;
};

const KEY_PREFIX = "product-draft:";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// These checkboxes (and every select) are controlled by the form's own state.
const CONTROLLED_CHECKBOXES = new Set(["tieredPricing", "allowedColor"]);

type Control = HTMLInputElement | HTMLTextAreaElement;

function controls(form: HTMLFormElement): Control[] {
  return Array.from(form.elements).filter(
    (el): el is Control =>
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
      el.name !== "" &&
      !(el instanceof HTMLInputElement && el.type === "hidden"),
  );
}

export function snapshot(
  form: HTMLFormElement,
  state: DraftState,
): Omit<Draft, "savedAt"> {
  const fields: Record<string, string> = {};
  const checks: Record<string, boolean> = {};
  for (const el of controls(form)) {
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      if (!CONTROLLED_CHECKBOXES.has(el.name)) {
        checks[`${el.name}|${el.value}`] = el.checked;
      }
    } else {
      fields[el.name] = el.value;
    }
  }
  return { state, fields, checks };
}

export function apply(form: HTMLFormElement, draft: Draft) {
  for (const el of controls(form)) {
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      const saved = draft.checks[`${el.name}|${el.value}`];
      if (saved !== undefined) el.checked = saved;
    } else if (draft.fields[el.name] !== undefined) {
      el.value = draft.fields[el.name];
    }
  }
}

export function sameContent(
  a: Omit<Draft, "savedAt">,
  b: Omit<Draft, "savedAt">,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function loadDraft(id: string): Draft | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + id);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (
      typeof draft?.savedAt !== "number" ||
      Date.now() - draft.savedAt > MAX_AGE_MS ||
      !draft.state ||
      !draft.fields
    ) {
      localStorage.removeItem(KEY_PREFIX + id);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function storeDraft(id: string, content: Omit<Draft, "savedAt">) {
  try {
    localStorage.setItem(
      KEY_PREFIX + id,
      JSON.stringify({ ...content, savedAt: Date.now() }),
    );
  } catch {
    // storage full or blocked: the form works as before, just without a draft
  }
}

export function clearDraft(id: string) {
  try {
    localStorage.removeItem(KEY_PREFIX + id);
  } catch {
    // nothing to do
  }
}
