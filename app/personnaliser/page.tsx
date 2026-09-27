"use client";

import { ArrowRight, Check, Minus, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { SectionTitle } from "@/components/section-title";
import { useCart } from "@/components/cart-context";
import { EXTRAS, FLOWERS, FLOWER_PLURALS, WRAPS } from "@/data/catalog";

function StepHeading({ number, title, text }: { number: number; title: string; text: string }) {
  return <div className="step-heading"><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></div>;
}

function GoToCartButton({ itemCount, onClick, total }: { itemCount: number; onClick: () => void; total: number }) {
  return <div className="go-to-cart-wrap">
    <button className="go-to-cart-button" type="button" onClick={onClick}>
      <span className="go-to-cart-icon"><ShoppingBag /><span>{itemCount}</span></span>
      <span className="go-to-cart-copy"><small>Votre sélection est enregistrée</small><strong>Aller au panier</strong></span>
      <span className="go-to-cart-total"><strong>{total} €</strong><ArrowRight /></span>
    </button>
  </div>;
}

export default function Personnaliser() {
  const cart = useCart();
  const currentMonth = new Date().getMonth() + 1;
  const currentSeason = currentMonth >= 9 && currentMonth <= 11 ? "Automne" : currentMonth >= 6 && currentMonth <= 8 ? "Été" : currentMonth >= 3 && currentMonth <= 5 ? "Printemps" : "Hiver";
  const selectedWrap = WRAPS.find((item) => item.id === cart.wrap) ?? WRAPS[1];
  const selectedFlowers = FLOWERS.filter((item) => cart.flowers[item.id] > 0);
  const totalFlowerCount = selectedFlowers.reduce((total, item) => total + cart.flowers[item.id], 0);
  const bouquetSize = totalFlowerCount <= 1 ? "solo" : totalFlowerCount <= 3 ? "small" : totalFlowerCount <= 6 ? "medium" : "large";
  const previewFlowers = selectedFlowers.flatMap((item) => Array.from({ length: Math.min(cart.flowers[item.id], 3) }, () => item)).slice(0, 9);
  const flowerSummary = selectedFlowers.map((item) => `${cart.flowers[item.id]} ${cart.flowers[item.id] > 1 ? FLOWER_PLURALS[item.id] : item.name}`).join(", ");

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("cart") !== "open") return;
    cart.setDrawerOpen(true);
    url.searchParams.delete("cart");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [cart]);

  return (
    <main className="satin-page custom-page">
      <SectionTitle title="Personnalise ton Bouquet" subtitle="CRÉE UN BOUQUET UNIQUE, À TON IMAGE" />
      <section className="custom-step">
        <StepHeading number={1} title="Choix de l’Écrin" text="Sélectionne le papier d’emballage qui sublimera ton bouquet." />
        <div className="option-grid wrap-grid">
          {WRAPS.map((item) => {
            const selected = cart.wrap === item.id;
            return <button className={selected ? "wrap-card selected" : "wrap-card"} key={item.id} onClick={() => cart.selectWrap(item.id)} aria-pressed={selected}>
              <img src={item.image} alt={item.name} /><span className="radio-mark">{selected && <Check />}</span><strong>{item.name}</strong><small>{item.text}</small>
            </button>;
          })}
        </div>
      </section>
      <section className="custom-step flowers-step">
        <StepHeading number={2} title="Fleurs à l’Unité" text={`Sélection ${currentSeason.toLowerCase()} · priorité aux fleurs actuellement disponibles.`} />
        <div className="season-note"><span>{currentSeason}</span><p>Les fleurs signalées « en saison » sont privilégiées par notre atelier. Les autres variétés sont proposées en quantité limitée, selon les arrivages locaux.</p></div>
        <div className="option-grid flower-grid">
          {FLOWERS.map((item) => {
            const inSeason = item.months.includes(currentMonth) && !item.limited;
            return <article className={inSeason ? "flower-card flower-card--season" : "flower-card flower-card--limited"} key={item.id}>
            <span className="availability-badge">{inSeason ? "EN SAISON" : "STOCK LIMITÉ"}</span><img src={item.image} alt={item.name} /><h3>{item.name}</h3><div className="unit-price"><strong>{item.price} €</strong><span>/ tige</span></div>
            <div className="quantity-control"><button onClick={() => cart.changeFlower(item.id, -1)} aria-label={`Retirer une ${item.name}`}><Minus /></button><span>{cart.flowers[item.id]}</span><button onClick={() => cart.changeFlower(item.id, 1)} aria-label={`Ajouter une ${item.name}`}><Plus /></button></div>
          </article>;})}
        </div>
      </section>
      <GoToCartButton itemCount={cart.itemCount} onClick={() => cart.setDrawerOpen(true)} total={cart.total} />
      <section className="bouquet-preview-section">
        <StepHeading number={3} title="Votre Bouquet en Aperçu" text="Un aperçu instantané, adapté automatiquement à votre sélection." />
        <div className="bouquet-preview-panel">
          <div className={`bouquet-canvas bouquet-canvas--${cart.wrap ?? "gold"} bouquet-canvas--${bouquetSize}`}>
            <span className="preview-season">COMPOSITION {currentSeason.toUpperCase()}</span>
            {previewFlowers.length ? <div className="preview-flowers">
              {previewFlowers.map((item, index) => <img className={`preview-flower preview-flower--${index % 9}`} key={`${item.id}-${index}`} src={item.image} alt="" />)}
            </div> : <p className="preview-empty">Ajoutez quelques fleurs pour faire apparaître votre composition.</p>}
            <div className="preview-paper" aria-label={selectedWrap.name} />
            <div className="preview-label"><strong>RizaLys</strong><span>{selectedWrap.name}</span></div>
          </div>
          <div className="preview-copy">
            <span className="eyebrow"><Sparkles /> APERÇU AUTOMATIQUE HAUTE DÉFINITION</span>
            <h2>Votre création,<br />générée ici.</h2>
            <p>Sélectionnez vos fleurs et votre bouquet se compose automatiquement. Il sera enveloppé dans l’écrin que vous avez choisi.</p>
            <p>L’image générée n’est pas représentative du rendu final : elle donne simplement un aperçu de votre composition.</p>
            <div className="preview-selection"><span>ÉCRIN</span><strong>{selectedWrap.name}</strong><span>FLEURS</span><strong>{flowerSummary || "Aucune fleur sélectionnée"}</strong></div>
            <p className="chatgpt-note">Le rendu est composé localement avec les visuels floraux haute définition RizaLys. Il reste net, complet et fidèle à vos quantités, sans dépendre d’un générateur gratuit de qualité variable.</p>
          </div>
        </div>
      </section>
      <section className="extras-section">
        <SectionTitle title="Les Petites Attentions" subtitle="DES EXTRAS QUI FONT TOUTE LA DIFFÉRENCE" compact />
        <div className="option-grid extras-grid">
          {EXTRAS.map((item) => {
            const active = cart.extras[item.id];
            return <article className="extra-card" key={item.id}><img src={item.image} alt={item.name} /><h3>{item.name}</h3><div className="extra-price">{item.price} €</div><button className={active ? "outline-button selected" : "outline-button"} onClick={() => cart.toggleExtra(item.id)}><ShoppingBag />{active ? "RETIRER" : "AJOUTER"}</button></article>;
          })}
        </div>
        <GoToCartButton itemCount={cart.itemCount} onClick={() => cart.setDrawerOpen(true)} total={cart.total} />
      </section>
    </main>
  );
}
