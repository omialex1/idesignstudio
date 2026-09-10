import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { CategoryWithTranslation } from "@/lib/db/categories";

export default async function CategoryCard({
  category,
}: {
  category: CategoryWithTranslation;
}) {
  const tNav = await getTranslations("Nav");
  const tHome = await getTranslations("Home");
  const isEvents = category.line === "EVENTS";
  const href = isEvents
    ? `/events/${category.slug}`
    : `/stationary/${category.slug}`;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white transition-shadow hover:shadow-lg"
    >
      <div
        className={`flex h-36 items-center justify-center font-display text-4xl text-cream-50 ${
          isEvents ? "bg-terracotta-400" : "bg-brown-500"
        }`}
      >
        {category.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <span
          className={`text-xs font-semibold tracking-wide uppercase ${
            isEvents ? "text-terracotta-600" : "text-brown-600"
          }`}
        >
          {isEvents ? tNav("events") : tNav("stationary")}
        </span>
        <h3 className="font-display text-lg text-brown-800">
          {category.name}
        </h3>
        {category.description && (
          <p className="text-sm text-brown-600">{category.description}</p>
        )}
        <span className="mt-auto pt-2 text-sm font-medium text-terracotta-600 group-hover:underline">
          {tHome("viewCollection")}
        </span>
      </div>
    </Link>
  );
}
