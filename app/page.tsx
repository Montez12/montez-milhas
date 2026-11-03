
type Offer = {
  id: string;
  source_name: string;
  source_url: string;
  title: string;
  category: "transferencia" | "passagem" | "compra_milhas";
  details: string | null;
  collected_at: string;
  expires_at: string | null;
};

const categoryLabels: Record<Offer["category"], string> = {
  transferencia: "Transferência bonificada",
  passagem: "Passagem com milhas",
  compra_milhas: "Compra de milhas",
};

async function getOffers(): Promise<Offer[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const getCategoryOffers = async (categoryFilter: string, limit: number): Promise<Offer[]> => {
    try {
      const response = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/offers?select=id,source_name,source_url,title,category,details,collected_at,expires_at&status=eq.active&or=(expires_at.is.null,expires_at.gt.${encodeURIComponent(new Date().toISOString())})&${categoryFilter}&order=collected_at.desc&limit=${limit}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  }
  const [promotions, flights] = await Promise.all([
    getCategoryOffers("category=neq.passagem", 50),
    getCategoryOffers("category=eq.passagem", 10),
  ]);
  const uniquePromotions = new Map<string, Offer>();
  for (const offer of promotions) {
    const title = offer.title.toLowerCase();
    let campaign = offer.id;
    if (offer.category === "transferencia") {
      if (title.includes("azul") && title.includes("livelo")) campaign = "livelo-azul";
      if (title.includes("porto") && title.includes("latam")) campaign = "porto-latam";
    }
    const identity = `${campaign}|${offer.expires_at}`;
    const existing = uniquePromotions.get(identity);
    if (!existing || offer.source_name === "Azul Fidelidade") {
      uniquePromotions.set(identity, offer);
    }
  }
  return [...uniquePromotions.values(), ...flights].sort((a, b) => Date.parse(b.collected_at) - Date.parse(a.collected_at));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export default async function Home() {
  const offers = await getOffers();
  const latest = offers[0]?.collected_at;
  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#inicio"><span className="brand-mark">M</span>montez<span className="brand-accent">milhas</span></a>
        <span className="status"><span className="status-dot" /> Coleta a cada 12 horas</span>
      </header>
      <div className="container" id="inicio">
        <section className="intro">
          <div className="eyebrow">SEU PRÓXIMO DESTINO COMEÇA AQUI</div>
          <h1>Mais possibilidades.<br /><span>Melhores oportunidades.</span></h1>
          <p>Transferências bonificadas, passagens com milhas e compra de pontos. Todas as ofertas em uma página.</p>
          <div className="summary"><strong>{offers.length} ofertas no painel</strong><span>{latest ? `Último registro · ${formatDate(latest)}` : "Aguardando novas ofertas"}</span></div>
        </section>
        <nav className="category-nav" aria-label="Ir para categoria">
          {Object.entries(categoryLabels).map(([category, label], index) => (
            <a href={`#${category}`} key={category}><span className="category-number">0{index + 1}</span>{label}<span className="nav-count">{offers.filter(offer => offer.category === category).length}</span></a>
          ))}
        </nav>
        {Object.entries(categoryLabels).map(([category, label], index) => {
          const matching = offers.filter(offer => offer.category === category);
          return (
            <section key={category} id={category} className={`offer-section ${category}`}>
              <div className="section-head">
                <div><span className="section-kicker">0{index + 1} / OPORTUNIDADES</span><h2>{label}</h2></div>
                <span className="section-count">{matching.length} {matching.length === 1 ? "oferta" : "ofertas"}</span>
              </div>
              {category === "passagem" && <p className="section-description">Saindo de São Paulo, com foco em EUA e Europa. Os valores indicam o preço por trecho.</p>}
              {matching.length ? (
                <div className="offer-grid">
                  {matching.map(offer => (
                    <article key={offer.id} className="offer-card">
                      <div className="card-top"><span className="offer-tag">{categoryLabels[offer.category]}</span><span className="recorded">Registrado em {formatDate(offer.collected_at)}</span></div>
                      <h3>{offer.title}</h3>
                      {offer.details && <p className="offer-details">{offer.details}</p>}
                      <div className="card-bottom">
                        <div className="source">Fonte · {offer.source_name}
                          {offer.expires_at && <span>{offer.category === "passagem" ? "Exibição até " : "Válido até "}{formatDate(offer.expires_at)}</span>}
                        </div>
                        <a className="offer-link" href={offer.source_url} target="_blank" rel="noreferrer">Ver oferta <span aria-hidden="true">↗</span></a>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className="empty-state"><span aria-hidden="true">◎</span><div><h3>Aguardando oportunidades</h3><p>Nenhuma oferta confirmada nesta categoria no momento. As próximas consultas serão feitas pelo coletor programado.</p></div></div>}
            </section>
          );
        })}
        <footer className="footer"><span>Montez Milhas · Projeto independente</span><span>Confira condições, taxas e disponibilidade na fonte antes de participar.</span></footer>
      </div>
    </main>
  );
}
