"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navLinks = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/products", label: "Produse", exact: false },
  { href: "/admin/categories", label: "Categorii", exact: false },
  { href: "/admin/orders", label: "Comenzi", exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-cream-200 bg-white">
      <div className="border-b border-cream-200 px-5 py-5">
        <p className="font-display text-lg text-brown-800">
          iDesignStudio<span className="text-terracotta-500">.ro</span>
        </p>
        <p className="text-xs text-brown-400">Admin</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navLinks.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-terracotta-50 text-terracotta-600"
                  : "text-brown-600 hover:bg-cream-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-cream-200 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-brown-500 transition-colors hover:bg-cream-100"
        >
          Deconectare
        </button>
      </div>
    </aside>
  );
}
