"use client";

import Link from "next/link";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FloralMark } from "./floral-mark";
import { CartDrawer } from "./cart-drawer";
import { useCart } from "./cart-context";

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount, setDrawerOpen } = useCart();
  const links = [
    ["/", "Accueil"],
    ["/#creations", "Nos Créations"],
    ["/#apropos", "À propos"],
    ["/mon-compte", "Mon compte"],
    ["mailto:bonjour@rizalys.fr", "Contact"],
  ];

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="RizaLys - Accueil">
          <FloralMark />
          <span className="brand-name brand-name--rizalys">RizaLys</span>
          <span className="brand-tagline">ART FLORAL &amp; ÉMOTIONS</span>
        </Link>
        <nav className={menuOpen ? "main-nav main-nav--open" : "main-nav"} aria-label="Navigation principale">
          {links.map(([href, label]) => (
            <Link key={label} href={href} onClick={() => setMenuOpen(false)} className={pathname === href ? "active" : ""}>{label}</Link>
          ))}
        </nav>
        <div className="header-actions">
          <button aria-label="Rechercher" className="icon-button"><Search /></button>
          <Link href="/mon-compte" className="icon-button account-icon" aria-label="Mon compte"><UserRound /></Link>
          <button aria-label={`Panier, ${itemCount} article${itemCount > 1 ? "s" : ""}`} className="icon-button bag-button" onClick={() => setDrawerOpen(true)}>
            <ShoppingBag />{itemCount > 0 && <span className="bag-count">{itemCount}</span>}
          </button>
          <button className="menu-button" aria-label="Ouvrir le menu" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>
      <CartDrawer />
    </>
  );
}
