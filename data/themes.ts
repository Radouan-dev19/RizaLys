export type Bouquet = {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
};

export type FloralTheme = {
  slug: "anniversaire" | "amour" | "retrouvailles";
  title: string;
  tagline: string;
  homeDescription: string;
  bouquets: Bouquet[];
};

export const floralThemes: FloralTheme[] = [
  {
    slug: "anniversaire",
    title: "Anniversaire",
    tagline: "DES COULEURS JOYEUSES POUR CÉLÉBRER CHAQUE INSTANT",
    homeDescription: "Un bouquet plein de vie pour\ncélébrer les plus beaux moments.",
    bouquets: [
      { id: "eclat-de-fete", name: "Éclat de Fête", description: "Une composition vive et généreuse, pensée comme une célébration.", image: "/images/creation-anniversaire.webp", price: 59 },
      { id: "soleil-anniversaire", name: "Soleil d’Anniversaire", description: "Renoncules solaires, roses corail et gerberas pour une journée lumineuse.", image: "/images/anniversaire-2.png", price: 62 },
      { id: "douce-celebration", name: "Douce Célébration", description: "Une harmonie pastel de pivoines, lisianthus et tulipes délicates.", image: "/images/anniversaire-3.png", price: 65 },
    ],
  },
  {
    slug: "amour",
    title: "Amour",
    tagline: "DES FLEURS PASSIONNÉES POUR DIRE L’ESSENTIEL",
    homeDescription: "Des roses d’exception pour\ndire je t’aime autrement.",
    bouquets: [
      { id: "passion-eternelle", name: "Passion Éternelle", description: "Le rouge dans toute sa profondeur, pour une déclaration inoubliable.", image: "/images/creation-amour.webp", price: 69 },
      { id: "velours-amour", name: "Velours d’Amour", description: "Roses bordeaux et renoncules veloutées dans une composition intense.", image: "/images/amour-2.png", price: 72 },
      { id: "promesse-pourpre", name: "Promesse Pourpre", description: "Pivoines, roses et callas sombres pour un amour rare et précieux.", image: "/images/amour-3.png", price: 76 },
    ],
  },
  {
    slug: "retrouvailles",
    title: "Retrouvailles",
    tagline: "DES COMPOSITIONS TENDRES POUR SE RETROUVER",
    homeDescription: "Un bouquet tendre pour\nles retrouvailles qui comptent.",
    bouquets: [
      { id: "tendres-retrouvailles", name: "Tendres Retrouvailles", description: "Des nuances pêche et crème pour célébrer le bonheur de se retrouver.", image: "/images/creation-retrouvailles.webp", price: 64 },
      { id: "lien-retrouve", name: "Lien Retrouvé", description: "Dahlias crème et roses abricot composent un accueil chaleureux.", image: "/images/retrouvailles-2.png", price: 68 },
      { id: "a-nouveau-reunis", name: "À Nouveau Réunis", description: "Hydrangeas ivoire, anémones et ranunculus dans une douceur retrouvée.", image: "/images/retrouvailles-3.png", price: 72 },
    ],
  },
];

export function getTheme(slug: string) {
  return floralThemes.find((theme) => theme.slug === slug);
}
