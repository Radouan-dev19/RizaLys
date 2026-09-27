export type WrapId = "white" | "gold" | "embossed";
export type FlowerId = "dahlia" | "aster" | "hydrangea" | "eucalyptus" | "rose" | "lily";
export type ExtraId = "companion" | "chocolate" | "protector";

export type WrapDefinition = {
  id: WrapId;
  name: string;
  text: string;
  image: string;
  price: number;
};

export type FlowerDefinition = {
  id: FlowerId;
  name: string;
  plural: string;
  price: number;
  image: string;
  months: number[];
  limited?: boolean;
};

export type ExtraDefinition = {
  id: ExtraId;
  name: string;
  price: number;
  image: string;
};

export const WRAPS: readonly WrapDefinition[] = [
  { id: "white", name: "Papier de soie blanc", text: "L’élégance dans sa plus grande\npureté.", image: "/images/wrap-white.webp", price: 0 },
  { id: "gold", name: "Kraft doré", text: "Un éclat de luxe pour\nun bouquet d’exception.", image: "/images/wrap-gold.webp", price: 0 },
  { id: "embossed", name: "Papier gaufré", text: "Une touche de raffinement\net de caractère.", image: "/images/wrap-embossed.webp", price: 0 },
];

export const FLOWERS: readonly FlowerDefinition[] = [
  { id: "dahlia", name: "Dahlia corail", plural: "Dahlias corail", price: 7, image: "/images/flower-dahlia.png", months: [6, 7, 8, 9, 10] },
  { id: "aster", name: "Aster violet", plural: "Asters violets", price: 4, image: "/images/flower-aster.png", months: [8, 9, 10] },
  { id: "hydrangea", name: "Hortensia ancien", plural: "Hortensias anciens", price: 8, image: "/images/flower-hydrangea.png", months: [6, 7, 8, 9, 10] },
  { id: "eucalyptus", name: "Eucalyptus", plural: "Eucalyptus", price: 4, image: "/images/flower-eucalyptus.webp", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { id: "rose", name: "Rose rouge", plural: "Roses rouges", price: 5, image: "/images/flower-rose.webp", months: [], limited: true },
  { id: "lily", name: "Lys rose", plural: "Lys roses", price: 6, image: "/images/flower-lily.webp", months: [5, 6, 7, 8], limited: true },
];

export const EXTRAS: readonly ExtraDefinition[] = [
  { id: "companion", name: "Le Compagnon Doux", price: 15, image: "/images/extra-compagnon.webp" },
  { id: "chocolate", name: "La Douceur Suprême", price: 18, image: "/images/extra-douceur.webp" },
  { id: "protector", name: "Le Grand Protecteur", price: 45, image: "/images/extra-protecteur.webp" },
];

export const WRAP_BY_ID = Object.fromEntries(WRAPS.map((item) => [item.id, item])) as Record<WrapId, WrapDefinition>;
export const FLOWER_BY_ID = Object.fromEntries(FLOWERS.map((item) => [item.id, item])) as Record<FlowerId, FlowerDefinition>;
export const EXTRA_BY_ID = Object.fromEntries(EXTRAS.map((item) => [item.id, item])) as Record<ExtraId, ExtraDefinition>;

export const FLOWER_PRICES = Object.fromEntries(FLOWERS.map((item) => [item.id, item.price])) as Record<FlowerId, number>;
export const EXTRA_PRICES = Object.fromEntries(EXTRAS.map((item) => [item.id, item.price])) as Record<ExtraId, number>;
export const FLOWER_PLURALS = Object.fromEntries(FLOWERS.map((item) => [item.id, item.plural])) as Record<FlowerId, string>;

export const CART_LABELS = {
  wraps: Object.fromEntries(WRAPS.map((item) => [item.id, item.name])) as Record<WrapId, string>,
  flowers: Object.fromEntries(FLOWERS.map((item) => [item.id, item.name])) as Record<FlowerId, string>,
  extras: Object.fromEntries(EXTRAS.map((item) => [item.id, item.name])) as Record<ExtraId, string>,
};
