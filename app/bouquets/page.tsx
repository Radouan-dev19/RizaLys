import Image from "next/image";
import Link from "next/link";
import { SectionTitle } from "@/components/section-title";
import { readyBouquets } from "@/data/bouquets";

export default function BouquetsPage() {
  return (
    <main className="satin-page catalogue-page">
      <SectionTitle title="Tous nos Bouquets" subtitle="20 CRÉATIONS PRÊTES À OFFRIR" />
      <p className="catalogue-intro">
        Des bouquets déjà composés par nos fleuristes, présentés dans le vase blanc RizaLys de nos créations.
        Choisissez simplement celui qui vous ressemble.
      </p>
      <div className="catalogue-grid">
        {readyBouquets.map((bouquet, index) => (
          <article className="catalogue-card" key={bouquet.id}>
            <div className="catalogue-image">
              <Image src={bouquet.image} alt={`Bouquet ${bouquet.name} dans le vase blanc RizaLys`} fill sizes="(max-width: 700px) 92vw, (max-width: 1050px) 45vw, 25vw" />
              <span className="catalogue-number">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="catalogue-copy">
              <span className="ready-label">PRÊT À OFFRIR · VASE INCLUS</span>
              <h2>{bouquet.name}</h2>
              <p>{bouquet.composition}</p>
              <div className="catalogue-price"><strong>{bouquet.price}€</strong><span>TTC</span></div>
            </div>
          </article>
        ))}
      </div>
      <Link href="/#apropos" className="collection-back">← RETOUR À LA SÉLECTION</Link>
    </main>
  );
}
