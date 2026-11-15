import Image from "next/image";

// A product photo that fills its box (the box must be `relative` and have a size).
// The photos live in the database at their full size; going through the image service
// of Next gives every screen a smaller WebP version of the right width (cached), which
// is what keeps the product lists light on phones. `sizes` says how wide the photo is
// shown, so the browser asks for the right version. Anything that is not a path on
// this site (not expected) is shown as a plain image.
export default function ProductPhoto({
  src,
  alt,
  sizes,
  priority = false,
  className = "object-cover",
}: {
  src: string;
  alt: string;
  sizes: string;
  // the photos at the top of a page: loaded first
  priority?: boolean;
  className?: string;
}) {
  if (!src.startsWith("/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={`absolute inset-0 h-full w-full ${className}`}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      draggable={false}
      className={className}
    />
  );
}
