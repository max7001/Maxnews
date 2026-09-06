import re
import html
import time
import hashlib
import logging
import urllib.parse
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import List, Dict, Any, Optional
import xml.etree.ElementTree as ET
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("maxnews.news")
logger.setLevel(logging.INFO)

# Cache in-memory: { cache_key: { "timestamp": float, "data": Any } }
_NEWS_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 180  # 3 minuti

# Immagini di fallback tematiche per categoria
FALLBACK_IMAGES = {
    "legnano": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&auto=format&fit=crop&q=80",
    "tecnologia": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80",
    "cronaca_italia": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop&q=80",
    "cronaca_estera": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
    "economia": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80",
    "juventus": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80",
    "tesla": "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=600&auto=format&fit=crop&q=80",
    "default": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80"
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7"
}


def _strip_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    clean = re.sub(r'<[^>]+>', ' ', raw_html)
    clean = html.unescape(clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean


def _extract_image_from_html(raw_html: str) -> Optional[str]:
    if not raw_html:
        return None
    match = re.search(r'<img[^>]+src=["\'](https?://[^"\']+)["\']', raw_html, re.IGNORECASE)
    if match:
        img_url = match.group(1)
        # Filtra tracker / 1x1 pixel
        if not any(t in img_url.lower() for t in ["1x1", "pixel", "tracking", "feedburner", "doubleclick"]):
            return img_url
    return None


def _format_pub_date(dt: Optional[datetime]) -> tuple[str, float]:
    if not dt:
        return ("Poco fa", time.time())
    now = datetime.now(dt.tzinfo)
    timestamp = dt.timestamp()
    delta = now - dt
    seconds = max(0, delta.total_seconds())

    if seconds < 60:
        return ("Pochi secondi fa", timestamp)
    elif seconds < 3600:
        mins = int(seconds // 60)
        return (f"{mins} min fa", timestamp)
    elif seconds < 86400:
        hours = int(seconds // 3600)
        return (f"{hours}h fa", timestamp)
    elif seconds < 172800:
        return ("Ieri", timestamp)
    else:
        days = int(seconds // 86400)
        if days < 7:
            return (f"{days} giorni fa", timestamp)
        return (dt.strftime("%d/%m/%Y"), timestamp)


def _parse_date(date_str: str) -> tuple[str, float]:
    if not date_str:
        return ("Poco fa", time.time())
    date_str = date_str.strip()
    try:
        dt = parsedate_to_datetime(date_str)
        return _format_pub_date(dt)
    except Exception:
        pass

    # Prova formati comuni ISO
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(date_str.replace("Z", "+0000"), fmt)
            return _format_pub_date(dt)
        except Exception:
            continue

    return (date_str[:16], time.time())


async def parse_rss_feed(feed_url: str, source_name: str, category_id: str, category_name: str, category_color: str) -> List[Dict[str, Any]]:
    """Esegue il fetch e il parsing asincrono di un feed RSS/Atom."""
    items = []
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(feed_url)
            if resp.status_code != 200:
                logger.warning(f"Feed {feed_url} ha risposto con status {resp.status_code}")
                return []
            content = resp.content

        # Parsing XML con ElementTree
        root = ET.fromstring(content)
        
        # Gestione RSS 2.0 (<channel><item>)
        channel = root.find("channel")
        raw_items = channel.findall("item") if channel is not None else root.findall(".//item")
        
        # Se non trova item, prova Atom (<entry>)
        is_atom = False
        if not raw_items:
            raw_items = root.findall(".//{http://www.w3.org/2005/Atom}entry")
            if not raw_items:
                raw_items = root.findall(".//entry")
            if raw_items:
                is_atom = True

        for el in raw_items[:15]:  # Fino a 15 elementi per feed
            title = ""
            link = ""
            pub_date_str = ""
            summary = ""
            image_url = None

            if is_atom:
                title_el = el.find("{http://www.w3.org/2005/Atom}title") or el.find("title")
                title = title_el.text if title_el is not None and title_el.text else ""
                
                link_el = el.find("{http://www.w3.org/2005/Atom}link") or el.find("link")
                if link_el is not None:
                    link = link_el.attrib.get("href", "") or (link_el.text or "")
                    
                date_el = (el.find("{http://www.w3.org/2005/Atom}updated") or 
                           el.find("{http://www.w3.org/2005/Atom}published") or 
                           el.find("updated") or el.find("published"))
                pub_date_str = date_el.text if date_el is not None and date_el.text else ""
                
                summary_el = (el.find("{http://www.w3.org/2005/Atom}summary") or 
                              el.find("{http://www.w3.org/2005/Atom}content") or 
                              el.find("summary") or el.find("content"))
                summary_raw = summary_el.text if summary_el is not None and summary_el.text else ""
                summary = _strip_html(summary_raw)
                image_url = _extract_image_from_html(summary_raw)
            else:
                # RSS 2.0
                title_el = el.find("title")
                title = title_el.text if title_el is not None and title_el.text else ""

                link_el = el.find("link")
                link = link_el.text if link_el is not None and link_el.text else ""

                pub_el = el.find("pubDate") or el.find("date")
                pub_date_str = pub_el.text if pub_el is not None and pub_el.text else ""

                desc_el = el.find("description")
                desc_raw = desc_el.text if desc_el is not None and desc_el.text else ""
                summary = _strip_html(desc_raw)

                # Estrazione immagine: 1. enclosure
                enclosure = el.find("enclosure")
                if enclosure is not None and "image" in enclosure.attrib.get("type", "").lower():
                    image_url = enclosure.attrib.get("url")

                # 2. media:content o media:thumbnail
                if not image_url:
                    for media_tag in el.findall(".//{http://search.yahoo.com/mrss/}content"):
                        u = media_tag.attrib.get("url")
                        if u and ("image" in media_tag.attrib.get("type", "").lower() or media_tag.attrib.get("medium") == "image" or not media_tag.attrib.get("medium")):
                            image_url = u
                            break

                if not image_url:
                    thumb = el.find(".//{http://search.yahoo.com/mrss/}thumbnail")
                    if thumb is not None and thumb.attrib.get("url"):
                        image_url = thumb.attrib.get("url")

                # 3. img tag dentro la descrizione o content:encoded
                if not image_url:
                    image_url = _extract_image_from_html(desc_raw)

                if not image_url:
                    content_encoded = el.find(".//{http://purl.org/rss/1.0/modules/content/}encoded")
                    if content_encoded is not None and content_encoded.text:
                        image_url = _extract_image_from_html(content_encoded.text)

            title = _strip_html(title)
            if not title or not link:
                continue

            date_formatted, timestamp = _parse_date(pub_date_str)

            now_ts = time.time()
            if timestamp > now_ts + 7200:
                timestamp = now_ts

            # REQUISITO TASSATIVO: notizie obbligatoriamente recenti (massimo 48 ore)
            MAX_AGE_SECONDS = 48 * 3600
            if (now_ts - timestamp) > MAX_AGE_SECONDS:
                # Scarta notizie con più di 48 ore di anzianità
                continue

            item_id = hashlib.md5((link + title).encode("utf-8")).hexdigest()

            # Pulisci eventuale suffisso fonte dal titolo se presente (es. "Titolo - NomeFonte")
            clean_title = title
            if " - " in clean_title:
                parts = clean_title.rsplit(" - ", 1)
                if len(parts[1]) < 30 and len(parts[0]) > 15:
                    clean_title = parts[0]

            # Fallback immagine se non estratta
            if not image_url:
                image_url = FALLBACK_IMAGES.get(category_id, FALLBACK_IMAGES["default"])

            items.append({
                "id": item_id,
                "title": clean_title,
                "link": link,
                "summary": summary[:220] + "..." if len(summary) > 220 else summary,
                "image": image_url,
                "source": source_name,
                "source_url": feed_url,
                "category_id": category_id,
                "category_name": category_name,
                "category_color": category_color,
                "pub_date": date_formatted,
                "timestamp": timestamp
            })

    except Exception as e:
        logger.error(f"Errore parsing feed {source_name} ({feed_url}): {e}")

    return items


async def fetch_category_news(category: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Recupera le notizie da tutte le fonti abilitate di una categoria."""
    cat_id = category.get("id", "")
    cat_name = category.get("name", "")
    cat_color = category.get("color", "#2563eb")
    sources = category.get("sources", [])

    all_articles = []
    for src in sources:
        if src.get("enabled", True):
            src_url = src.get("url", "")
            src_name = src.get("name", "Fonte")
            articles = await parse_rss_feed(src_url, src_name, cat_id, cat_name, cat_color)
            all_articles.extend(articles)

    # 1. Filtro tassativo per LEGNANO: deve riguardare esplicitamente la città di Legnano
    if cat_id == "legnano":
        def _is_explicitly_legnano(item):
            text = (item.get("title", "") + " " + item.get("summary", "")).lower()
            return bool(re.search(r'\blegnan[oaie]\b|palio di legnano|città di legnano|comune di legnano|sindaco di legnano|ac legnano|knights legnano', text, re.IGNORECASE))
        all_articles = [art for art in all_articles if _is_explicitly_legnano(art)]

    # 2. Filtro tassativo per JUVENTUS: deve riguardare esplicitamente la prima squadra maschile di Serie A
    elif cat_id == "juventus":
        def _is_explicitly_juve_serie_a(item):
            title = item.get("title", "").lower()
            summary = item.get("summary", "").lower()
            full_text = title + " " + summary

            # Deve citare Juventus o Juve
            if not re.search(r'\b(juventus|juve|juventin[oaei])\b', full_text, re.IGNORECASE):
                return False

            # Scarta notizie esplicitamente dedicate a femminile, women, next gen, primavera o giovanili
            excluded_keywords = [
                "women", "femminil", "next gen", "nextgen", "serie c", 
                "under 19", "under 17", "under 16", "under 15", "under 18", "under 20",
                "primavera"
            ]
            for ex in excluded_keywords:
                if ex in title:
                    return False
            return True
        all_articles = [art for art in all_articles if _is_explicitly_juve_serie_a(art)]

    # 3. Priorità per TECNOLOGIA: dai la precedenza a Garmin Enduro 3, telefoni Google Pixel, Drone Antigravity A1
    elif cat_id == "tecnologia":
        for art in all_articles:
            t = (art.get("title", "") + " " + art.get("summary", "")).lower()
            score = 0
            badge = ""
            if "garmin enduro" in t or "enduro 3" in t:
                score += 1000
                badge = "⚡ In Evidenza: Garmin Enduro 3"
            elif "google pixel" in t or "pixel 9" in t or "pixel 8" in t or "telefoni pixel" in t or "pixel fold" in t:
                score += 900
                badge = "⚡ In Evidenza: Google Pixel"
            elif "antigravity" in t or "drone antigravity" in t or "antigravity a1" in t:
                score += 850
                badge = "⚡ In Evidenza: Drone Antigravity A1"
            elif "garmin" in t:
                score += 300
            elif "pixel" in t:
                score += 200

            art["priority_score"] = score
            if badge:
                art["priority_badge"] = badge

        all_articles.sort(key=lambda x: (x.get("priority_score", 0), x.get("timestamp", 0)), reverse=True)
        return all_articles

    # Ordina per timestamp decrescente
    all_articles.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return all_articles


async def get_all_news(categories: Dict[str, Any], force_refresh: bool = False) -> Dict[str, Any]:
    """Recupera tutte le notizie per tutte le categorie attivate con caching."""
    cache_key = "all_news"
    now = time.time()

    if not force_refresh and cache_key in _NEWS_CACHE:
        cache_entry = _NEWS_CACHE[cache_key]
        if now - cache_entry["timestamp"] < CACHE_TTL_SECONDS:
            return cache_entry["data"]

    results_by_category = {}
    unified_list = []

    for cat_id, cat_data in categories.items():
        if cat_data.get("enabled", True):
            articles = await fetch_category_news(cat_data)
            results_by_category[cat_id] = {
                "id": cat_id,
                "name": cat_data.get("name", cat_id),
                "color": cat_data.get("color", "#2563eb"),
                "icon": cat_data.get("icon", "newspaper"),
                "articles": articles
            }
            unified_list.extend(articles)

    # Ordina la lista unificata per data
    unified_list.sort(key=lambda x: x.get("timestamp", 0), reverse=True)

    data = {
        "categories": results_by_category,
        "unified": unified_list,
        "updated_at": datetime.now().strftime("%H:%M:%S")
    }

    _NEWS_CACHE[cache_key] = {"timestamp": now, "data": data}
    return data


async def search_online_news(query: str) -> List[Dict[str, Any]]:
    """Esegue una ricerca online in tempo reale tramite Google News RSS con filtro tassativo a massimo 48 ore."""
    if not query or len(query.strip()) < 2:
        return []

    encoded_q = urllib.parse.quote(query.strip())
    # Filtra solo notizie recenti degli ultimi 2 giorni (48 ore)
    search_url = f"https://news.google.com/rss/search?q={encoded_q}+when:2d&hl=it&gl=IT&ceid=IT:it"

    articles = await parse_rss_feed(
        search_url,
        source_name="Ricerca Live",
        category_id="search",
        category_name=f'Risultati per "{query}"',
        category_color="#8b5cf6"
    )

    # Se non hanno immagini, assegna immagini tematiche basate sul testo
    for art in articles:
        if art.get("image") == FALLBACK_IMAGES["default"]:
            # Cerca se attinente a tech, auto, sport
            t = art["title"].lower()
            if any(k in t for k in ["auto", "elettric", "tesla", "motori"]):
                art["image"] = FALLBACK_IMAGES["tesla"]
            elif any(k in t for k in ["calcio", "juve", "champions", "sport", "serie a"]):
                art["image"] = FALLBACK_IMAGES["juventus"]
            elif any(k in t for k in ["ai", "apple", "google", "tech", "chip", "software"]):
                art["image"] = FALLBACK_IMAGES["tecnologia"]
            elif any(k in t for k in ["milano", "legnano", "lombardia"]):
                art["image"] = FALLBACK_IMAGES["legnano"]
            elif any(k in t for k in ["borsa", "mercati", "inflazione", "pil", "bce"]):
                art["image"] = FALLBACK_IMAGES["economia"]

    return articles


async def get_article_detail(url: str, title: str = "", category_id: str = "") -> Dict[str, Any]:
    """
    Arricchisce la notizia estraendo testo completo, fotografie in alta risoluzione,
    filmati/video correlati o incorporati, e combina coperture da altre fonti sullo stesso fatto.
    """
    import asyncio

    result = {
        "url": url,
        "title": title,
        "category_id": category_id,
        "content_paragraphs": [],
        "hero_image": None,
        "gallery_images": [],
        "videos": [],
        "related_sources": []
    }

    async def _fetch_page_content():
        try:
            async with httpx.AsyncClient(headers=HEADERS, timeout=4.0, follow_redirects=True) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    html_text = resp.text
                    soup = BeautifulSoup(html_text, "lxml")

                    # Titolo se non presente
                    nonlocal title
                    if not title:
                        og_title = soup.find("meta", property="og:title")
                        if og_title and og_title.get("content"):
                            title = og_title["content"]
                        elif soup.title:
                            title = soup.title.string or ""
                        result["title"] = _strip_html(title)

                    # Hero image
                    og_img = soup.find("meta", property="og:image")
                    if og_img and og_img.get("content"):
                        result["hero_image"] = og_img["content"]

                    # Galleria immagini aggiuntive
                    images_found = set()
                    if result["hero_image"]:
                        images_found.add(result["hero_image"])

                    article_elem = soup.find("article") or soup.find("main") or soup.find("div", class_=re.compile(r"content|post|entry|corpo")) or soup
                    for img in article_elem.find_all("img"):
                        src = img.get("src") or img.get("data-src") or img.get("srcset")
                        if src and src.startswith("http"):
                            if "," in src:
                                src = src.split(",")[-1].strip().split(" ")[0]
                            if not any(b in src.lower() for b in ["icon", "logo", "avatar", "1x1", "pixel", "banner"]):
                                if src not in images_found:
                                    images_found.add(src)
                                    result["gallery_images"].append(src)
                                    if len(result["gallery_images"]) >= 6:
                                        break

                    # Video incorporati
                    for iframe in article_elem.find_all("iframe"):
                        src = iframe.get("src", "")
                        if "youtube.com/embed/" in src:
                            clean_embed = src if src.startswith("http") else "https:" + src
                            result["videos"].append({
                                "type": "youtube",
                                "src": clean_embed,
                                "title": "Video correlato"
                            })
                        elif "youtube.com/watch" in src:
                            m = re.search(r'v=([a-zA-Z0-9_-]+)', src)
                            if m:
                                result["videos"].append({
                                    "type": "youtube",
                                    "src": f"https://www.youtube.com/embed/{m.group(1)}",
                                    "title": "Video correlato"
                                })
                        elif "youtu.be/" in src:
                            m = re.search(r'youtu\.be/([a-zA-Z0-9_-]+)', src)
                            if m:
                                result["videos"].append({
                                    "type": "youtube",
                                    "src": f"https://www.youtube.com/embed/{m.group(1)}",
                                    "title": "Video correlato"
                                })
                        elif "vimeo.com" in src:
                            result["videos"].append({
                                "type": "vimeo",
                                "src": src if src.startswith("http") else "https:" + src,
                                "title": "Video Vimeo"
                            })

                    for vid in article_elem.find_all("video"):
                        src = vid.get("src")
                        if not src:
                            source_tag = vid.find("source")
                            if source_tag:
                                src = source_tag.get("src")
                        if src and src.startswith("http"):
                            result["videos"].append({
                                "type": "html5",
                                "src": src,
                                "title": "Filmato Notizia"
                            })

                    # Paragrafi testo
                    paragraphs = []
                    for p in article_elem.find_all("p"):
                        text = _strip_html(p.get_text())
                        if len(text) > 40 and not any(w in text.lower() for w in ["cookie", "privacy policy", "tutti i diritti riservati", "iscriviti alla newsletter", "seguici su telegram"]):
                            paragraphs.append(text)

                    result["content_paragraphs"] = paragraphs[:12]
        except Exception as e:
            logger.debug(f"Fetch page content timeout/err: {e}")

    async def _fetch_related_sources():
        # SINTESI MULTI-FONTE ("Combinando la stessa notizia da più fonti")
        if title:
            stop_words = {"il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "di", "a", "da", "in", "con", "su", "per", "tra", "fra", "e", "o", "ma", "che", "chi", "cui", "non", "piu", "ha", "hanno", "sono", "del", "della", "delle", "degli", "dei", "nel", "nella", "dopo", "come", "cosa", "dove", "quando", "lavori", "ancora"}
            words = [w.lower() for w in re.findall(r'\b[a-zA-Zàèéìòù]{4,}\b', title) if w.lower() not in stop_words]
            if len(words) >= 2:
                query_keywords = " ".join(words[:4])
                try:
                    related = await search_online_news(query_keywords)
                    for r_item in related[:4]:
                        if r_item.get("link") != url and r_item.get("title") != title:
                            result["related_sources"].append({
                                "title": r_item.get("title"),
                                "source": r_item.get("source"),
                                "link": r_item.get("link"),
                                "pub_date": r_item.get("pub_date"),
                                "summary": r_item.get("summary"),
                                "image": r_item.get("image")
                            })
                except Exception as e:
                    logger.debug(f"Related search err: {e}")

    # Esegui scraping e ricerca multi-fonte in parallelo
    await asyncio.gather(_fetch_page_content(), _fetch_related_sources(), return_exceptions=True)

    # Fallback paragrafi se non estratti
    if not result["content_paragraphs"]:
        result["content_paragraphs"] = [
            "La notizia è consultabile in forma integrale e aggiornata direttamente presso la fonte ufficiale con gallerie e approfondimenti completi.",
            "Fai clic sul pulsante sottostante 'Apri articolo originale sulla fonte' per accedere alla pubblicazione originaria."
        ]

    # Regola: Se un video non è visualizzabile non mostrarlo.
    # Non aggiungiamo alcun video fittizio o fallback di ricerca non verificato:
    # result["videos"] conterrà unicamente video realmente presenti nell'articolo originale.
    return result
