import os
import json
import logging
from typing import Dict, Any, Optional
import httpx
from dotenv import load_dotenv

# Carica variabili d'ambiente da .env
load_dotenv()

logger = logging.getLogger("maxnews.firebase")
logger.setLevel(logging.INFO)

API_KEY = os.getenv("FIREBASE_API_KEY", "")
PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")
BASE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

LOCAL_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(LOCAL_DATA_DIR, exist_ok=True)
LOCAL_SETTINGS_PATH = os.path.join(LOCAL_DATA_DIR, "settings.json")
LOCAL_STATS_PATH = os.path.join(LOCAL_DATA_DIR, "stats.json")

DEFAULT_CATEGORIES = {
    "legnano": {
        "id": "legnano",
        "name": "Legnano",
        "enabled": True,
        "color": "#16a34a",
        "icon": "map-pin",
        "sources": [
            {"id": "googlenews_legnano", "name": "Google News Legnano", "url": "https://news.google.com/rss/search?q=%22Legnano%22+when:2d&hl=it&gl=IT&ceid=IT:it", "enabled": True},
            {"id": "legnanonews", "name": "LegnanoNews", "url": "https://www.legnanonews.com/feed/", "enabled": True},
            {"id": "sempionenews", "name": "Sempione News", "url": "https://www.sempionenews.it/feed/", "enabled": True},
            {"id": "primamilanoovest", "name": "Prima Milano Ovest", "url": "https://primamilanoovest.it/feed/", "enabled": True}
        ]
    },
    "tecnologia": {
        "id": "tecnologia",
        "name": "Tecnologia",
        "enabled": True,
        "color": "#2563eb",
        "icon": "cpu",
        "sources": [
            {"id": "garmin_enduro", "name": "Garmin Enduro 3", "url": "https://news.google.com/rss/search?q=%22Garmin+Enduro%22+OR+%22Enduro+3%22+when:7d&hl=it&gl=IT&ceid=IT:it", "enabled": True},
            {"id": "google_pixel", "name": "Telefoni Google Pixel", "url": "https://news.google.com/rss/search?q=%22Google+Pixel%22+when:2d&hl=it&gl=IT&ceid=IT:it", "enabled": True},
            {"id": "drone_antigravity", "name": "Drone Antigravity A1", "url": "https://news.google.com/rss/search?q=%22Antigravity+A1%22+OR+%22Drone+Antigravity%22+OR+Antigravity+drone&hl=it&gl=IT&ceid=IT:it", "enabled": True},
            {"id": "hdblog", "name": "HDblog", "url": "https://www.hdblog.it/feed/", "enabled": True},
            {"id": "wired", "name": "Wired Italia", "url": "https://www.wired.it/feed/rss", "enabled": True},
            {"id": "tomshw", "name": "Tom's Hardware", "url": "https://www.tomshw.it/feed/", "enabled": True}
        ]
    },
    "cronaca_italia": {
        "id": "cronaca_italia",
        "name": "Cronaca italiana",
        "enabled": True,
        "color": "#dc2626",
        "icon": "flag",
        "sources": [
            {"id": "ansa_cronaca", "name": "ANSA Cronaca", "url": "https://www.ansa.it/sito/ansait_rss.xml", "enabled": True},
            {"id": "tgcom24", "name": "TGCOM24 Cronaca", "url": "https://www.tgcom24.mediaset.it/rss/cronaca.xml", "enabled": True},
            {"id": "rainews", "name": "RaiNews", "url": "https://www.rainews.it/rss/tutti", "enabled": True}
        ]
    },
    "cronaca_estera": {
        "id": "cronaca_estera",
        "name": "Cronaca estera",
        "enabled": True,
        "color": "#0891b2",
        "icon": "globe",
        "sources": [
            {"id": "ansa_mondo", "name": "ANSA Mondo", "url": "https://www.ansa.it/sito/notizie/mondo/mondo_rss.xml", "enabled": True},
            {"id": "euronews", "name": "Euronews Italiano", "url": "https://it.euronews.com/rss", "enabled": True},
            {"id": "bbc", "name": "BBC News", "url": "http://feeds.bbci.co.uk/news/world/rss.xml", "enabled": True}
        ]
    },
    "economia": {
        "id": "economia",
        "name": "Economia",
        "enabled": True,
        "color": "#059669",
        "icon": "trending-up",
        "sources": [
            {"id": "ilsole24ore", "name": "Il Sole 24 Ore", "url": "https://www.ilsole24ore.com/rss/economia.xml", "enabled": True},
            {"id": "ansa_economia", "name": "ANSA Economia", "url": "https://www.ansa.it/sito/notizie/economia/economia_rss.xml", "enabled": True},
            {"id": "milanofinanza", "name": "Milano Finanza", "url": "https://www.milanofinanza.it/rss", "enabled": True}
        ]
    },
    "juventus": {
        "id": "juventus",
        "name": "Juventus",
        "enabled": True,
        "color": "#18181b",
        "icon": "shield",
        "sources": [
            {"id": "googlenews_juve_seriea", "name": "Google News Juve Serie A", "url": "https://news.google.com/rss/search?q=%22Juventus%22+%22Serie+A%22+when:2d&hl=it&gl=IT&ceid=IT:it", "enabled": True},
            {"id": "tuttojuve", "name": "TuttoJuve", "url": "https://www.tuttojuve.com/rss", "enabled": True},
            {"id": "juventusnews24", "name": "JuventusNews24", "url": "https://www.juventusnews24.com/feed/", "enabled": True}
        ]
    },
    "tesla": {
        "id": "tesla",
        "name": "Tesla",
        "enabled": True,
        "color": "#e11d48",
        "icon": "zap",
        "sources": [
            {"id": "insideevs", "name": "InsideEVs Italia", "url": "https://it.insideevs.com/rss/news/all/", "enabled": True},
            {"id": "electrek_tesla", "name": "Electrek Tesla", "url": "https://electrek.co/guides/tesla/feed/", "enabled": True},
            {"id": "googlenews_tesla", "name": "Google News Tesla", "url": "https://news.google.com/rss/search?q=Tesla+auto&hl=it&gl=IT&ceid=IT:it", "enabled": True}
        ]
    }
}

