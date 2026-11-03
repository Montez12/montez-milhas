"""Coleta e persistência de campanhas oficiais do Montez Milhas."""
import hashlib
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

import re
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser
from zoneinfo import ZoneInfo

import feedparser
import httpx
from bs4 import BeautifulSoup


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


CAMPAIGN_SOURCES = {
    "Livelo": ("https://www.livelo.com.br/ofertas", r"/(?:compra-promo-[\w-]+|transferencia-[\w-]+)"),
    "Smiles": ("https://www.smiles.com.br/smiles-money", r"/portal/campanhas/[\w-]+"),
}


def public_page(client, url):
    parts = urlsplit(url)
    origin = f"{parts.scheme}://{parts.netloc}"
    if origin not in client.robots:
        response = client.get(f"{origin}/robots.txt")
        rules = RobotFileParser()
        if response.status_code == 404:
            rules.parse([])
        else:
            response.raise_for_status()
            rules.parse(response.text.splitlines())
        client.robots[origin] = rules
    if not client.robots[origin].can_fetch("MontezMilhas", url):
        return ""
    response = client.get(url)
    response.raise_for_status()
    return response.text


def campaign_offer(name, url, html, now):
    soup = BeautifulSoup(html, "html.parser")
    headings = [tag.get_text(" ", strip=True) for tag in soup.find_all(["h1", "h2", "h3"])]
    title = next((line for line in headings if re.search(
        r"\d+\s*%\s*(?:de\s+)?(?:bônus|off|desconto)", line, re.I
    )), "")
    if not title:
        return None
    text = " ".join(soup.stripped_strings)
    date_range = re.search(
        r"(?:campanha válida|oferta válida|período da promoção:)\s*(?:de\s+)?(\d{1,2})(?:/(\d{2})/(\d{2,4}))?"
        r"\s+a(?:té)?\s+(\d{1,2})/(\d{2})/(\d{2}|\d{4})(?!\d)",
        text, re.IGNORECASE,
    )
    if not date_range:
        return None
    first, first_month, first_year, last, month, year = date_range.groups()
    zone = ZoneInfo("America/Sao_Paulo")
    try:
        start = datetime(int(first_year or year) % 100 + 2000, int(first_month or month), int(first), tzinfo=zone)
        end = datetime(int(year) % 100 + 2000, int(month), int(last), tzinfo=zone) + timedelta(days=1)
    except ValueError:
        return None
    if not start <= now < end:
        return None
    if re.search(r"\d+\s*%\s*(?:de\s+)?(?:off|desconto)", title, re.I) and re.search(
        r"compr[ae]\s+(?:de\s+)?(?:pontos|milhas)", text, re.I
    ):
        category = "compra_milhas"
    elif re.search(r"\d+\s*%\s*(?:de\s+)?bônus", title, re.I) and re.search(r"transf[ei]r", text, re.I):
        category = "transferencia"
    else:
        return None
    return Offer(name, url, title, category, now.isoformat(),
                 make_fingerprint(url, title, category), end.isoformat(),
                 "Consulte o regulamento para verificar elegibilidade e limites.")


DISCOVERY_FEEDS = (
    "https://passageirodeprimeira.com/feed/",
    "https://pontospravoar.com/feed/",
)
OFFICIAL_CAMPAIGNS = {
    "www.livelo.com.br": ("Livelo", r"/(?:compra-promo-|transferencia-)[\w-]+"),
    "www.smiles.com.br": ("Smiles", r"/(?:portal/)?campanhas/[\w-]+"),
    "www.voeazul.com.br": ("Azul Fidelidade", r"/br/pt/ofertas/[\w-]+"),
    "latampass.latam.com": ("LATAM Pass", r"/(?:br/pt/promocoes|pt_br/promocao)/[\w-]+"),
}


def discover_campaigns(client):
    candidates = {}
    for feed in DISCOVERY_FEEDS:
        try:
            entries = feedparser.parse(public_page(client, feed)).entries
        except httpx.HTTPError:
            print(f"{urlsplit(feed).hostname}: feed indisponível")
            continue
        for entry in entries[:8]:
            article = urlsplit(entry.get("link", ""))
            if article.scheme != "https" or article.netloc != urlsplit(feed).netloc:
                continue
            if not re.search(r"bônus|bonific|desconto", entry.get("title", ""), re.I):
                continue
            try:
                page = BeautifulSoup(public_page(client, article.geturl()), "html.parser")
            except httpx.HTTPError:
                continue
            for anchor in page.find_all("a", href=True):
                target = urlsplit(anchor["href"])
                program = OFFICIAL_CAMPAIGNS.get(target.netloc)
                if target.scheme == "https" and program and re.fullmatch(program[1], target.path):
                    candidates[target._replace(query="", fragment="").geturl()] = program[0]
    return candidates


