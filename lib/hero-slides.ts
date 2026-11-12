// The photos of the homepage slideshow, in the order they appear. Every photo is 4:3
// (public/images/hero/). To add, remove or reorder one, change this list: the dots
// under the slideshow follow the number of items by themselves.
//
// `href` is the page a click opens (without the language). The titles are working
// names until each photo has its own product page: then put the product's page and
// name here.

export type HeroSlide = {
  image: string;
  title: { ro: string; en: string };
  href: string;
  // where the photo is cut when the frame is wider than 4:3, e.g. "50% 40%"
  focus?: string;
};

const SEASON = "/home-lifestyle/sezon-si-cadouri";

export const HERO_SLIDES: HeroSlide[] = [
  {
    image: "/images/hero/hero-1.jpg",
    title: { ro: "Set reni decorativi", en: "Decorative reindeer set" },
    href: SEASON,
    focus: "50% 30%",
  },
  {
    image: "/images/hero/hero-2.jpg",
    title: { ro: "Brazi decorativi", en: "Decorative Christmas trees" },
    href: SEASON,
    focus: "50% 42%",
  },
  {
    image: "/images/hero/hero-3.jpg",
    title: { ro: "Globuri de Crăciun", en: "Christmas baubles" },
    href: SEASON,
    focus: "50% 50%",
  },
  {
    image: "/images/hero/hero-4.jpg",
    title: { ro: "Clopoței decorativi", en: "Decorative bells" },
    href: SEASON,
    focus: "50% 45%",
  },
  {
    image: "/images/hero/hero-5.jpg",
    title: { ro: "Ornamente brad suspendate", en: "Hanging tree ornaments" },
    href: SEASON,
    focus: "50% 45%",
  },
  {
    image: "/images/hero/hero-6.jpg",
    title: { ro: "Reni cu fular", en: "Reindeer with scarves" },
    href: SEASON,
    focus: "50% 30%",
  },
  {
    image: "/images/hero/hero-7.jpg",
    title: { ro: "Stele de Crăciun", en: "Christmas stars" },
    href: SEASON,
    focus: "50% 40%",
  },
  {
    image: "/images/hero/hero-8.jpg",
    title: { ro: "Brazi alb-negru", en: "Black and white trees" },
    href: SEASON,
    focus: "50% 38%",
  },
];