DEFAULT_SETTINGS = {
    "version": "v1.4",
    "theme": "dark",
    "categories": DEFAULT_CATEGORIES
}

DEFAULT_STATS = {
    "total_reads": 0,
    "total_searches": 0,
    "categories_reads": {cat_id: 0 for cat_id in DEFAULT_CATEGORIES},
    "recent_reads": [],
    "recent_searches": []
}


def _py_to_firestore(value: Any) -> Dict[str, Any]:
    if value is None:
        return {"nullValue": None}
    elif isinstance(value, bool):
        return {"booleanValue": value}
    elif isinstance(value, int):
        return {"integerValue": str(value)}
    elif isinstance(value, float):
        return {"doubleValue": value}
    elif isinstance(value, str):
        return {"stringValue": value}
    elif isinstance(value, list):
        return {"arrayValue": {"values": [_py_to_firestore(v) for v in value]}}
    elif isinstance(value, dict):
        return {"mapValue": {"fields": {k: _py_to_firestore(v) for k, v in value.items()}}}
    return {"stringValue": str(value)}


def _firestore_to_py(value: Dict[str, Any]) -> Any:
    if "stringValue" in value:
        return value["stringValue"]
    elif "integerValue" in value:
        return int(value["integerValue"])
    elif "doubleValue" in value:
        return float(value["doubleValue"])
    elif "booleanValue" in value:
        return value["booleanValue"]
    elif "nullValue" in value:
        return None
    elif "arrayValue" in value:
        return [_firestore_to_py(v) for v in value["arrayValue"].get("values", [])]
    elif "mapValue" in value:
        return {k: _firestore_to_py(v) for k, v in value["mapValue"].get("fields", {}).items()}
    return None


def _load_local_json(filepath: str, default_val: Any) -> Any:
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Errore lettura file locale {filepath}: {e}")
    return default_val


def _save_local_json(filepath: str, data: Any):
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Errore salvataggio file locale {filepath}: {e}")


