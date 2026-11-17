import { SOCIAL_LINKS, type SocialNetwork } from "@/lib/social";

const ICONS: Record<SocialNetwork, { label: string; icon: React.ReactNode }> = {
  instagram: {
    label: "Instagram",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  facebook: {
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M13.6 21v-7.6h2.6l.5-3.1h-3.1V8.4c0-.9.4-1.6 1.7-1.6h1.5V4.1c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.3H8V13.4h2.6V21h3z" />
      </svg>
    ),
  },
  tiktok: {
    label: "TikTok",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M16.6 3h-3.1v11.7a2.2 2.2 0 1 1-2.2-2.2c.2 0 .4 0 .6.1V9.4a5.4 5.4 0 1 0 4.7 5.3V9a6.6 6.6 0 0 0 3.8 1.2V7.1c-2.1-.1-3.6-1.7-3.8-4.1z" />
      </svg>
    ),
  },
};

// Round icon links to the social media pages (only the networks that have a link).
export default function SocialIcons({ label }: { label: string }) {
  const networks = (Object.keys(ICONS) as SocialNetwork[]).filter(
    (n) => SOCIAL_LINKS[n],
  );
  if (networks.length === 0) return null;
  return (
    <ul aria-label={label} className="flex items-center gap-3">
      {networks.map((n) => (
        <li key={n}>
          <a
            href={SOCIAL_LINKS[n] as string}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={ICONS[n].label}
            title={ICONS[n].label}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-cream-50/30 text-cream-50 transition-colors hover:border-gold-300 hover:bg-gold-300 hover:text-choc"
          >
            {ICONS[n].icon}
          </a>
        </li>
      ))}
    </ul>
  );
}