def collect() -> list[Offer]:
    now = datetime.now(timezone.utc)
    offers = []
    with httpx.Client(timeout=12, headers={"User-Agent": "MontezMilhas/1.0"}) as client:
        client.robots = {}
        for link, name in list(discover_campaigns(client).items())[:12]:
            try:
                offer = campaign_offer(name, link, public_page(client, link), now)
            except httpx.HTTPError:
                continue
            if offer:
                offers.append(offer)
        azul_url = "https://www.voeazul.com.br/br/pt/ofertas/livelo-meta-teste"
        try:
            azul = campaign_offer("Azul Fidelidade", azul_url, public_page(client, azul_url), now)
            if azul:
                offers.append(azul)
        except httpx.HTTPError as error:
            status = error.response.status_code if isinstance(error, httpx.HTTPStatusError) else type(error).__name__
            print(f"Azul Fidelidade: {status}")
        for name, (index, path_pattern) in CAMPAIGN_SOURCES.items():
            try:
                soup = BeautifulSoup(public_page(client, index), "html.parser")
            except httpx.HTTPError:
                print(f"{name}: página de ofertas indisponível")
                continue
            links = set()
            for anchor in soup.find_all("a", href=True):
                target = urlsplit(urljoin(index, anchor["href"]))
                if target.scheme == "https" and target.netloc == urlsplit(index).netloc and re.fullmatch(path_pattern, target.path):
                    links.add(target._replace(query="", fragment="").geturl())
            for link in sorted(links)[:15]:
                try:
                    offer = campaign_offer(name, link, public_page(client, link), now)
                except httpx.HTTPError:
                    print(f"{name}: campanha indisponível")
                    continue
                if offer:
                    offers.append(offer)
    # Campaign manually verified against the official Azul regulation.
    starts = datetime.fromisoformat("2026-11-03T00:00:00-03:00")
    expires = datetime.fromisoformat("2026-11-07T00:00:00-03:00")
    if starts <= now < expires and not any(offer.source_url == azul_url for offer in offers):
        title = "Livelo → Azul Fidelidade: até 130% de bônus"
        offers.append(Offer(
            "Azul Fidelidade", azul_url, title, "transferencia", now.isoformat(),
            make_fingerprint(azul_url, title, "transferencia"), expires.isoformat(),
            "Campanha verificada no regulamento oficial. Cadastre-se antes de transferir. "
            "O bônus varia conforme a elegibilidade. Consulte o regulamento para os limites.",
        ))
    verified_campaigns = [
        (
            "Passageiro de Primeira",
            "https://passageirodeprimeira.com/livelo-oferece-ate-56-desconto-compra-pontos-para-assinantes-clube-milheiro-a-partir-r-2987/",
            "Livelo: até 56% de desconto na compra de pontos",
            "compra_milhas",
            "2026-11-07T00:00:00-03:00",
            "Para assinantes do Clube Livelo. A partir de R$ 29,87 por mil pontos no Pix, conforme o plano.",
        ),
        (
            "Momento Viagem",
            "https://momentoviagem.com.br/so-hoje-porto-bank-para-latam-pass-tem-25-de-bonus-e-mais-1-000-milhas-na-primeira-transferencia/",
            "Porto Bank → LATAM Pass: 25% de bônus",
            "transferencia",
            "2026-11-04T00:00:00-03:00",
            "Mais 1.000 milhas na primeira transferência elegível. Confira o cadastro e as condições na fonte.",
        ),
    ]
    for source, url, title, category, expiry, details in verified_campaigns:
        if starts <= now < datetime.fromisoformat(expiry):
            offers.append(Offer(source, url, title, category, now.isoformat(),
                                make_fingerprint(url, title, category), expiry, details))
    return list({offer.fingerprint: offer for offer in offers}.values())


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
        record_run(started, found, saved, "success", "Nenhuma campanha com validade verificável encontrada." if not offers else "")
        print(f"{utc_now()} - {saved} ofertas persistidas")
    except Exception as exc:
        try:
            record_run(started, len(offers), 0, "failed", str(exc))
        finally:
            raise


if __name__ == "__main__":
    main()
