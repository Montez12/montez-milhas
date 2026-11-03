"""Coletor e persistência do Montez Milhas.

As fontes reais serão adicionadas somente após validar acesso, termos e formato.
Sem conectores ativos, o worker registra uma execução vazia e não inventa ofertas.
"""
import hashlib
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Optional

import httpx


@dataclass
class Offer:
    source_name: str
    source_url: str
    title: str
    category: str
    collected_at: str
    fingerprint: str
    expires_at: Optional[str] = None
    details: Optional[str] = None


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_fingerprint(source_url: str, title: str, category: str) -> str:
    raw = "|".join((source_url.strip().lower(), title.strip().lower(), category))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def collect() -> list[Offer]:
    # TODO: conectar fontes públicas/oficiais após validação individual.
    # Categorias aceitas: transferencia, passagem, compra_milhas.
    return []


def persist(offers: list[Offer]) -> tuple[int, int]:
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    saved = 0
    with httpx.Client(timeout=30) as client:
        for offer in offers:
            payload = asdict(offer)
            response = client.post(
                f"{url}/rest/v1/offers?on_conflict=fingerprint",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            saved += 1
    return len(offers), saved


def record_run(started_at: str, found: int, saved: int, status: str, message: str = "") -> None:
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    payload = {
        "started_at": started_at,
        "finished_at": utc_now(),
        "source_count": 0,
        "offers_found": found,
        "offers_saved": saved,
        "status": status,
        "message": message[:1000] or None,
    }
    with httpx.Client(timeout=30) as client:
        response = client.post(f"{url}/rest/v1/collection_runs", headers=headers, json=payload)
        response.raise_for_status()


def main() -> None:
    started = utc_now()
    offers = collect()
    try:
        found, saved = persist(offers)
        record_run(started, found, saved, "success", "Nenhum conector de fonte está ativo." if not offers else "")
        print(f"{utc_now()} - {saved} ofertas persistidas")
    except Exception as exc:
        try:
            record_run(started, len(offers), 0, "failed", str(exc))
        finally:
            raise


if __name__ == "__main__":
    main()
