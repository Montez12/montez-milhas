import { Plane, Repeat2, Coins, ShieldCheck, Clock3, Radar, TrendingUp } from "lucide-react";

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

const categories = ["Todas", "Transferência bonificada", "Passagens com milhas", "Compra de milhas"];
const categoryLabels: Record<Offer["category"], string> = {
  transferencia: "Transferência bonificada",
  passagem: "Passagem com milhas",
  compra_milhas: "Compra de milhas",
};

async function getOffers(): Promise<Offer[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/offers?select=id,source_name,source_url,title,category,details,collected_at,expires_at&status=eq.active&order=collected_at.desc&limit=50`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }
    );
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export default async function Home() {
  const offers = await getOffers();
  const latest = offers[0]?.collected_at;
  return <main className="shell">
<header className="topbar"><div className="brand"><span className="brand-mark">M</span><span>montez<span style={{color:"#1769e0"}}>milhas</span></span></div><nav className="nav"><a href="#oportunidades">Oportunidades</a><a href="#como-funciona">Como funciona</a><a href="#fontes">Fontes monitoradas</a></nav><span className="status">● {offers.length ? "Dados conectados" : "Monitoramento em configuração"}</span></header>
<section className="hero"><div className="hero-inner"><div className="eyebrow">Inteligência para suas viagens</div><h1>Suas próximas milhas.<br/>Melhores oportunidades.</h1><p>Encontre transferências bonificadas, passagens aéreas com milhas e ofertas de compra em um só lugar. Compare oportunidades antes de tomar sua decisão.</p><div className="hero-pills"><span><Repeat2 size={14} style={{display:"inline",verticalAlign:"middle",marginRight:6}}/>Bônus de transferência</span><span><Plane size={14} style={{display:"inline",verticalAlign:"middle",marginRight:6}}/>Voos saindo de SP</span><span><Coins size={14} style={{display:"inline",verticalAlign:"middle",marginRight:6}}/>Compra de milhas</span></div></div></section>
<section className="container" id="oportunidades"><div className="section-head"><div><h2>Painel de oportunidades</h2><p>Ofertas verificadas e organizadas para facilitar sua comparação.</p></div><span className="status"><Clock3 size={12} style={{display:"inline",verticalAlign:"middle",marginRight:5}}/>Atualização automática planejada: 5 min</span></div>
<div className="stats"><div className="stat"><div className="stat-label">Ofertas ativas</div><div className="stat-value">{offers.length}</div><div className="stat-note">Registros ativos no banco de dados</div></div><div className="stat"><div className="stat-label">Categorias acompanhadas</div><div className="stat-value">3</div><div className="stat-note">Transferências, passagens e compra</div></div><div className="stat"><div className="stat-label">Última coleta</div><div className="stat-value" style={{fontSize:19}}>{latest ? formatDate(latest) : "Pendente"}</div><div className="stat-note">{latest ? "Horário da última oferta recebida" : "Aguardando primeira oferta verificada"}</div></div></div>
<div className="filters">{categories.map((item,i)=><span className={i===0?"filter active":"filter"} key={item}>{item}</span>)}</div>
{offers.length ? <div style={{display:"grid",gap:12}}>{offers.map(offer=><article key={offer.id} className="stat"><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><span className="stat-label">{categoryLabels[offer.category] ?? offer.category}</span><span className="stat-note">Coletado em {formatDate(offer.collected_at)}</span></div><h3 style={{font:"700 17px Manrope,sans-serif",margin:"10px 0 6px"}}>{offer.title}</h3>{offer.details && <p style={{fontSize:13,color:"#70809a",lineHeight:1.6,margin:"0 0 10px"}}>{offer.details}</p>}<div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",fontSize:12}}><span style={{color:"#70809a"}}>Fonte: {offer.source_name}{offer.expires_at ? " · Válido até "+formatDate(offer.expires_at) : ""}</span><a href={offer.source_url} target="_blank" rel="noreferrer" style={{color:"#1769e0",fontWeight:700,textDecoration:"none"}}>Ver fonte original ↗</a></div></article>)}</div> : <div className="empty"><div className="empty-icon"><Radar size={25}/></div><h3>Estamos preparando o radar de oportunidades</h3><p>As ofertas aparecerão aqui somente depois de serem coletadas de fontes identificadas. Assim, você não verá bônus, preços ou disponibilidade inventados.</p></div>}
<div className="notice"><ShieldCheck size={18} style={{flexShrink:0,marginTop:1}}/><div><strong>Transparência em primeiro lugar.</strong> Cada oportunidade terá link para a fonte original, data e hora da coleta, regras identificadas e indicação de validade quando disponível. A disponibilidade de assentos e preços pode mudar no site da companhia.</div></div></section>
<section className="container" id="como-funciona" style={{paddingTop:0}}><div className="section-head"><div><h2>O que o Montez Milhas acompanha</h2><p>Três frentes para aproveitar melhor seus pontos.</p></div></div><div className="stats"><div className="stat"><Repeat2 color="#1769e0" size={22}/><div className="stat-value" style={{fontSize:17}}>Transferências</div><div className="stat-note">Bônus entre programas de pontos e companhias aéreas.</div></div><div className="stat"><Plane color="#1769e0" size={22}/><div className="stat-value" style={{fontSize:17}}>Passagens prêmio</div><div className="stat-note">Pesquisa de oportunidades partindo de GRU, CGH e VCP.</div></div><div className="stat"><TrendingUp color="#1769e0" size={22}/><div className="stat-value" style={{fontSize:17}}>Compra de milhas</div><div className="stat-note">Preço por milheiro e comparação de campanhas.</div></div></div></section>
<footer className="footer" id="fontes"><div className="footer-inner"><span>© {new Date().getFullYear()} Montez Milhas</span><span>Projeto independente. Marcas e programas pertencem aos seus respectivos titulares.</span></div></footer></main>;
}
