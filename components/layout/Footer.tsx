export default function Footer() {
  return (
    <footer className="border-t border-cream-200 bg-cream-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-10 text-sm text-brown-600 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-brown-800">
          iDesignStudio<span className="text-terracotta-500">.ro</span>
        </p>
        <p>&copy; {new Date().getFullYear()} iDesignStudio.ro. All rights reserved.</p>
      </div>
    </footer>
  );
}
