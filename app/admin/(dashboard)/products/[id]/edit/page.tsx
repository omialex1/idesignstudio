import { notFound } from "next/navigation";
import {
  getCategoryOptions,
  getColorMainIds,
  getColorPalettesForAdmin,
  getMainCategoryOptions,
  getProductForEdit,
} from "@/lib/admin/queries";
import { updateProduct, deleteProduct } from "@/lib/admin/product-actions";
import ProductForm from "@/components/admin/ProductForm";
import ProductImageManager from "@/components/admin/ProductImageManager";
import ProductGroupsCard from "@/components/admin/ProductGroupsCard";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; photoError?: string }>;
}) {
  const { id } = await params;
  const { created, photoError } = await searchParams;
  const [product, categories, mainCategories, colorMainIds, palettes] =
    await Promise.all([
      getProductForEdit(id),
      getCategoryOptions(),
      getMainCategoryOptions(),
      getColorMainIds(),
      getColorPalettesForAdmin(),
    ]);

  if (!product) notFound();

  const roTranslation = product.translations.find((t) => t.locale === "ro");
  const enTranslation = product.translations.find((t) => t.locale === "en");

  const boundUpdate = updateProduct.bind(null, product.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-taupe-800">Editează produs</h1>
      {photoError && (
        <p className="max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Produsul a fost creat, dar {photoError} fotografii nu s-au încărcat.
          Adaugă-le din nou mai jos, la secțiunea Fotografii.
        </p>
      )}
      {created && !photoError && (
        <p className="max-w-2xl rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Produsul a fost creat. Poți adăuga acum fotografiile, mai jos, la
          secțiunea Fotografii.
        </p>
      )}
      <ProductForm
        onSubmit={boundUpdate}
        categories={categories}
        mainCategories={mainCategories}
        colorMainIds={colorMainIds}
        palettes={palettes}
        submitLabel="Salvează modificările"
        draftKey={product.id}
        defaultValues={{
          categoryId: product.categoryId,
          slug: product.slug,
          roName: roTranslation?.name ?? "",
          roDescription: roTranslation?.description ?? "",
          roLongDescription: roTranslation?.longDescription ?? "",
          enName: enTranslation?.name ?? "",
          enDescription: enTranslation?.description ?? "",
          enLongDescription: enTranslation?.longDescription ?? "",
          priceRon: product.variants.length
            ? ""
            : (product.priceCents / 100).toFixed(2),
          hasColorOptions: product.hasColorOptions,
          excludedColors: product.excludedColors,
          tieredPricing: product.tieredPricing,
          tiers: product.tieredPricing
            ? product.variants.map((v) => ({
                min: String(v.minQuantity ?? ""),
                priceRon: (v.priceCents / 100).toFixed(2),
              }))
            : [],
          components: product.components
            .filter((c) => !c.variantId)
            .map((c) => ({
              nameRo: c.nameRo,
              nameEn: c.nameEn ?? "",
              maxColors: c.maxColors,
            })),
          variants: (product.tieredPricing ? [] : product.variants).map((v) => ({
            nameRo: v.nameRo,
            nameEn: v.nameEn ?? "",
            priceRon: (v.priceCents / 100).toFixed(2),
            discount: v.discountPercent ? String(v.discountPercent) : "",
            pieces: product.components
              .filter((c) => c.variantId === v.id)
              .map((c) => ({
                nameRo: c.nameRo,
                nameEn: c.nameEn ?? "",
                maxColors: c.maxColors,
              })),
          })),
          quantityOnHand: product.inventory?.quantityOnHand ?? 0,
          lowStockThreshold: product.inventory?.lowStockThreshold ?? 5,
          isActive: product.isActive,
        }}
      />

      <ProductImageManager productId={product.id} images={product.images} />

      <ProductGroupsCard productId={product.id} />

      <form action={deleteProduct} className="w-fit">
        <input type="hidden" name="productId" value={product.id} />
        <button
          type="submit"
          className="text-sm font-medium text-red-600 hover:underline"
        >
          Șterge produsul
        </button>
      </form>
    </div>
  );
}
