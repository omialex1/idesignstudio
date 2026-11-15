import { Children } from "react";

// A grid of cards where the last (or the only) row sits in the middle instead of at the
// left, so a category with only a few cards looks balanced. The cards have the same
// width as in a normal grid with that many columns:
//  - "cards":    2 columns on phones, 3, 4, then 5 on wide screens
//  - "products": 3 columns on phones, 4, then 5 on wide screens
const VARIANTS = {
  cards: {
    gap: "gap-3 sm:gap-4",
    cell: "w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)]",
  },
  products: {
    gap: "gap-2 sm:gap-4",
    cell: "w-[calc((100%-1rem)/3)] sm:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)]",
  },
} as const;

export default function CenteredGrid({
  variant,
  children,
}: {
  variant: keyof typeof VARIANTS;
  children: React.ReactNode;
}) {
  const { gap, cell } = VARIANTS[variant];
  return (
    <div className={`flex flex-wrap justify-center ${gap}`}>
      {Children.map(children, (child) => (
        <div className={`flex flex-col ${cell}`}>{child}</div>
      ))}
    </div>
  );
}
