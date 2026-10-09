"use client";

export default function SubmitButton({
  label,
  pending,
}: {
  label: string;
  pending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded-full bg-salamander-500 px-8 py-3 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Se salvează..." : label}
    </button>
  );
}
