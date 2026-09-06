import Link from "next/link";

const navLinks = [
  { href: "/events", label: "Events" },
  { href: "/stationary", label: "Stationary" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-cream-200 bg-cream-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-display text-xl tracking-tight text-brown-800"
        >
          iDesignStudio
          <span className="text-terracotta-500">.ro</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-brown-700 sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-terracotta-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 rounded-full border border-cream-200 px-1 py-1 text-xs font-semibold text-brown-600">
          <span className="rounded-full bg-terracotta-50 px-2 py-1 text-terracotta-600">
            RO
          </span>
          <span className="px-2 py-1">EN</span>
        </div>
      </div>
    </header>
  );
}