async def get_settings() -> Dict[str, Any]:
    """Recupera le impostazioni da Firebase Firestore (o dalla cache locale)."""
    if API_KEY and PROJECT_ID:
        url = f"{BASE_URL}/settings/app_settings?key={API_KEY}"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    fields = data.get("fields", {})
                    settings = {k: _firestore_to_py(v) for k, v in fields.items()}
                    # Sincronizza su locale
                    _save_local_json(LOCAL_SETTINGS_PATH, settings)
                    return settings
                elif res.status_code == 404:
                    # Documento non ancora creato: inizializzalo
                    logger.info("Impostazioni non trovate su Firestore, inizializzazione predefinita...")
                    await save_settings(DEFAULT_SETTINGS)
                    return DEFAULT_SETTINGS
        except Exception as e:
            logger.warning(f"Impossibile leggere da Firestore: {e}, fallback su cache locale.")

    return _load_local_json(LOCAL_SETTINGS_PATH, DEFAULT_SETTINGS)


async def save_settings(settings: Dict[str, Any]) -> bool:
    """Salva le impostazioni su Firebase Firestore e su cache locale."""
    _save_local_json(LOCAL_SETTINGS_PATH, settings)

    if not API_KEY or not PROJECT_ID:
        return True

    url = f"{BASE_URL}/settings/app_settings?key={API_KEY}"
    try:
        firestore_fields = {k: _py_to_firestore(v) for k, v in settings.items()}
        payload = {"fields": firestore_fields}
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.patch(url, json=payload)
            return res.status_code in [200, 201]
    except Exception as e:
        logger.error(f"Errore scrittura Firestore settings: {e}")
        return False


async def get_stats() -> Dict[str, Any]:
    """Recupera le statistiche di utilizzo da Firebase Firestore (o cache locale)."""
    if API_KEY and PROJECT_ID:
        url = f"{BASE_URL}/statistics/app_stats?key={API_KEY}"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    fields = data.get("fields", {})
                    stats = {k: _firestore_to_py(v) for k, v in fields.items()}
                    _save_local_json(LOCAL_STATS_PATH, stats)
                    return stats
                elif res.status_code == 404:
                    logger.info("Statistiche non trovate su Firestore, inizializzazione...")
                    await save_stats(DEFAULT_STATS)
                    return DEFAULT_STATS
        except Exception as e:
            logger.warning(f"Impossibile leggere stats da Firestore: {e}, uso cache locale.")

    return _load_local_json(LOCAL_STATS_PATH, DEFAULT_STATS)


async def save_stats(stats: Dict[str, Any]) -> bool:
    """Salva le statistiche su Firebase Firestore e cache locale."""
    _save_local_json(LOCAL_STATS_PATH, stats)

    if not API_KEY or not PROJECT_ID:
        return True

    url = f"{BASE_URL}/statistics/app_stats?key={API_KEY}"
    try:
        firestore_fields = {k: _py_to_firestore(v) for k, v in stats.items()}
        payload = {"fields": firestore_fields}
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.patch(url, json=payload)
            return res.status_code in [200, 201]
    except Exception as e:
        logger.error(f"Errore scrittura Firestore stats: {e}")
        return False


async def track_article_read(category_id: str, article_title: str, source_name: str):
    """Incrementa i contatori di lettura e registra la notizia tra le recenti."""
    stats = await get_stats()
    stats["total_reads"] = stats.get("total_reads", 0) + 1
    
    cat_reads = stats.get("categories_reads", {})
    cat_reads[category_id] = cat_reads.get(category_id, 0) + 1
    stats["categories_reads"] = cat_reads

    recent = stats.get("recent_reads", [])
    # Inserisci in cima
    new_entry = {
        "title": article_title[:100],
        "category": category_id,
        "source": source_name,
        "timestamp": os.getenv("CURRENT_TIME", "")
    }
    recent = [entry for entry in recent if entry.get("title") != article_title[:100]]
    recent.insert(0, new_entry)
    stats["recent_reads"] = recent[:15]  # mantieni ultime 15

    await save_stats(stats)


async def track_search(query: str):
    """Registra una ricerca effettuata online nelle statistiche."""
    if not query or len(query.strip()) < 2:
        return
    q = query.strip()
    stats = await get_stats()
    stats["total_searches"] = stats.get("total_searches", 0) + 1

    recent = stats.get("recent_searches", [])
    if q in recent:
        recent.remove(q)
    recent.insert(0, q)
    stats["recent_searches"] = recent[:15]

    await save_stats(stats)
