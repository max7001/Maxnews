import os
import logging
from typing import Optional, Dict, Any
from fastapi import FastAPI, Query, HTTPException, Body
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import firebase_service
import news_service

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("maxnews.server")

app = FastAPI(title="MaxNews API", version="1.3")

# Abilita CORS per flessibilità (anche se servito localmente)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


@app.get("/api/settings")
async def get_app_settings():
    """Restituisce le impostazioni dell'app salvate su Firebase Firestore."""
    settings = await firebase_service.get_settings()
    settings["version"] = "v1.3"
    return {"success": True, "settings": settings}


@app.post("/api/settings")
async def update_app_settings(settings: Dict[str, Any] = Body(...)):
    """Aggiorna le impostazioni dell'app su Firebase Firestore."""
    if not settings:
        raise HTTPException(status_code=400, detail="Dati impostazioni non validi")
    
    # Assicuriamo che la versione v1.3 sia impostata
    settings["version"] = "v1.3"
        
    ok = await firebase_service.save_settings(settings)
    # Svuota la cache delle notizie per riflettere le nuove fonti/categorie
    news_service._NEWS_CACHE.clear()
    return {"success": ok, "settings": settings}


@app.post("/api/settings/reset")
async def reset_app_settings():
    """Ripristina le impostazioni predefinite di fabbrica su Firebase."""
    default_settings = firebase_service.DEFAULT_SETTINGS
    ok = await firebase_service.save_settings(default_settings)
    news_service._NEWS_CACHE.clear()
    return {"success": ok, "settings": default_settings}


@app.get("/api/news")
async def get_news(category: Optional[str] = None, refresh: bool = False):
    """
    Restituisce le notizie per le categorie attivate.
    Se 'category' è specificato (e diverso da 'all'), filtra solo per quella categoria.
    """
    settings = await firebase_service.get_settings()
    categories = settings.get("categories", {})

    all_data = await news_service.get_all_news(categories, force_refresh=refresh)

    if category and category != "all" and category in all_data["categories"]:
        filtered_cat = all_data["categories"][category]
        return {
            "success": True,
            "category_filter": category,
            "category_info": {
                "id": filtered_cat["id"],
                "name": filtered_cat["name"],
                "color": filtered_cat["color"],
                "icon": filtered_cat["icon"]
            },
            "articles": filtered_cat["articles"],
            "updated_at": all_data["updated_at"]
        }

    return {
        "success": True,
        "category_filter": "all",
        "categories": all_data["categories"],
        "unified": all_data["unified"],
        "updated_at": all_data["updated_at"]
    }


@app.get("/api/search")
async def search_news(q: str = Query(..., min_length=1)):
    """Esegue una ricerca online di notizie in tempo reale su Google News."""
    results = await news_service.search_online_news(q)
    # Registra ricerca nelle statistiche su Firebase
    await firebase_service.track_search(q)
    return {
        "success": True,
        "query": q,
        "count": len(results),
        "results": results
    }


@app.get("/api/article")
async def get_article_details(
    url: str = Query(...),
    title: str = Query(""),
    category_id: str = Query(""),
    source: str = Query("")
):
    """
    Restituisce la notizia completa arricchita (testo, fotografie, video incorporati e 
    combinazione con notizie correlate da altre fonti sullo stesso fatto).
    Registra anche la lettura nelle statistiche su Firebase Firestore.
    """
    detail = await news_service.get_article_detail(url, title, category_id)
    # Registra lettura su Firebase
    if title:
        await firebase_service.track_article_read(category_id or "generale", title, source or "Fonte web")
    return {
        "success": True,
        "article": detail
    }


@app.get("/api/stats")
async def get_app_stats():
    """Restituisce le statistiche di utilizzo salvate su Firebase Firestore."""
    stats = await firebase_service.get_stats()
    return {"success": True, "stats": stats}


# Monta i file statici css e js direttamente dalla cartella MaxNews
css_dir = os.path.join(BASE_DIR, "css")
js_dir = os.path.join(BASE_DIR, "js")
if os.path.exists(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")
if os.path.exists(js_dir):
    app.mount("/js", StaticFiles(directory=js_dir), name="js")


@app.get("/")
async def serve_index():
    """Serve la pagina principale della webapp MaxNews."""
    index_file = os.path.join(BASE_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse(status_code=404, content={"message": "index.html non trovato"})


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info(f"Avvio MaxNews Server su http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)
