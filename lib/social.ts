// The social media pages of the shop (shown in the footer and in the structured data of
// the home page). A network without a link is simply not shown.
export type SocialNetwork = "instagram" | "facebook" | "tiktok";

export const SOCIAL_LINKS: Record<SocialNetwork, string | null> = {
  instagram: "https://www.instagram.com/idesignstudio.ro/",
  facebook: "https://www.facebook.com/idesignstudio.ro/",
  tiktok: "https://www.tiktok.com/@idesignstudio.ro",
};

export function socialUrls(): string[] {
  return Object.values(SOCIAL_LINKS).filter((u): u is string => Boolean(u));
}
