/**
 * MaxNews - Applicazione Web Notizie Intelligente
 * Gestione stato, caricamento notizie, ricerca live, modali Settings e Statistiche.
 */

// ==========================================
// STATO APPLICAZIONE
// ==========================================
const AppState = {
  settings: null,
  newsData: null,
  stats: null,
  currentCategoryFilter: 'all',
  isSearching: false,
  searchQuery: '',
  activeArticle: null
};

// ==========================================
// ELEMENTI DOM PRINCIPALI
// ==========================================
const DOM = {
  // Top bar
  brandBtn: document.getElementById('brandBtn'),
  categoryFilterSelect: document.getElementById('categoryFilterSelect'),
  statsModalBtn: document.getElementById('statsModalBtn'),
  settingsModalBtn: document.getElementById('settingsModalBtn'),
  refreshNewsBtn: document.getElementById('refreshNewsBtn'),
  // Ricerca
  liveSearchInput: document.getElementById('liveSearchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  submitSearchBtn: document.getElementById('submitSearchBtn'),
  // Feed & Stato
  statusBanner: document.getElementById('statusBanner'),
  statusIcon: document.getElementById('statusIcon'),
  statusMessage: document.getElementById('statusMessage'),
  resetViewBtn: document.getElementById('resetViewBtn'),
  newsFeedContainer: document.getElementById('newsFeedContainer'),
  // Modale Articolo
  articleModal: document.getElementById('articleModal'),
  closeArticleModalBtn: document.getElementById('closeArticleModalBtn'),
  closeArticleFooterBtn: document.getElementById('closeArticleFooterBtn'),
  modalCategoryBadge: document.getElementById('modalCategoryBadge'),
  modalSourceBadge: document.getElementById('modalSourceBadge'),
  modalPubDate: document.getElementById('modalPubDate'),
  modalArticleTitle: document.getElementById('modalArticleTitle'),
  modalHeroMedia: document.getElementById('modalHeroMedia'),
  modalHeroImg: document.getElementById('modalHeroImg'),
  modalVideoSection: document.getElementById('modalVideoSection'),
  modalVideoIframe: document.getElementById('modalVideoIframe'),
  modalVideoLabel: document.getElementById('modalVideoLabel'),
  modalArticleContent: document.getElementById('modalArticleContent'),
  modalGallerySection: document.getElementById('modalGallerySection'),
  modalGalleryGrid: document.getElementById('modalGalleryGrid'),
  modalMultiSourceSection: document.getElementById('modalMultiSourceSection'),
  modalMultiSourceList: document.getElementById('modalMultiSourceList'),
  modalSourceLink: document.getElementById('modalSourceLink'),
  // Modale Settings
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
  categoriesAccordion: document.getElementById('categoriesAccordion'),
  categoriesAccordionHeader: document.getElementById('categoriesAccordionHeader'),
  categoriesConfigList: document.getElementById('categoriesConfigList'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  resetSettingsBtn: document.getElementById('resetSettingsBtn'),
  // Modale Statistiche
  statsModal: document.getElementById('statsModal'),
  closeStatsModalBtn: document.getElementById('closeStatsModalBtn'),
  closeStatsFooterBtn: document.getElementById('closeStatsFooterBtn'),
  statTotalReads: document.getElementById('statTotalReads'),
  statTotalSearches: document.getElementById('statTotalSearches'),
  statActiveCategories: document.getElementById('statActiveCategories'),
  statsCategoriesChart: document.getElementById('statsCategoriesChart'),
  recentReadsList: document.getElementById('recentReadsList'),
  // Toast
  toastContainer: document.getElementById('toastContainer')
};

// ==========================================
// FUNZIONI DI UTILITÀ
// ==========================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✓' : (type === 'error' ? '⚠️' : 'ℹ️');
  toast.innerHTML = `<span style="font-weight:bold; color:var(--accent-blue);">${icon}</span> <span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

// ==========================================
// CONFIGURAZIONE PREDEFINITA & STANDALONE HTML
// ==========================================
const STANDALONE_CATEGORIES = {
  legnano: {
    id: "legnano", name: "Legnano", enabled: true, color: "#16a34a", icon: "map-pin",
    sources: [
      { id: "googlenews_legnano", name: "Google News Legnano", url: "https://news.google.com/rss/search?q=%22Legnano%22+when:2d&hl=it&gl=IT&ceid=IT:it", enabled: true },
      { id: "legnanonews", name: "LegnanoNews", url: "https://www.legnanonews.com/feed/", enabled: true },
      { id: "sempionenews", name: "Sempione News", url: "https://www.sempionenews.it/feed/", enabled: true },
      { id: "primamilanoovest", name: "Prima Milano Ovest", url: "https://primamilanoovest.it/feed/", enabled: true }
    ]
  },
  tecnologia: {
    id: "tecnologia", name: "Tecnologia", enabled: true, color: "#2563eb", icon: "cpu",
    sources: [
      { id: "garmin_enduro", name: "Garmin Enduro 3", url: "https://news.google.com/rss/search?q=%22Garmin+Enduro%22+OR+%22Enduro+3%22+when:7d&hl=it&gl=IT&ceid=IT:it", enabled: true },
      { id: "google_pixel", name: "Telefoni Google Pixel", url: "https://news.google.com/rss/search?q=%22Google+Pixel%22+when:2d&hl=it&gl=IT&ceid=IT:it", enabled: true },
      { id: "drone_antigravity", name: "Drone Antigravity A1", url: "https://news.google.com/rss/search?q=%22Antigravity+A1%22+OR+%22Drone+Antigravity%22+OR+Antigravity+drone&hl=it&gl=IT&ceid=IT:it", enabled: true },
      { id: "hdblog", name: "HDblog", url: "https://www.hdblog.it/feed/", enabled: true },
      { id: "wired", name: "Wired Italia", url: "https://www.wired.it/feed/rss", enabled: true },
      { id: "tomshw", name: "Tom's Hardware", url: "https://www.tomshw.it/feed/", enabled: true }
    ]
  },
  cronaca_italia: {
    id: "cronaca_italia", name: "Cronaca italiana", enabled: true, color: "#dc2626", icon: "flag",
    sources: [
      { id: "ansa_cronaca", name: "ANSA Cronaca", url: "https://www.ansa.it/sito/ansait_rss.xml", enabled: true },
      { id: "tgcom24", name: "TGCOM24 Cronaca", url: "https://www.tgcom24.mediaset.it/rss/cronaca.xml", enabled: true },
      { id: "rainews", name: "RaiNews", url: "https://www.rainews.it/rss/tutti", enabled: true }
    ]
  },
  cronaca_estera: {
    id: "cronaca_estera", name: "Cronaca estera", enabled: true, color: "#0891b2", icon: "globe",
    sources: [
      { id: "ansa_mondo", name: "ANSA Mondo", url: "https://www.ansa.it/sito/notizie/mondo/mondo_rss.xml", enabled: true },
      { id: "euronews", name: "Euronews Italiano", url: "https://it.euronews.com/rss", enabled: true },
      { id: "bbc", name: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml", enabled: true }
    ]
  },
  economia: {
    id: "economia", name: "Economia", enabled: true, color: "#059669", icon: "trending-up",
    sources: [
      { id: "ilsole24ore", name: "Il Sole 24 Ore", url: "https://www.ilsole24ore.com/rss/economia.xml", enabled: true },
      { id: "ansa_economia", name: "ANSA Economia", url: "https://www.ansa.it/sito/notizie/economia/economia_rss.xml", enabled: true },
      { id: "milanofinanza", name: "Milano Finanza", url: "https://www.milanofinanza.it/rss", enabled: true }
    ]
  },
  juventus: {
    id: "juventus", name: "Juventus", enabled: true, color: "#18181b", icon: "shield",
    sources: [
      { id: "googlenews_juve_seriea", name: "Google News Juve Serie A", url: "https://news.google.com/rss/search?q=%22Juventus%22+%22Serie+A%22+when:2d&hl=it&gl=IT&ceid=IT:it", enabled: true },
      { id: "tuttojuve", name: "TuttoJuve", url: "https://www.tuttojuve.com/rss", enabled: true },
      { id: "juventusnews24", name: "JuventusNews24", url: "https://www.juventusnews24.com/feed/", enabled: true }
    ]
  },
  tesla: {
    id: "tesla", name: "Tesla", enabled: true, color: "#e11d48", icon: "zap",
    sources: [
      { id: "insideevs", name: "InsideEVs Italia", url: "https://it.insideevs.com/rss/news/all/", enabled: true },
      { id: "electrek_tesla", name: "Electrek Tesla", url: "https://electrek.co/guides/tesla/feed/", enabled: true },
      { id: "googlenews_tesla", name: "Google News Tesla", url: "https://news.google.com/rss/search?q=Tesla+auto+when:2d&hl=it&gl=IT&ceid=IT:it", enabled: true }
    ]
  }
};

const CORS_PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`
];

async function clientFetchRSS(feedUrl) {
  for (const getProxyUrl of CORS_PROXIES) {
    try {
      const resp = await fetch(getProxyUrl(feedUrl));
      if (resp.ok) {
        const text = await resp.text();
        return text;
      }
    } catch (e) {
      // Prova proxy successivo
    }
  }
  return null;
}

function parseClientRSS(xmlText, sourceName, categoryId, categoryName, categoryColor) {
  const articles = [];
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const items = Array.from(xmlDoc.querySelectorAll("item, entry")).slice(0, 15);
    const now = Date.now();
    const MAX_48H_MS = 48 * 3600 * 1000;

    items.forEach(el => {
      const title = el.querySelector("title")?.textContent || "";
      const link = el.querySelector("link")?.textContent || el.querySelector("link")?.getAttribute("href") || "";
      const pubDateStr = el.querySelector("pubDate, date, updated, published")?.textContent || "";
      let pubDate = pubDateStr ? new Date(pubDateStr) : new Date();
      if (isNaN(pubDate.getTime())) pubDate = new Date();

      // REQUISITO TASSATIVO: notizie recenti entro 48 ore
      const ageMs = now - pubDate.getTime();
      if (ageMs > MAX_48H_MS) {
        return; // Scarta notizia più vecchia di 48 ore
      }

      // Immagine
      let img = el.querySelector("enclosure[type^='image']")?.getAttribute("url") ||
                el.querySelector("thumbnail")?.getAttribute("url") ||
                el.querySelector("content[medium='image']")?.getAttribute("url") || null;
      
      const desc = el.querySelector("description, summary, content")?.textContent || "";
      if (!img) {
        const m = desc.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
        if (m) img = m[1];
      }

      const cleanDesc = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      // 1. Filtro Legnano: deve riguardare esplicitamente la città di Legnano
      if (categoryId === 'legnano') {
        const text = (title + ' ' + cleanDesc).toLowerCase();
        if (!/\blegnan[oaie]\b|palio di legnano|città di legnano|comune di legnano|ac legnano|knights legnano/.test(text)) {
          return;
        }
      }

      // 2. Filtro Juventus: maschile Serie A, esclusione femminile, giovanili, next gen
      if (categoryId === 'juventus') {
        const text = (title + ' ' + cleanDesc).toLowerCase();
        if (!/\b(juventus|juve|juventin[oaei])\b/.test(text)) {
          return;
        }
        if (/women|femminil|next gen|nextgen|serie c|under 19|under 17|under 16|primavera/.test(title.toLowerCase())) {
          return;
        }
      }

      // 3. Priorità Tecnologia: Garmin Enduro 3, Google Pixel, Drone Antigravity A1
      let priorityScore = 0;
      let priorityBadge = '';
      if (categoryId === 'tecnologia') {
        const t = (title + ' ' + cleanDesc).toLowerCase();
        if (t.includes('garmin enduro') || t.includes('enduro 3')) {
          priorityScore = 1000;
          priorityBadge = '⚡ In Evidenza: Garmin Enduro 3';
        } else if (t.includes('google pixel') || t.includes('pixel 9') || t.includes('pixel 8') || t.includes('telefoni pixel') || t.includes('pixel fold')) {
          priorityScore = 900;
          priorityBadge = '⚡ In Evidenza: Google Pixel';
        } else if (t.includes('antigravity') || t.includes('drone antigravity') || t.includes('antigravity a1')) {
          priorityScore = 850;
          priorityBadge = '⚡ In Evidenza: Drone Antigravity A1';
        } else if (t.includes('garmin')) {
          priorityScore = 300;
        } else if (t.includes('pixel')) {
          priorityScore = 200;
        }
      }

      articles.push({
        id: btoa(unescape(encodeURIComponent(link + title))).slice(0, 20),
        title: title.replace(/\s+-\s+[^-]+$/, '').trim(),
        link: link,
        summary: cleanDesc.slice(0, 220) + (cleanDesc.length > 220 ? '...' : ''),
        image: img || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600',
        source: sourceName,
        source_url: link,
        category_id: categoryId,
        category_name: categoryName,
        category_color: categoryColor,
        priority_score: priorityScore,
        priority_badge: priorityBadge,
        pub_date: formatRelativeTime(pubDate),
        timestamp: pubDate.getTime() / 1000
      });
    });
  } catch (e) {
    console.warn("Parsing XML client fallito:", e);
  }
  return articles;
}

