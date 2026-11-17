import { Link } from "@/i18n/navigation";

export type Crumb = {
  label: string;
  // the last one (the page you are on) has no link
  href?: string;
};

// The path to the page, as clickable text: Home › Category › Subcategory › Product.
// Every step but the last is a link; on a narrow screen long names wrap to a new line
// instead of pushing the page wider.
export default function Breadcrumbs({
  label,
  items,
  className = "",
  align = "left",
}: {
  label: string;
  items: Crumb[];
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <nav aria-label={label} className={className}>
      <ol
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-taupe-600 ${
          align === "center" ? "justify-center" : ""
        }`}
      >
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-2">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="rounded transition-colors hover:text-gold-600 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-medium text-taupe-800">
                  {item.label}
                </span>
              )}
              {!last && (
                <span aria-hidden="true" className="text-gold-600">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
