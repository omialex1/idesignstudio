// A calm photo behind the middle of a page, over which the glass cards pass as the
// page scrolls (so their transparency shows). The photo stays in place on the screen
// and is only visible inside this block (the clip keeps it from covering the rest of
// the page, also on phones where a fixed background does not work by itself). The top
// and the bottom melt into the page color. The photo file is already blurred and a light
// wash keeps it soft, so it is a calm backdrop and the text stays readable.
export default function MidBackdrop({
  src,
  children,
}: {
  src: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [clip-path:inset(0)]"
      >
        <div
          className="fixed inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${src})` }}
        />
        <div className="absolute inset-0 bg-cream-50/45" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cream-50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-cream-50 to-transparent" />
      </div>
      {children}
    </div>
  );
}