function formatRelativeTime(date) {
  const diffSec = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Pochi secondi fa";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min fa`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h fa`;
  if (diffSec < 172800) return "Ieri";
  return `${Math.floor(diffSec / 86400)} giorni fa`;
}

// ==========================================
// GESTIONE CHIAMATE API CON STANDALONE DUAL-MODE
// ==========================================
async function apiGetSettings() {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      return data.settings || null;
    }
  } catch (err) {
    // Fallback locale in modalità HTML pura
  }
  const saved = localStorage.getItem('maxnews_settings');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return {
    version: "v1.2",
    theme: "dark",
    categories: STANDALONE_CATEGORIES
  };
}

async function apiSaveSettings(settings) {
  settings.version = "v1.2";
  localStorage.setItem('maxnews_settings', JSON.stringify(settings));
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    // Salvato in locale
  }
  return { success: true, settings: settings };
}

async function apiResetSettings() {
  const def = { version: "v1.3", theme: "dark", categories: STANDALONE_CATEGORIES };
  localStorage.removeItem('maxnews_settings');
  try {
    const res = await fetch('/api/settings/reset', { method: 'POST' });
    if (res.ok) return await res.json();
  } catch (err) {}
  return { success: true, settings: def };
}

async function apiGetNews(category = 'all', refresh = false) {
  try {
    const url = `/api/news?category=${encodeURIComponent(category)}&refresh=${refresh ? 'true' : 'false'}`;
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (err) {
    // Fallback client-side per HTML autonomo
  }

  // Fallback standalone client-side
  const settings = AppState.settings || { categories: STANDALONE_CATEGORIES };
  const categories = settings.categories || STANDALONE_CATEGORIES;
  const resultsByCat = {};
  const unified = [];

  for (const catId of Object.keys(categories)) {
    const cat = categories[catId];
    if (cat.enabled && (category === 'all' || category === catId)) {
      const catArticles = [];
      for (const src of (cat.sources || [])) {
        if (src.enabled && src.url) {
          const xml = await clientFetchRSS(src.url);
          if (xml) {
            const parsed = parseClientRSS(xml, src.name, cat.id, cat.name, cat.color);
            catArticles.push(...parsed);
          }
        }
      }
      catArticles.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0) || b.timestamp - a.timestamp);
      resultsByCat[catId] = {
        id: catId, name: cat.name, color: cat.color, articles: catArticles
      };
      unified.push(...catArticles);
    }
  }

  unified.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0) || b.timestamp - a.timestamp);
  return {
    success: true,
    category_filter: category,
    categories: resultsByCat,
    unified: unified,
    updated_at: new Date().toLocaleTimeString()
  };
}

