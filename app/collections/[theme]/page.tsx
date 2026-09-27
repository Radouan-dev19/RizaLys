import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionTitle } from "@/components/section-title";
import { floralThemes, getTheme } from "@/data/themes";

export function generateStaticParams() {
  return floralThemes.map((theme) => ({ theme: theme.slug }));
}

export default async function ThemeCollection({ params }: { params: Promise<{ theme: string }> }) {
  const { theme: slug } = await params;
  const theme = getTheme(slug);
  if (!theme) notFound();

  return (
    <main className="satin-page collection-page">
      <SectionTitle title={theme.title} subtitle={theme.tagline} />
      <p className="collection-intro">Trois créations singulières, composées autour d’un même écrin emblématique RizaLys.</p>
      <div className="collection-grid">
        {theme.bouquets.map((bouquet, index) => (
          <article className="collection-card" key={bouquet.id}>
            <div className="collection-image-wrap">
              <img src={bouquet.image} alt={bouquet.name} />
              <span>0{index + 1}</span>
            </div>
            <div className="collection-copy">
              <h2>{bouquet.name}</h2>
              <p>{bouquet.description}</p>
              <div className="collection-footer"><strong>{bouquet.price} €</strong><Link href={`/personnaliser?bouquet=${bouquet.id}`} className="outline-button">PERSONNALISER <span>→</span></Link></div>
            </div>
          </article>
        ))}
      </div>
      <Link href="/#creations" className="collection-back">← RETOUR AUX CRÉATIONS</Link>
    </main>
  );
}
