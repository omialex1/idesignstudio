import { Cormorant_Garamond, Manrope } from "next/font/google";

// The site fonts, declared once and shared by the shop and the admin, so the browser
// never has two copies of the same font.
//
// Titles use Cormorant Garamond in the 500 weight only (see globals.css). The normal
// style is loaded in advance; the italic one is used by a few titles of the home page
// only, so it is not preloaded (pages without italic titles never download it).
export const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  weight: ["500"],
  style: ["normal"],
});

export const cormorantItalic = Cormorant_Garamond({
  variable: "--font-cormorant-italic",
  subsets: ["latin", "latin-ext"],
  weight: ["500"],
  style: ["italic"],
  preload: false,
});

// Text, buttons and prices: one variable font file per subset covers every weight.
export const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});
