
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
  return [...promotions, ...flights].sort((a, b) => Date.parse(b.collected_at) - Date.parse(a.collected_at));
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
        <div className="brand"><span className="brand-mark">M</span>Montez Milhas</div>
        <nav className="nav" aria-label="Categorias">
          {Object.entries(categoryLabels).map(([category, label]) => (
            <a key={category} href={`#${category}`}>{label}</a>
          ))}
        </nav>
      </header>
      <section className="container">
        <h1>Ofertas de milhas e pontos</h1>
        <p>Coleta programada a cada 12 horas. {latest && `Última oferta registrada em ${formatDate(latest)}.`}</p>
        {Object.entries(categoryLabels).map(([category, label]) => {
          const matching = offers.filter(offer => offer.category === category);
          return (
            <section key={category} id={category} style={{marginTop: 32, scrollMarginTop: 96}}>
              <div className="section-head"><h2>{label}</h2><span className="status">{matching.length} ofertas</span></div>
              {category === "passagem" && <p>Ida e volta saindo de São Paulo, com foco em EUA e Europa. Confira a disponibilidade na fonte.</p>}
              {matching.length ? (
                <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 12}}>
                  {matching.map(offer => <article key={offer.id} className="stat"><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><span className="stat-label">{categoryLabels[offer.category] ?? offer.category}</span><span className="stat-note">Coletado em {formatDate(offer.collected_at)}</span></div><h3 style={{font:"700 17px Manrope,sans-serif",margin:"10px 0 6px"}}>{offer.title}</h3>{offer.details && <p style={{fontSize:13,color:"#70809a",lineHeight:1.6,margin:"0 0 10px"}}>{offer.details}</p>}<div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",fontSize:12}}><span style={{color:"#70809a"}}>Fonte: {offer.source_name}{offer.expires_at ? " · Válido até "+formatDate(offer.expires_at) : ""}</span><a href={offer.source_url} target="_blank" rel="noreferrer" style={{color:"#1769e0",fontWeight:700,textDecoration:"none"}}>Ver fonte original ↗</a></div></article>)}
                </div>
              ) : <div className="stat">Nenhuma oferta confirmada nesta categoria no momento.</div>}
            </section>
          );
        })}
      </section>
    </main>
  );
}