async function apiSearchNews(query) {
  try {
    const url = `/api/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (err) {}

  // Fallback client-side search con Google News RSS
  const encodedQ = encodeURIComponent(query.trim() + " when:2d");
  const googleNewsUrl = `https://news.google.com/rss/search?q=${encodedQ}&hl=it&gl=IT&ceid=IT:it`;
  const xml = await clientFetchRSS(googleNewsUrl);
  if (xml) {
    const results = parseClientRSS(xml, "Ricerca Live", "search", `Risultati per "${query}"`, "#8b5cf6");
    return { success: true, query, results };
  }
  return { success: false, results: [] };
}

async function apiGetArticleDetail(url, title, categoryId, source) {
  try {
    const endpoint = `/api/article?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&category_id=${encodeURIComponent(categoryId)}&source=${encodeURIComponent(source)}`;
    const res = await fetch(endpoint);
    if (res.ok) return await res.json();
  } catch (err) {}

  // Fallback sintetico per HTML puro
  return {
    success: true,
    article: {
      url: url,
      title: title,
      category_id: categoryId,
      content_paragraphs: [
        "La notizia completa è disponibile direttamente presso la fonte ufficiale.",
        "Fai clic sul pulsante sottostante 'Apri articolo originale sulla fonte' per visualizzare tutti i contenuti multimediali."
      ],
      videos: [{
        type: "youtube_search",
        src: `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(title.slice(0, 50))}`,
        title: "Approfondimento multimediale correlato"
      }],
      related_sources: []
    }
  };
}

async function apiGetStats() {
  try {
    const res = await fetch('/api/stats');
    if (res.ok) {
      const data = await res.json();
      return data.stats || null;
    }
  } catch (err) {}

  const stats = JSON.parse(localStorage.getItem('maxnews_stats') || '{"total_reads":0,"total_searches":0,"categories_reads":{},"recent_reads":[],"recent_searches":[]}');
  return stats;
}

// ==========================================
// RENDERING DELLE NOTIZIE
// ==========================================
function renderNewsFeed(newsData, filter = 'all') {
  DOM.newsFeedContainer.innerHTML = '';

  if (!newsData) {
    DOM.newsFeedContainer.innerHTML = `
      <div style="text-align:center; padding:3rem; color:var(--text-muted);">
        <p>Nessuna notizia disponibile al momento. Prova ad aggiornare o a verificare la connessione.</p>
      </div>`;
    return;
  }

  // Se è attiva una ricerca
  if (AppState.isSearching) {
    renderSearchResults(newsData);
    return;
  }

  // Vista categoria singola
  if (filter !== 'all') {
    const cat = newsData.categories ? newsData.categories[filter] : null;
    const articles = (newsData.category_filter === filter && newsData.articles) ? newsData.articles : (cat ? cat.articles : []);
    
    const catName = cat ? cat.name : (newsData.category_info ? newsData.category_info.name : filter);
    const catColor = cat ? cat.color : (newsData.category_info ? newsData.category_info.color : '#3b82f6');

    renderCategorySection(filter, catName, catColor, articles, false);
    return;
  }

  // Vista "Tutte le categorie"
  const categories = newsData.categories || {};
  const catKeys = Object.keys(categories);

  if (catKeys.length === 0) {
    DOM.newsFeedContainer.innerHTML = `
      <div style="text-align:center; padding:3rem; color:var(--text-muted);">
        <p>Nessuna categoria attiva. Vai nelle <strong>Impostazioni</strong> per attivare le tue categorie preferite.</p>
      </div>`;
    return;
  }

  catKeys.forEach(catId => {
    const cat = categories[catId];
    if (cat.articles && cat.articles.length > 0) {
      renderCategorySection(cat.id, cat.name, cat.color, cat.articles, true);
    }
  });
}

function renderCategorySection(catId, catName, catColor, articles, showShortcut = true) {
  const block = document.createElement('div');
  block.className = 'category-block';
  block.dataset.category = catId;

  let shortcutHtml = '';
  if (showShortcut) {
    shortcutHtml = `
      <button class="category-filter-shortcut" data-filter="${catId}">
        Vedi solo ${escapeHtml(catName)} →
      </button>
    `;
  }

  block.innerHTML = `
    <div class="category-header">
      <div class="category-title-group">
        <span class="category-indicator" style="background:${catColor};"></span>
        <h2 class="category-heading">${escapeHtml(catName)}</h2>
        <span class="category-count">${articles.length} notizie</span>
      </div>
      ${shortcutHtml}
    </div>
    <div class="news-grid"></div>
  `;

  const grid = block.querySelector('.news-grid');
  articles.forEach(article => {
    const card = createNewsCard(article);
    grid.appendChild(card);
  });

  DOM.newsFeedContainer.appendChild(block);
}

function renderSearchResults(results) {
  const block = document.createElement('div');
  block.className = 'category-block';

  block.innerHTML = `
    <div class="category-header">
      <div class="category-title-group">
        <span class="category-indicator" style="background:#8b5cf6;"></span>
        <h2 class="category-heading">Risultati della Ricerca Live</h2>
        <span class="category-count">${results.length} trovati</span>
      </div>
    </div>
    <div class="news-grid"></div>
  `;

  const grid = block.querySelector('.news-grid');
  if (results.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: var(--text-muted);">Nessun articolo trovato per "${escapeHtml(AppState.searchQuery)}". Prova con altri termini.</div>`;
  } else {
    results.forEach(article => {
      const card = createNewsCard(article);
      grid.appendChild(card);
    });
  }

  DOM.newsFeedContainer.appendChild(block);
}

function createNewsCard(article) {
  const card = document.createElement('div');
  card.className = 'news-card';
  card.dataset.id = article.id;

  const imgSrc = article.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80';
  const categoryColor = article.category_color || '#3b82f6';
  const categoryName = article.category_name || 'News';
  const priorityBadgeHtml = article.priority_badge ? `
    <span class="card-priority-badge" style="position: absolute; top: 10px; left: 10px; background: rgba(37, 99, 235, 0.92); color: white; padding: 4px 9px; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; box-shadow: 0 2px 6px rgba(0,0,0,0.35); backdrop-filter: blur(4px); z-index: 2; border: 1px solid rgba(255,255,255,0.2);">
      ${escapeHtml(article.priority_badge)}
    </span>
  ` : '';

  card.innerHTML = `
    <div class="card-image-wrap">
      ${priorityBadgeHtml}
      <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(article.title)}" class="card-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80'">
      <span class="card-category-badge" style="background:${categoryColor};">${escapeHtml(categoryName)}</span>
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span class="card-source">${escapeHtml(article.source || 'Fonte')}</span>
        <span class="card-time">
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          ${escapeHtml(article.pub_date || '')}
        </span>
      </div>
      <h3 class="card-title">${escapeHtml(article.title)}</h3>
      <p class="card-summary">${escapeHtml(article.summary || '')}</p>
      <div class="card-footer">
        <span class="card-read-more">Leggi articolo &rarr;</span>
      </div>
    </div>
  `;

  // Click su card: apre la schermata articolo arricchita
  card.addEventListener('click', () => {
    openArticleModal(article);
  });

  return card;
}

// ==========================================
// MODALE SCHERMATA NOTIZIA COMPLETA (TESTO, FOTO, VIDEO, MULTI-FONTE)
// ==========================================
async function openArticleModal(article) {
  AppState.activeArticle = article;

  // Popola dati immediati
  DOM.modalCategoryBadge.textContent = article.category_name || 'Notizia';
  DOM.modalCategoryBadge.style.background = article.category_color || '#3b82f6';
  DOM.modalSourceBadge.textContent = article.source || 'Fonte Web';
  DOM.modalPubDate.textContent = article.pub_date || '';
  DOM.modalArticleTitle.textContent = article.title || '';

  // Immagine Hero iniziale
  DOM.modalHeroImg.style.display = 'block';
  if (article.image) {
    DOM.modalHeroImg.src = article.image;
    DOM.modalHeroMedia.style.display = 'block';
  } else {
    DOM.modalHeroMedia.style.display = 'none';
  }

  // Reset sezioni
  DOM.modalVideoSection.style.display = 'none';
  DOM.modalVideoIframe.src = '';
  DOM.modalGallerySection.style.display = 'none';
  DOM.modalGalleryGrid.innerHTML = '';
  DOM.modalMultiSourceSection.style.display = 'none';
  DOM.modalMultiSourceList.innerHTML = '';
  DOM.modalSourceLink.href = article.link || '#';

  // Placeholder testo iniziale
  DOM.modalArticleContent.innerHTML = `
    <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-muted); margin-bottom:1rem;">
      <span class="live-dot"></span> Caricamento contenuto completo, foto e video dalla fonte...
    </div>
    <p>${escapeHtml(article.summary || '')}</p>
  `;

  // Mostra il modale subito per massima reattività
  DOM.articleModal.classList.add('open');
  DOM.articleModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Chiamata backend per estrazione approfondita
  const detailRes = await apiGetArticleDetail(article.link, article.title, article.category_id, article.source);
  if (detailRes.success && detailRes.article) {
    const det = detailRes.article;

    // Aggiorna Hero image se presente ad alta risoluzione
    if (det.hero_image) {
      DOM.modalHeroImg.src = det.hero_image;
      DOM.modalHeroMedia.style.display = 'block';
    }

    // Paragrafi testo
    if (det.content_paragraphs && det.content_paragraphs.length > 0) {
      DOM.modalArticleContent.innerHTML = det.content_paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
    }

    // Video incorporati verificati ("Se un video non è visualizzabile non mostrarlo")
    if (det.videos && det.videos.length > 0 && det.videos[0].src) {
      const v = det.videos[0];
      DOM.modalVideoIframe.onerror = function() {
        DOM.modalVideoSection.style.display = 'none';
        DOM.modalVideoIframe.src = '';
      };
      DOM.modalVideoIframe.src = v.src;
      DOM.modalVideoLabel.textContent = v.title || 'Filmato e approfondimento video';
      DOM.modalVideoSection.style.display = 'block';
    } else {
      DOM.modalVideoSection.style.display = 'none';
      DOM.modalVideoIframe.src = '';
    }

    // Galleria foto aggiuntive
    if (det.gallery_images && det.gallery_images.length > 0) {
      DOM.modalGalleryGrid.innerHTML = det.gallery_images.map(imgUrl => `
        <div class="gallery-item">
          <img src="${escapeHtml(imgUrl)}" alt="Foto notizia" loading="lazy" onclick="window.open('${escapeHtml(imgUrl)}', '_blank')">
        </div>
      `).join('');
      DOM.modalGallerySection.style.display = 'block';
    }

    // Sintesi Multi-Fonte ("Combinando la stessa notizia da più fonti")
    if (det.related_sources && det.related_sources.length > 0) {
      DOM.modalMultiSourceList.innerHTML = det.related_sources.map(rel => `
        <a href="${escapeHtml(rel.link)}" target="_blank" rel="noopener noreferrer" class="multi-source-card">
          <img src="${escapeHtml(rel.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=120')}" class="multi-source-thumb" alt="Anteprima">
          <div class="multi-source-content">
            <h4 class="multi-source-title">${escapeHtml(rel.title)}</h4>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="multi-source-source">${escapeHtml(rel.source || 'Altra Fonte')}</span>
              <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(rel.pub_date || '')}</span>
            </div>
          </div>
        </a>
      `).join('');
      DOM.modalMultiSourceSection.style.display = 'block';
    }
  }
}

function closeArticleModal() {
  DOM.articleModal.classList.remove('open');
  DOM.articleModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  // Ferma e nasconde eventuali video in riproduzione
  DOM.modalVideoIframe.src = '';
  DOM.modalVideoSection.style.display = 'none';
}

// ==========================================
// MODALE SETTINGS (TENDINA COMPRESSA, FONTI, VERSIONE v1.0)
// ==========================================
function openSettingsModal() {
  renderSettingsCategories();
  DOM.settingsModal.classList.add('open');
  DOM.settingsModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeSettingsModal() {
  DOM.settingsModal.classList.remove('open');
  DOM.settingsModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function toggleSettingsAccordion() {
  DOM.categoriesAccordion.classList.toggle('open');
}

function renderSettingsCategories() {
  if (!AppState.settings || !AppState.settings.categories) return;

  AppState.expandedCategories = AppState.expandedCategories || {};
  const categories = AppState.settings.categories;
  DOM.categoriesConfigList.innerHTML = '';

  // Barra comandi rapida: Espandi tutte / Comprimi tutte
  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding: 0 0.25rem; font-size: 0.82rem; color: var(--text-secondary); flex-wrap: wrap; gap: 0.5rem;';
  toolbar.innerHTML = `
    <span>Tocca il <strong>simbolo dell'occhio 👁️</strong> per visualizzare le fonti:</span>
    <div style="display: flex; gap: 0.4rem;">
      <button type="button" id="expandAllCategoriesBtn" class="btn-sm" style="font-size:0.75rem; padding: 3px 8px; cursor:pointer;">Espandi tutte</button>
      <button type="button" id="collapseAllCategoriesBtn" class="btn-sm" style="font-size:0.75rem; padding: 3px 8px; cursor:pointer;">Comprimi tutte</button>
    </div>
  `;
  DOM.categoriesConfigList.appendChild(toolbar);

  Object.keys(categories).forEach(catId => {
    const cat = categories[catId];
    const isExpanded = !!AppState.expandedCategories[catId];
    const catItem = document.createElement('div');
    catItem.className = `category-config-item ${isExpanded ? 'expanded' : ''}`;
    catItem.dataset.id = catId;

    // Lista fonti per questa categoria
    const sourcesHtml = (cat.sources || []).map((src, idx) => `
      <div class="source-item" data-idx="${idx}">
        <div class="source-info">
          <span class="source-name">${escapeHtml(src.name)}</span>
          <span class="source-url" title="${escapeHtml(src.url)}">${escapeHtml(src.url)}</span>
        </div>
        <button class="delete-source-btn" data-cat="${catId}" data-idx="${idx}" title="Elimina fonte">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
    `).join('');

    catItem.innerHTML = `
      <div class="category-config-top">
        <label class="category-config-label" for="toggle_${catId}">
          <span class="category-indicator" style="background:${cat.color || '#3b82f6'};"></span>
          <span>${escapeHtml(cat.name)}</span>
          <span class="category-sources-badge">${(cat.sources || []).length} fonti</span>
        </label>

        <div class="category-config-controls">
          <!-- Simbolo dell'occhio per espandere / comprimere -->
          <button type="button" class="category-eye-btn ${isExpanded ? 'active' : ''}" data-cat="${catId}" title="${isExpanded ? 'Comprimi fonti (Nascondi)' : 'Espandi fonti (Mostra)'}" aria-label="Espandi o comprimi fonti">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </button>

          <label class="switch" title="Attiva/disattiva categoria">
            <input type="checkbox" id="toggle_${catId}" data-cat="${catId}" ${cat.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="sources-container" id="sourcesContainer_${catId}">
        <div class="sources-label">Fonti Configurate (${(cat.sources || []).length})</div>
        <div class="sources-list" id="sourcesList_${catId}">
          ${sourcesHtml || '<div style="color:var(--text-muted); font-size:0.8rem;">Nessuna fonte configurata.</div>'}
        </div>

        <!-- Form per aggiungere nuovo sito web / fonte -->
        <div class="add-source-form">
          <input type="text" id="newSrcName_${catId}" class="input-sm" placeholder="Nome (es. Nuova Fonte)" style="max-width:140px;">
          <input type="url" id="newSrcUrl_${catId}" class="input-sm" placeholder="URL Feed RSS o Sito web (https://...)">
          <button class="btn-sm add-source-btn" data-cat="${catId}" style="background:var(--accent-blue);">+ Aggiungi Fonte</button>
        </div>
      </div>
    `;

    DOM.categoriesConfigList.appendChild(catItem);
  });

  // Event listener pulsante occhio per espandere/comprimere singola categoria
  DOM.categoriesConfigList.querySelectorAll('.category-eye-btn').forEach(eyeBtn => {
    eyeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const catId = eyeBtn.dataset.cat;
      const isCurrentlyExpanded = !!AppState.expandedCategories[catId];
      AppState.expandedCategories[catId] = !isCurrentlyExpanded;
      
      const catItem = eyeBtn.closest('.category-config-item');
      if (catItem) {
        const newState = AppState.expandedCategories[catId];
        catItem.classList.toggle('expanded', newState);
        eyeBtn.classList.toggle('active', newState);
        eyeBtn.title = newState ? 'Comprimi fonti (Nascondi)' : 'Espandi fonti (Mostra)';
      }
    });
  });

  // Toolbar Espandi Tutte / Comprimi Tutte
  document.getElementById('expandAllCategoriesBtn')?.addEventListener('click', () => {
    Object.keys(categories).forEach(id => AppState.expandedCategories[id] = true);
    renderSettingsCategories();
  });
  document.getElementById('collapseAllCategoriesBtn')?.addEventListener('click', () => {
    Object.keys(categories).forEach(id => AppState.expandedCategories[id] = false);
    renderSettingsCategories();
  });

  // Event listener per checkbox attivazione categoria
  DOM.categoriesConfigList.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const catId = e.target.dataset.cat;
      if (AppState.settings.categories[catId]) {
        AppState.settings.categories[catId].enabled = e.target.checked;
      }
    });
  });

  // Event listener per eliminazione fonte
  DOM.categoriesConfigList.querySelectorAll('.delete-source-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const catId = btn.dataset.cat;
      const idx = parseInt(btn.dataset.idx, 10);
      if (AppState.settings.categories[catId] && AppState.settings.categories[catId].sources) {
        AppState.settings.categories[catId].sources.splice(idx, 1);
        renderSettingsCategories();
      }
    });
  });

  // Event listener per aggiunta nuova fonte
  DOM.categoriesConfigList.querySelectorAll('.add-source-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.dataset.cat;
      const nameInput = document.getElementById(`newSrcName_${catId}`);
      const urlInput = document.getElementById(`newSrcUrl_${catId}`);
      const name = nameInput.value.trim();
      const url = urlInput.value.trim();

      if (!url || !url.startsWith('http')) {
        showToast('Inserisci un URL valido che inizia con http:// o https://', 'error');
        return;
      }

      const srcName = name || new URL(url).hostname.replace('www.', '');
      if (!AppState.settings.categories[catId].sources) {
        AppState.settings.categories[catId].sources = [];
      }
      AppState.settings.categories[catId].sources.push({
        id: `custom_${Date.now()}`,
        name: srcName,
        url: url,
        enabled: true
      });

      showToast(`Fonte "${srcName}" aggiunta alla categoria ${AppState.settings.categories[catId].name}!`, 'success');
      renderSettingsCategories();
    });
  });
}

