import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentCustomerId } from "@/lib/customer/auth";
import { getCustomerById } from "@/lib/customer/queries";
import LogoutButton from "@/components/account/LogoutButton";

export default async function AccountDashboardPage() {
  const customerId = await getCurrentCustomerId();
  if (!customerId) redirect("/account/login");

  const customer = await getCustomerById(customerId);
  if (!customer) redirect("/account/login");

  const t = await getTranslations("Account");

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-24">
      <div className="w-full max-w-md rounded-2xl border border-cream-200 bg-white p-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-taupe-800">
            {t("welcomeBack")}, {customer.name}
          </h1>
          <LogoutButton />
        </div>

        <p className="mt-2 text-sm text-taupe-600">{customer.email}</p>

        <Link
          href="/account/orders"
          className="mt-6 inline-block rounded-full border border-taupe-500 px-6 py-2.5 text-sm font-semibold text-taupe-700 transition-colors hover:bg-taupe-500 hover:text-cream-50"
        >
          {t("viewOrders")}
        </Link>
      </div>
    </div>
  );
}
