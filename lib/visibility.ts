// A subcategory is shown on the site only when neither it nor its main category is
// hidden in the admin. Use it as the `category` filter of any product query (and
// `{ isHidden: false }` on category queries), so a hidden category, its
// subcategories and all their products vanish together: menu, homepage, pages,
// search, recommendations, sitemap and checkout.
export const categoryShown = {
  isHidden: false,
  mainCategory: { isHidden: false },
} as const;
