import type { ReactNode } from "react";

// The one look of a card in the admin: a dark (chocolate) title band with rounded
// top corners and a thin dark frame down the sides and along the bottom, so every
// block is clearly separated from the next.
export default function AdminCard({
  title,
  actions,
  children,
  as: Tag = "section",
  className = "",
  bodyClassName = "p-6",
  compact = false,
}: {
  // shown in the dark band; without it the band is a slim dark bar
  title?: ReactNode;
  // controls on the right side of the band (tabs, a button)
  actions?: ReactNode;
  children: ReactNode;
  as?: "section" | "div" | "form" | "article";
  className?: string;
  bodyClassName?: string;
  // a smaller band, for small tiles (numbers on the dashboard)
  compact?: boolean;
}) {
  const Wrapper = Tag;
  return (
    <Wrapper
      className={`overflow-hidden rounded-2xl border-2 border-choc bg-white shadow-md ${className}`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 bg-choc text-cream-50 ${
          compact ? "px-4" : "px-6"
        } ${title || actions ? (compact ? "py-2" : "py-3") : "py-1.5"}`}
      >
        {title ? (
          <h2 className={`font-display ${compact ? "text-base" : "text-xl"}`}>
            {title}
          </h2>
        ) : (
          <span aria-hidden="true" />
        )}
        {actions}
      </div>
      <div className={bodyClassName}>{children}</div>
    </Wrapper>
  );
}
