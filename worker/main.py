"""Coletor inicial do Montez Milhas. Fontes só serão ativadas após validação."""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

@dataclass
class Offer:
    source_name: str
    source_url: str
    title: str
    category: str
    collected_at: str
    expires_at: Optional[str] = None
    details: Optional[str] = None

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()

def collect() -> list[Offer]:
    # TODO: implementar conectores oficiais/RSS aprovados e persistência.
    # Lista vazia significa ausência de dados verificados; nunca inserir ofertas fictícias.
    return []

if __name__ == "__main__":
    offers = collect()
    print(f"{utc_now()} - {len(offers)} ofertas verificadas coletadas")
