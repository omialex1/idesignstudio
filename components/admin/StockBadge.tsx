type Stock = { quantityOnHand: number; lowStockThreshold: number };

export function stockStatus({ quantityOnHand, lowStockThreshold }: Stock) {
  if (quantityOnHand <= 0) return "out" as const;
  if (quantityOnHand <= lowStockThreshold) return "low" as const;
  return "in" as const;
}

const STYLES = {
  in: "bg-green-100 text-green-700",
  low: "bg-amber-100 text-amber-700",
  out: "bg-red-100 text-red-600",
};

const LABELS = {
  in: "În stoc",
  low: "Stoc redus",
  out: "Stoc epuizat",
};

export default function StockBadge({ quantityOnHand, lowStockThreshold }: Stock) {
  const status = stockStatus({ quantityOnHand, lowStockThreshold });
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}
    >
      {LABELS[status]} ({quantityOnHand})
    </span>
  );
}