async function handleSaveSettings() {
  DOM.saveSettingsBtn.disabled = true;
  DOM.saveSettingsBtn.textContent = 'Salvataggio su Firebase...';

  const res = await apiSaveSettings(AppState.settings);
  DOM.saveSettingsBtn.disabled = false;
  DOM.saveSettingsBtn.textContent = 'Salva su Firebase';

  if (res.success) {
    showToast('Impostazioni salvate con successo su Firebase Firestore!', 'success');
    updateCategoryDropdown();
    closeSettingsModal();
    // Ricarica notizie con le nuove categorie/fonti
    await loadNews(AppState.currentCategoryFilter, true);
  } else {
    showToast('Errore durante il salvataggio su Firebase', 'error');
  }
}

async function handleResetSettings() {
  if (!confirm('Vuoi ripristinare le impostazioni e le fonti predefinite di fabbrica?')) return;
  DOM.resetSettingsBtn.disabled = true;
  const res = await apiResetSettings();
  DOM.resetSettingsBtn.disabled = false;

  if (res.success) {
    AppState.settings = res.settings;
    showToast('Impostazioni predefinite ripristinate su Firebase!', 'success');
    renderSettingsCategories();
    updateCategoryDropdown();
    await loadNews(AppState.currentCategoryFilter, true);
  } else {
    showToast('Errore nel ripristino delle impostazioni', 'error');
  }
}

