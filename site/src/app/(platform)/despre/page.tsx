import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
export const metadata = {
  title: "Despre Pinbind — Licitații în era video",
  description:
    "Descoperă Pinbind: o platformă de licitații în care produsele sunt prezentate prin video. Află cum explorezi, urmărești și publici anunțuri.",
};
const pillars: {
  number: string;
  icon: IconName;
  title: string;
  text: string;
  link: string;
  href: string;
}[] = [
  {
    number: "01",
    icon: "video",
    title: "Produse în mișcare",
    text: "Prezentările video îți oferă o perspectivă mai apropiată asupra produsului. Urmărește detaliile, forma și felul în care arată în utilizare.",
    link: "Descoperă prezentările",
    href: "/explore",
  },
  {
    number: "02",
    icon: "gavel",
    title: "Oferte la vedere",
    text: "Prețul curent, pasul minim și timpul rămas sunt afișate pe pagina anunțului. Verifică informațiile înainte de a confirma o ofertă în aplicație.",
    link: "Vezi licitațiile active",
    href: "/explore?stage=live",
  },
  {
    number: "03",
    icon: "user",
    title: "Legături directe",
    text: "Produsele sunt prezentate de vânzători. Cere detaliile care contează pentru tine și clarifică starea produsului și predarea prin aplicație.",
    link: "Explorează produsele",
    href: "/explore",
  },
  {
    number: "04",
    icon: "heart",
    title: "Descoperiri personale",
    text: "Urmărește ofertele, favoritele și anunțurile tale într-un singur cont. Revino la produsele care te interesează și continuă de unde ai rămas.",
    link: "Deschide contul tău",
    href: "/cont",
  },
];
const audiences = [
  {
    image: "collectors",
    tag: "Curiozitate • Detalii",
    title: "Pentru cei cu pasiuni",
    label: "Descoperă ceea ce merită păstrat",
    text: "De la obiecte de colecție la produse pentru viața de zi cu zi, descoperirile încep cu o privire atentă și cu întrebările potrivite.",
    note: "Explorează în ritmul tău",
    icon: "search" as const,
    href: "/explore",
  },
  {
    image: "buyers",
    tag: "Alegeri • Perspective",
    title: "Pentru cumpărători",
    label: "Mai mult context înainte de ofertă",
    text: "Vezi produsul în mișcare, compară anunțurile și urmărește licitațiile care te interesează. Verifică detaliile și discută cu vânzătorul în aplicație.",
    note: "Urmărește ofertele din cont",
    icon: "gavel" as const,
    href: "/cont",
  },
  {
    image: "sellers",
    tag: "Prezentare • Poveste",
    title: "Pentru vânzători",
    label: "Arată ce face produsul special",
    text: "O prezentare video pune detaliile în prim-plan. Publică anunțul din aplicația Pinbind, după aprobarea contului de vânzător, și fă-l vizibil în catalog.",
    note: "Gestionează anunțurile tale",
    icon: "video" as const,
    href: "/cont",
  },
];
function StatsGrid({
  active,
  ending,
}: {
  active: number | null;
  ending: number | null;
}) {
  const stats = [
    {
      label: "Anunțuri active",
      value: active ?? "—",
      text: "Produse disponibile în platformă la momentul încărcării paginii.",
    },
    {
      label: "Se încheie în 24h",
      value: ending ?? "—",
      text: "Licitații active care se apropie de final. Verifică ora pe pagina produsului.",
    },
    {
      label: "Moneda licitațiilor",
      value: "RON",
      text: "Prețul curent și pasul de licitare sunt afișate în lei românești.",
    },
    {
      label: "În centrul experienței",
      value: "Video",
      text: "Prezentări ale produselor care adaugă context descrierii vânzătorului.",
    },
  ];
  return (
    <div className="about-stats-grid">
      {stats.map((stat) => (
        <article key={stat.label}>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
          <p>{stat.text}</p>
        </article>
      ))}
    </div>
  );
}
async function PlatformStats() {
  let stats: { activeTotal: number; endingToday: number } | null = null;
  try {
    const base = (
      process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3000"
    ).replace(/\/$/, "");
    const response = await fetch(`${base}/products/catalog?limit=1`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) stats = (await response.json()).stats;
  } catch {
    /* Counts stay unavailable while the editorial content remains readable. */
  }
  return (
    <>
      <StatsGrid
        active={stats?.activeTotal ?? null}
        ending={stats?.endingToday ?? null}
      />
      {!stats && (
        <p className="about-stats-note" role="status">
          Statisticile nu sunt disponibile momentan. Poți continua în catalog.
        </p>
      )}
    </>
  );
}
export default function AboutPage() {
  return (
    <main id="catalog" className="about-page">
      <section className="about-hero">
        <div className="about-container">
          <div className="about-issue">
            <div>
              <Image src="/pinbind-icon.svg" alt="" width={28} height={28} />
              <span>Manifestul Pinbind</span>
            </div>
            <span>Perspective noi. Detalii care contează.</span>
          </div>
          <div className="about-hero-heading">
            <div>
              <span className="eyebrow">
                Produse cu poveste, prezentate prin video
              </span>
              <h1>
                O altă perspectivă asupra licitațiilor.
                <br />
                În era video.
              </h1>
            </div>
            <p>
              Credem că o alegere bună începe cu o privire mai atentă. Pinbind
              aduce produsele în mișcare, ofertele și oamenii care le prezintă
              în același loc.
            </p>
          </div>
          <div className="about-mosaic">
            <Link
              href="/explore"
              className="about-motion-study"
              aria-label="Descoperă anunțurile video din catalog"
            >
              <Image
                src="/about/watch-detail.jpg"
                alt="Detaliu al mecanismului unui ceas, surprins în lumină de studio"
                fill
                sizes="(max-width:900px) 100vw, 60vw"
                priority
              />
              <div>
                <span>O perspectivă mai apropiată</span>
                <h2>Fiecare detaliu are o poveste.</h2>
              </div>
              <span className="about-study-arrow">
                <Icon name="arrow" size={22} />
              </span>
            </Link>
            <div className="about-mosaic-notes">
              <article>
                <div>
                  <span>De ce video?</span>
                  <span>001 / Perspectivă</span>
                </div>
                <p>
                  O fotografie surprinde un moment. Un videoclip adaugă mișcare,
                  unghiuri și context. Împreună cu descrierea și răspunsurile
                  vânzătorului, te ajută să înțelegi mai bine produsul.
                </p>
                <span>
                  <Icon name="video" size={21} />
                  Mai aproape de ceea ce alegi
                </span>
              </article>
              <div className="about-mosaic-callout">
                <div>
                  <span>Principiul nostru</span>
                  <h3>Detaliile fac diferența.</h3>
                </div>
                <Icon name="search" size={24} />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="about-pillars" id="principii">
        <div className="about-container">
          <div className="about-section-heading">
            <div>
              <span className="eyebrow">Experiența Pinbind</span>
              <h2>Patru repere pentru următoarea descoperire.</h2>
            </div>
            <p>
              O platformă construită în jurul prezentărilor video, informațiilor
              despre licitații și alegerilor personale.
            </p>
          </div>
          <div className="about-pillar-grid">
            {pillars.map((pillar) => (
              <article key={pillar.number}>
                <div className="about-pillar-top">
                  <span>
                    <Icon name={pillar.icon} size={23} />
                  </span>
                  <span>Reper {pillar.number}</span>
                </div>
                <h3>{pillar.title}</h3>
                <p>{pillar.text}</p>
                <Link href={pillar.href}>
                  {pillar.link}
                  <Icon name="arrow" size={16} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="about-audiences about-container">
        <div className="about-section-heading">
          <div>
            <span className="eyebrow">O platformă, perspective diferite</span>
            <h2>Descoperirile încep cu oamenii.</h2>
          </div>
          <p>
            Fie că explorezi, cumperi sau vinzi, detaliile și dialogul te ajută
            să faci următorul pas.
          </p>
        </div>
        <div className="about-audience-grid">
          {audiences.map((person) => (
            <article key={person.image}>
              <div className="about-audience-image">
                <Image
                  src={`/about/${person.image}.jpg`}
                  alt="Portret ilustrativ pentru comunitatea Pinbind"
                  fill
                  sizes="(max-width:650px) 100vw, 33vw"
                />
                <span>{person.tag}</span>
              </div>
              <div className="about-audience-copy">
                <h3>{person.title}</h3>
                <span>{person.label}</span>
                <p>{person.text}</p>
                <Link href={person.href}>
                  <Icon name={person.icon} size={17} />
                  {person.note}
                  <Icon name="arrow" size={15} />
                </Link>
              </div>
            </article>
          ))}
        </div>
        <p className="about-image-note">
          Portrete ilustrative ale perspectivelor din comunitate.
        </p>
      </section>
      <section className="about-platform">
        <div className="about-container">
          <div className="about-section-heading">
            <div>
              <span className="eyebrow">Pinbind, în prezent</span>
              <h2>Informații care te ajută să alegi.</h2>
            </div>
            <p>
              Un punct de pornire pentru explorarea platformei. Prețurile și
              disponibilitatea se verifică pe pagina fiecărui anunț.
            </p>
          </div>
          <Suspense fallback={<StatsGrid active={null} ending={null} />}>
            <PlatformStats />
          </Suspense>
          <div className="about-platform-banner">
            <div>
              <span>
                <Icon name="video" size={28} />
              </span>
              <div>
                <h3>Din catalog, mai aproape de produs.</h3>
                <p>
                  Vezi prezentarea, citește descrierea și continuă în aplicație
                  pentru a licita sau a discuta cu vânzătorul.
                </p>
              </div>
            </div>
            <ol aria-label="Pașii unei descoperiri">
              <li>
                <span>01</span>Descoperă
              </li>
              <li>
                <span>02</span>Verifică
              </li>
              <li>
                <span>03</span>Alege
              </li>
            </ol>
          </div>
        </div>
      </section>
      <section className="about-container about-cta">
        <div>
          <span className="about-cta-icon">
            <Icon name="video" size={24} />
          </span>
          <h2>
            Următoarea ta descoperire
            <br />
            poate fi deja aici.
          </h2>
          <p>
            Explorează anunțurile video, găsește ceea ce te inspiră și continuă
            în aplicația Pinbind când ești pregătit să faci o ofertă.
          </p>
          <div className="about-cta-actions">
            <Link href="/explore?stage=live" className="button">
              Explorează licitațiile
              <Icon name="arrow" size={17} />
            </Link>
            <Link href="/cont">
              Deschide contul tău
              <Icon name="user" size={17} />
            </Link>
          </div>
          <div className="about-cta-notes">
            <span>
              <Icon name="video" size={16} />
              Prezentări video
            </span>
            <span>
              <Icon name="gavel" size={16} />
              Oferte în RON
            </span>
            <span>
              <Icon name="heart" size={16} />
              Descoperiri personale
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
