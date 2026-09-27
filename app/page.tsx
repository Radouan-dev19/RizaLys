import Link from "next/link";
import { SectionTitle } from "@/components/section-title";
import { floralThemes } from "@/data/themes";

const budgets = [
  { price: 35, text: "Le parfait équilibre\nentre élégance et simplicité.", image: "/images/budget-35.webp" },
  { price: 55, text: "Un bouquet généreux\npour faire plaisir.", image: "/images/budget-55.webp" },
  { price: 85, text: "L’exceptionnel pour\nles grands moments.", image: "/images/budget-85.webp" },
];

export default function Home() {
  return (
    <main className="satin-page home-page">
      <section className="creations-section" id="creations">
        <SectionTitle title="Nos Créations" subtitle="DES BOUQUETS D’EXCEPTION POUR CHAQUE ÉMOTION" />
        <div className="creation-grid">
          {floralThemes.map((theme) => (
            <article className="creation-card" key={theme.slug}>
              <div className="creation-visual" aria-label={`Les trois bouquets ${theme.title}`}>
                {theme.bouquets.map((bouquet) => <img key={bouquet.id} src={bouquet.image} alt={bouquet.name} />)}
                <span className="hover-hint">SURVOLEZ POUR DÉCOUVRIR</span>
              </div>
              <div className="creation-copy"><h2>{theme.title}</h2><p>{theme.homeDescription}</p><Link href={`/collections/${theme.slug}`} className="outline-button">DÉCOUVRIR <span>→</span></Link></div>
            </article>
          ))}
        </div>
      </section>
      <section className="budget-section" id="apropos">
        <SectionTitle title="Sélection par Budget" subtitle="DES BOUQUETS POUR TOUS LES INSTANTS" compact />
        <div className="budget-grid">
          {budgets.map((item) => (
            <article className="budget-card" key={item.price}>
              <img src={item.image} alt={`Bouquet à environ ${item.price} euros`} />
              <div className="price-circle"><strong>{item.price}€</strong><span>ENVIRON</span></div>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <Link href="/bouquets" className="outline-button budget-cta">VOIR TOUS LES BOUQUETS <span>→</span></Link>
      </section>
      <section className="compose-home-section" id="composer">
        <SectionTitle title="Composez votre Bouquet" subtitle="DES FLEURS DE SAISON, CHOISIES PAR VOUS" compact />
        <div className="compose-home-content">
          <div className="compose-home-visual" aria-hidden="true">
            <span className="season-ribbon">SÉLECTION D’AUTOMNE</span>
            <img className="compose-paper" src="/images/wrap-gold.webp" alt="" />
            <img className="compose-flower compose-flower--one" src="/images/flower-dahlia.png" alt="" />
            <img className="compose-flower compose-flower--two" src="/images/flower-aster.png" alt="" />
            <img className="compose-flower compose-flower--three" src="/images/flower-hydrangea.png" alt="" />
          </div>
          <div className="compose-home-copy">
            <span className="eyebrow">VOTRE CRÉATION, À VOTRE IMAGE</span>
            <h2>Fleurs fraîches,<br />composition unique.</h2>
            <p>Choisissez votre écrin, composez avec les fleurs disponibles cette saison et générez gratuitement une proposition réaliste sans quitter RizaLys.</p>
            <ul><li>Disponibilités adaptées à la saison</li><li>Aperçu instantané sans frais</li><li>Rendu IA gratuit directement sur le site</li></ul>
            <Link href="/personnaliser" className="outline-button">COMPOSER MON BOUQUET <span>→</span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