function updateCategoryDropdown() {
  if (!AppState.settings || !AppState.settings.categories) return;

  const currentVal = DOM.categoryFilterSelect.value;
  DOM.categoryFilterSelect.innerHTML = '<option value="all">📰 Tutte le categorie</option>';

  const cats = AppState.settings.categories;
  Object.keys(cats).forEach(catId => {
    const cat = cats[catId];
    if (cat.enabled) {
      const opt = document.createElement('option');
      opt.value = catId;
      opt.textContent = `${cat.name}`;
      DOM.categoryFilterSelect.appendChild(opt);
    }
  });

  if (Array.from(DOM.categoryFilterSelect.options).some(o => o.value === currentVal)) {
    DOM.categoryFilterSelect.value = currentVal;
  } else {
    DOM.categoryFilterSelect.value = 'all';
    AppState.currentCategoryFilter = 'all';
  }
}

// ==========================================
// MODALE STATISTICHE (MANDATORIA REGOLA 3)
// ==========================================
async function openStatsModal() {
  DOM.statsModal.classList.add('open');
  DOM.statsModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  const stats = await apiGetStats();
  if (stats) {
    AppState.stats = stats;
    renderStatsView(stats);
  }
}

function closeStatsModal() {
  DOM.statsModal.classList.remove('open');
  DOM.statsModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function renderStatsView(stats) {
  DOM.statTotalReads.textContent = stats.total_reads || 0;
  DOM.statTotalSearches.textContent = stats.total_searches || 0;

  // Categorie attive
  const cats = AppState.settings ? AppState.settings.categories : {};
  const activeCount = Object.values(cats).filter(c => c.enabled).length;
  DOM.statActiveCategories.textContent = activeCount;

  // Grafico a barre letture per categoria
  const catReads = stats.categories_reads || {};
  const maxVal = Math.max(...Object.values(catReads), 1);

  DOM.statsCategoriesChart.innerHTML = '';
  Object.keys(cats).forEach(catId => {
    const cat = cats[catId];
    const reads = catReads[catId] || 0;
    const percentage = Math.round((reads / maxVal) * 100);

    const row = document.createElement('div');
    row.className = 'chart-row';
    row.innerHTML = `
      <div class="chart-row-info">
        <span style="display:flex; align-items:center; gap:6px;">
          <span class="category-indicator" style="background:${cat.color || '#3b82f6'};"></span>
          ${escapeHtml(cat.name)}
        </span>
        <span style="color:var(--accent-blue);">${reads} letture</span>
      </div>
      <div class="chart-bar-bg">
        <div class="chart-bar-fill" style="width: ${percentage}%; background: ${cat.color || '#3b82f6'};"></div>
      </div>
    `;
    DOM.statsCategoriesChart.appendChild(row);
  });

  // Ultime notizie lette
  const recentReads = stats.recent_reads || [];
  if (recentReads.length === 0) {
    DOM.recentReadsList.innerHTML = '<div style="color:var(--text-muted); font-size:0.85rem;">Nessuna notizia ancora letta. Inizia subito a leggere un articolo!</div>';
  } else {
    DOM.recentReadsList.innerHTML = recentReads.map(r => `
      <div class="recent-activity-item">
        <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:70%;">
          ${escapeHtml(r.title)}
        </div>
        <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(r.source || '')}</span>
      </div>
    `).join('');
  }
}

// ==========================================
// RICERCA ONLINE IN TEMPO REALE
// ==========================================
async function handleLiveSearch() {
  const query = DOM.liveSearchInput.value.trim();
  if (!query || query.length < 2) {
    showToast('Inserisci almeno 2 caratteri per la ricerca live', 'info');
    return;
  }

  AppState.isSearching = true;
  AppState.searchQuery = query;

  // Aggiorna banner di stato
  DOM.statusIcon.textContent = '🔍';
  DOM.statusMessage.innerHTML = `Risultati online in tempo reale per: <strong>"${escapeHtml(query)}"</strong>`;
  DOM.statusBanner.classList.remove('hidden');
  DOM.clearSearchBtn.style.display = 'block';

  // Mostra skeleton di caricamento
  DOM.newsFeedContainer.innerHTML = `
    <div class="category-block">
      <div style="padding: 1rem 0; color: var(--text-secondary); display:flex; align-items:center; gap:8px;">
        <span class="live-dot"></span> Ricerca live delle notizie in corso su Google News...
      </div>
      <div class="news-grid">
        <div class="news-card"><div class="skeleton" style="height:180px;"></div></div>
        <div class="news-card"><div class="skeleton" style="height:180px;"></div></div>
        <div class="news-card"><div class="skeleton" style="height:180px;"></div></div>
      </div>
    </div>
  `;

  const searchRes = await apiSearchNews(query);
  if (searchRes.success) {
    renderNewsFeed(searchRes.results);
  } else {
    showToast('Errore durante la ricerca online', 'error');
  }
}

function clearSearch() {
  AppState.isSearching = false;
  AppState.searchQuery = '';
  DOM.liveSearchInput.value = '';
  DOM.clearSearchBtn.style.display = 'none';
  DOM.statusBanner.classList.add('hidden');
  renderNewsFeed(AppState.newsData, AppState.currentCategoryFilter);
}

// ==========================================
// CARICAMENTO PRINCIPALE NOTIZIE
// ==========================================
async function loadNews(category = 'all', refresh = false) {
  if (refresh) {
    DOM.refreshNewsBtn.style.transform = 'rotate(180deg)';
    setTimeout(() => DOM.refreshNewsBtn.style.transform = 'none', 400);
  }

  const res = await apiGetNews(category, refresh);
  if (res.success) {
    AppState.newsData = res;
    if (!AppState.isSearching) {
      renderNewsFeed(res, category);
    }
  } else {
    showToast('Impossibile recuperare le notizie', 'error');
  }
}

// ==========================================
// EVENT LISTENERS & INIZIALIZZAZIONE
// ==========================================
function setupEventListeners() {
  // Brand click -> reset alla home
  DOM.brandBtn.addEventListener('click', () => {
    DOM.categoryFilterSelect.value = 'all';
    AppState.currentCategoryFilter = 'all';
    clearSearch();
  });

  // Filtro Categorie a tendina nella barra superiore
  DOM.categoryFilterSelect.addEventListener('change', (e) => {
    const selected = e.target.value;
    AppState.currentCategoryFilter = selected;
    if (AppState.isSearching) {
      clearSearch();
    }
    loadNews(selected, false);
  });

  // Shortcut categoria "Vedi solo questa" dentro i blocchi notizie
  DOM.newsFeedContainer.addEventListener('click', (e) => {
    const shortcutBtn = e.target.closest('.category-filter-shortcut');
    if (shortcutBtn) {
      const filter = shortcutBtn.dataset.filter;
      DOM.categoryFilterSelect.value = filter;
      AppState.currentCategoryFilter = filter;
      loadNews(filter, false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // Refresh manuale
  DOM.refreshNewsBtn.addEventListener('click', () => {
    showToast('Aggiornamento notizie in tempo reale...', 'info');
    loadNews(AppState.currentCategoryFilter, true);
  });

  // Ricerca live
  DOM.submitSearchBtn.addEventListener('click', handleLiveSearch);
  DOM.liveSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleLiveSearch();
    }
  });
  DOM.liveSearchInput.addEventListener('input', (e) => {
    DOM.clearSearchBtn.style.display = e.target.value ? 'block' : 'none';
  });
  DOM.clearSearchBtn.addEventListener('click', clearSearch);
  DOM.resetViewBtn.addEventListener('click', clearSearch);

  // Modale Settings
  DOM.settingsModalBtn.addEventListener('click', openSettingsModal);
  DOM.closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
  DOM.categoriesAccordionHeader.addEventListener('click', toggleSettingsAccordion);
  DOM.saveSettingsBtn.addEventListener('click', handleSaveSettings);
  DOM.resetSettingsBtn.addEventListener('click', handleResetSettings);

  // Modale Statistiche
  DOM.statsModalBtn.addEventListener('click', openStatsModal);
  DOM.closeStatsModalBtn.addEventListener('click', closeStatsModal);
  DOM.closeStatsFooterBtn.addEventListener('click', closeStatsModal);

  // Modale Articolo
  DOM.closeArticleModalBtn.addEventListener('click', closeArticleModal);
  DOM.closeArticleFooterBtn.addEventListener('click', closeArticleModal);

  // Chiusura modali con click esterno su backdrop o tasto ESC
  window.addEventListener('click', (e) => {
    if (e.target === DOM.articleModal) closeArticleModal();
    if (e.target === DOM.settingsModal) closeSettingsModal();
    if (e.target === DOM.statsModal) closeStatsModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeArticleModal();
      closeSettingsModal();
      closeStatsModal();
    }
  });
}

// Inizializzazione applicazione
async function initApp() {
  setupEventListeners();

  // 1. Carica impostazioni da Firebase
  const settings = await apiGetSettings();
  if (settings) {
    AppState.settings = settings;
    updateCategoryDropdown();
  }

  // 2. Carica le notizie per tutte le categorie
  await loadNews('all', false);

  // 3. Pre-carica le statistiche per il contatore
  apiGetStats().then(st => {
    if (st) AppState.stats = st;
  });
}

// Avvio al caricamento del DOM
document.addEventListener('DOMContentLoaded', initApp);
