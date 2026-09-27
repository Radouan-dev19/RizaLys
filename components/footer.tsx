import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { FloralMark } from "./floral-mark";

const navigation = [
  { href: "/", label: "Accueil" },
  { href: "/bouquets", label: "Nos bouquets" },
  { href: "/personnaliser", label: "Créer mon bouquet" },
  { href: "/#apropos", label: "À propos" },
];

const collections = [
  { href: "/collections/anniversaire", label: "Anniversaire" },
  { href: "/collections/amour", label: "Amour" },
  { href: "/collections/retrouvailles", label: "Retrouvailles" },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link href="/" className="footer-logo" aria-label="RizaLys - Accueil">
            <FloralMark />
            <span>RizaLys</span>
          </Link>
          <p>Des créations florales pensées pour transmettre vos émotions et accompagner les moments qui comptent.</p>
          <span className="footer-signature">ART FLORAL &amp; ÉMOTIONS</span>
        </div>

        <nav className="footer-column" aria-label="Navigation du pied de page">
          <h2>Explorer</h2>
          {navigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
        </nav>

        <nav className="footer-column" aria-label="Nos collections">
          <h2>Collections</h2>
          {collections.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
        </nav>

        <div className="footer-contact">
          <span className="footer-kicker">UNE QUESTION ?</span>
          <h2>Parlons de votre bouquet.</h2>
          <p>Notre atelier vous accompagne dans le choix d’une création qui vous ressemble.</p>
          <a className="footer-contact-link" href="mailto:bonjour@rizalys.fr">
            <Mail aria-hidden="true" />
            <span>bonjour@rizalys.fr</span>
            <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} RizaLys. Tous droits réservés.</p>
        <div><span>Visuels non contractuels</span><span>Conçu avec soin</span></div>
      </div>
    </footer>
  );
}
