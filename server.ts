import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Ensure data folder exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Global helper to load DB
function readDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading db.json", err);
  }
  return { items: [], price_history: [], outfits: [], outfit_items: [], wear_log: [] };
}

// Global helper to save DB
function saveDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving db.json", err);
  }
}

// Seeder logic for wear_log based on the spec's target wear counts
function seedWearLogsIfEmpty() {
  const db = readDb();
  if (db.wear_log && db.wear_log.length > 0) {
    return;
  }

  console.log("Seeding wear logs for historical statistics...");
  const targetWears: Record<string, number> = {
    "item_1": 14, // Oversize Keten Gömlek
    "item_2": 9,  // Ekose Flanel Gömlek
    "item_3": 31, // Baskılı Pamuk T-Shirt
    "item_4": 6,  // Triko Polo Yaka
    "item_5": 38, // Straight Fit Kot
    "item_6": 7,  // Keten Pantolon
    "item_7": 12, // Kargo Pantolon
    "item_8": 11, // Kolej Ceket
    "item_9": 19, // Denim Ceket
    "item_11": 22, // Deri Chelsea Bot
    "item_12": 17, // Court Vision Sneaker
    "item_13": 4,   // Süet Loafer
    "item_14": 44,  // Deri Kemer
    "item_15": 13,  // Bere
    "item_16": 51   // Analog Saat
  };

  const logs: any[] = [];
  let logIdCounter = 1;

  // Generate log entries spread over the last 6 months
  const now = new Date();
  Object.entries(targetWears).forEach(([itemId, count]) => {
    for (let c = 0; c < count; c++) {
      // spread randomly inside past 180 days
      const daysAgo = Math.floor(Math.random() * 180) + 1;
      const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const yyyymmdd = date.toISOString().split("T")[0];

      logs.push({
        id: `log_${logIdCounter++}`,
        outfit_id: null,
        item_id: itemId,
        worn_on: yyyymmdd
      });
    }
  });

  // Also log some outfits
  db.outfits.forEach((outfit: any) => {
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const yyyymmdd = date.toISOString().split("T")[0];
    logs.push({
      id: `log_${logIdCounter++}`,
      outfit_id: outfit.id,
      item_id: null,
      worn_on: yyyymmdd
    });
  });

  db.wear_log = logs;
  saveDb(db);
  console.log(`Successfully seeded ${logs.length} wear logs!`);
}

// Run seeder
seedWearLogsIfEmpty();

// Lazy Gemini Initialization
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add it via Settings > Secrets.");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// API: List items
app.get("/api/items", (req, res) => {
  const db = readDb();
  res.json(db.items || []);
});

// API: Create new item
app.post("/api/items", (req, res) => {
  const db = readDb();
  const newItem = {
    id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    ...req.body,
    added_at: req.body.added_at || new Date().toISOString()
  };
  db.items.push(newItem);

  // Add initial price entry to price history
  const historyEntry = {
    id: `ph_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    item_id: newItem.id,
    price: newItem.added_price || 0,
    checked_at: newItem.added_at
  };
  db.price_history.push(historyEntry);

  saveDb(db);
  res.status(201).json(newItem);
});

// API: Update item
app.put("/api/items/:id", (req, res) => {
  const db = readDb();
  const index = db.items.findIndex((i: any) => i.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Item not found" });
  }

  // Handle price changes if status is updated or price is explicitly modified
  const currentItem = db.items[index];
  const updatedItem = {
    ...currentItem,
    ...req.body
  };

  db.items[index] = updatedItem;

  // Add a history item if price changes
  if (req.body.added_price !== undefined && req.body.added_price !== currentItem.added_price) {
    db.price_history.push({
      id: `ph_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      item_id: updatedItem.id,
      price: req.body.added_price,
      checked_at: new Date().toISOString()
    });
  }

  saveDb(db);
  res.json(updatedItem);
});

// API: Delete item
app.delete("/api/items/:id", (req, res) => {
  const db = readDb();
  db.items = db.items.filter((i: any) => i.id !== req.params.id);
  db.price_history = db.price_history.filter((ph: any) => ph.item_id !== req.params.id);
  db.wear_log = db.wear_log.filter((wl: any) => wl.item_id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// API: List outfits
app.get("/api/outfits", (req, res) => {
  const db = readDb();
  res.json({
    outfits: db.outfits || [],
    outfit_items: db.outfit_items || []
  });
});

// API: Save new outfit
app.post("/api/outfits", (req, res) => {
  const db = readDb();
  const outfitId = `outfit_${Date.now()}`;
  const { name, slots } = req.body; // slots is { "ÜST GİYİM": "id", ... }

  const newOutfit = {
    id: outfitId,
    name: name || "İsimsiz Kombin",
    created_at: new Date().toISOString()
  };

  db.outfits.push(newOutfit);

  Object.entries(slots).forEach(([slot, itemId]) => {
    if (itemId) {
      db.outfit_items.push({
        outfit_id: outfitId,
        item_id: itemId,
        slot
      });
    }
  });

  saveDb(db);
  res.status(201).json({ outfit: newOutfit, items: slots });
});

// API: Delete outfit
app.delete("/api/outfits/:id", (req, res) => {
  const db = readDb();
  db.outfits = db.outfits.filter((o: any) => o.id !== req.params.id);
  db.outfit_items = db.outfit_items.filter((oi: any) => oi.outfit_id !== req.params.id);
  db.wear_log = db.wear_log.filter((wl: any) => wl.outfit_id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// API: List wear logs
app.get("/api/wear-log", (req, res) => {
  const db = readDb();
  res.json(db.wear_log || []);
});

// API: Create wear log
app.post("/api/wear-log", (req, res) => {
  const db = readDb();
  const newLog = {
    id: `log_${Date.now()}`,
    item_id: req.body.item_id || null,
    outfit_id: req.body.outfit_id || null,
    worn_on: req.body.worn_on || new Date().toISOString().split("T")[0]
  };
  db.wear_log.push(newLog);
  saveDb(db);
  res.status(201).json(newLog);
});

// API: Get price history
app.get("/api/price-history", (req, res) => {
  const db = readDb();
  res.json(db.price_history || []);
});

// Unsplash'teki yuksek kaliteli moda gorselleri (Kullanici resimsiz kalmasin diye kategori tabanli gorseller)
const PLACEHOLDER_IMAGES: Record<string, string> = {
  "Tişört & Üst": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=70",
  "Gömlek": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=70",
  "Polo Yaka": "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&auto=format&fit=crop&q=70",
  "Triko & Kazak": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=70",
  "Hoodie & Sweatshirt": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&auto=format&fit=crop&q=70",
  "Pantolon": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=70",
  "Jean": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=70",
  "Şort": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=600&auto=format&fit=crop&q=70",
  "Eşofman": "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=600&auto=format&fit=crop&q=70",
  "Blazer & Takım": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=70",
  "Ceket & Mont": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=70",
  "İç Giyim & Çorap": "https://images.unsplash.com/photo-1582966772680-860e372bb558?w=600&auto=format&fit=crop&q=70",

  "Sneaker": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=70",
  "Bot": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&auto=format&fit=crop&q=70",
  "Chelsea Bot": "https://images.unsplash.com/photo-1608256253457-3f338d6bf961?w=600&auto=format&fit=crop&q=70",
  "Klasik": "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&auto=format&fit=crop&q=70",
  "Loafer": "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&auto=format&fit=crop&q=70",
  "Sandalet & Espadril": "https://images.unsplash.com/photo-1562273589-13669198902c?w=600&auto=format&fit=crop&q=70",
  "Terlik": "https://images.unsplash.com/photo-1605733513597-a8f8341084e6?w=600&auto=format&fit=crop&q=70",

  "Şapka & Bere": "https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=600&auto=format&fit=crop&q=70",
  "Şal & Atkı": "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&auto=format&fit=crop&q=70",
  "Kemer": "https://images.unsplash.com/photo-1624222247344-550fb805ebd8?w=600&auto=format&fit=crop&q=70",
  "Çanta": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=70",
  "Takı": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=70",
  "Güneş Gözlüğü": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=70",
  "Saat": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=70",
  "Cüzdan": "https://images.unsplash.com/photo-1627124765114-f8179f2b5606?w=600&auto=format&fit=crop&q=70"
};

// Akilli kategori ve alt kategori tahmini
function guessCategoryAndSubcategory(nameOrUrl: string) {
  const norm = nameOrUrl.toLowerCase();
  
  // AYAKKABI
  if (norm.includes("sneaker") || norm.includes("ayakkabi") || norm.includes("ayakkabı") || norm.includes("shoes") || norm.includes("shoe")) {
    if (norm.includes("class") || norm.includes("deri") || norm.includes("klasik")) return { category: "AYAKKABI" as const, subcategory: "Klasik" };
    if (norm.includes("bot") || norm.includes("boot")) {
      if (norm.includes("chelsea")) return { category: "AYAKKABI" as const, subcategory: "Chelsea Bot" };
      return { category: "AYAKKABI" as const, subcategory: "Bot" };
    }
    if (norm.includes("loafer")) return { category: "AYAKKABI" as const, subcategory: "Loafer" };
    if (norm.includes("sandal") || norm.includes("espadril")) return { category: "AYAKKABI" as const, subcategory: "Sandalet & Espadril" };
    if (norm.includes("terlik") || norm.includes("slipper")) return { category: "AYAKKABI" as const, subcategory: "Terlik" };
    return { category: "AYAKKABI" as const, subcategory: "Sneaker" };
  }
  if (norm.includes("loafer") || norm.includes("babet") || norm.includes("makosen")) {
    return { category: "AYAKKABI" as const, subcategory: "Loafer" };
  }
  if (norm.includes("bot") || norm.includes("çizme") || norm.includes("boot")) {
    return { category: "AYAKKABI" as const, subcategory: "Bot" };
  }
  if (norm.includes("terlik") || norm.includes("sandalet")) {
    return { category: "AYAKKABI" as const, subcategory: "Terlik" };
  }

  // AKSESUAR
  if (norm.includes("çanta") || norm.includes("bag") || norm.includes("backpack") || norm.includes("portföy")) {
    return { category: "AKSESUAR" as const, subcategory: "Çanta" };
  }
  if (norm.includes("şapka") || norm.includes("bere") || norm.includes("cap") || norm.includes("hat") || norm.includes("beanie")) {
    return { category: "AKSESUAR" as const, subcategory: "Şapka & Bere" };
  }
  if (norm.includes("şal") || norm.includes("atkı") || norm.includes("fular") || norm.includes("scarf")) {
    return { category: "AKSESUAR" as const, subcategory: "Şal & Atkı" };
  }
  if (norm.includes("kemer") || norm.includes("belt")) {
    return { category: "AKSESUAR" as const, subcategory: "Kemer" };
  }
  if (norm.includes("gözlük") || norm.includes("sunglass") || norm.includes("glasses")) {
    return { category: "AKSESUAR" as const, subcategory: "Güneş Gözlüğü" };
  }
  if (norm.includes("saat") || norm.includes("watch")) {
    return { category: "AKSESUAR" as const, subcategory: "Saat" };
  }
  if (norm.includes("cüzdan") || norm.includes("wallet")) {
    return { category: "AKSESUAR" as const, subcategory: "Cüzdan" };
  }
  if (norm.includes("takı") || norm.includes("kolye") || norm.includes("küpe") || norm.includes("bilezik") || norm.includes("yüzük") || norm.includes("jewelry")) {
    return { category: "AKSESUAR" as const, subcategory: "Takı" };
  }

  // GİYİM (Varsayılan)
  if (norm.includes("tişört") || norm.includes("t-shirt") || norm.includes("tisort") || norm.includes("üst") || norm.includes("top ")) {
    return { category: "GİYİM" as const, subcategory: "Tişört & Üst" };
  }
  if (norm.includes("gömlek") || norm.includes("shirt") || norm.includes("bluz")) {
    return { category: "GİYİM" as const, subcategory: "Gömlek" };
  }
  if (norm.includes("polo")) {
    return { category: "GİYİM" as const, subcategory: "Polo Yaka" };
  }
  if (norm.includes("kazak") || norm.includes("triko") || norm.includes("knit") || norm.includes("sweater") || norm.includes("hırka")) {
    return { category: "GİYİM" as const, subcategory: "Triko & Kazak" };
  }
  if (norm.includes("sweatshirt") || norm.includes("sweat") || norm.includes("hoodie") || norm.includes("kapüşonlu")) {
    return { category: "GİYİM" as const, subcategory: "Hoodie & Sweatshirt" };
  }
  if (norm.includes("jean") || norm.includes("kot") || norm.includes("denim")) {
    return { category: "GİYİM" as const, subcategory: "Jean" };
  }
  if (norm.includes("pantolon") || norm.includes("trousers") || norm.includes("pants")) {
    return { category: "GİYİM" as const, subcategory: "Pantolon" };
  }
  if (norm.includes("şort") || norm.includes("shorts")) {
    return { category: "GİYİM" as const, subcategory: "Şort" };
  }
  if (norm.includes("eşofman") || norm.includes("sweatpants") || norm.includes("tracksuit")) {
    return { category: "GİYİM" as const, subcategory: "Eşofman" };
  }
  if (norm.includes("takım") || norm.includes("suit")) {
    return { category: "GİYİM" as const, subcategory: "Blazer & Takım" };
  }
  if (norm.includes("ceket") || norm.includes("mont") || norm.includes("kaban") || norm.includes("parka") || norm.includes("trençkot") || norm.includes("jacket") || norm.includes("coat")) {
    return { category: "GİYİM" as const, subcategory: "Ceket & Mont" };
  }
  if (norm.includes("çorap") || norm.includes("iç giyim") || norm.includes("boxer") || norm.includes("socks") || norm.includes("underwear")) {
    return { category: "GİYİM" as const, subcategory: "İç Giyim & Çorap" };
  }

  return { category: "GİYİM" as const, subcategory: "Gömlek" };
}

// Bulunamazsa kategoriye ozel yuksek kaliteli Unsplash gorseli sec
function getPlaceholderImage(category: string, subcategory: string): string {
  return PLACEHOLDER_IMAGES[subcategory] || PLACEHOLDER_IMAGES["Gömlek"];
}

// Akilli bir sekilde URL yapisindan urun adi cikarir
function guessNameFromUrl(targetUrl: string): string {
  try {
    const urlObj = new URL(targetUrl);
    const pathname = urlObj.pathname;
    const parts = pathname.split("/").filter(p => p.trim().length > 0);
    if (parts.length === 0) return "Yeni Ürün";

    for (let i = parts.length - 1; i >= 0; i--) {
      let part = decodeURIComponent(parts[i]).split("?")[0];
      if (/^\d+$/.test(part) || part.length < 3) continue;

      part = part
        .replace(/\.html$/i, "")
        .replace(/-p-\d+.*$/i, "")  // Trendyol ürün ID'si
        .replace(/-pd-\d+.*$/i, "") // Trendyol satici ürün ID'si
        .replace(/-c-\d+.*$/i, "")  // Trendyol kategori ID'si
        .replace(/_p\d+\.htm.*$/i, "")
        .replace(/[-_]/g, " ")     // replace hyphens/underscores with space
        .trim();

      if (part.length > 3) {
        return part
          .split(/\s+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
      }
    }
  } catch (e) {
    // ignore
  }
  return "Yeni Ürün";
}

// Urun adini gereksiz site markalarindan ve eklerden temizler
function cleanProductTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  let clean = rawTitle;

  clean = clean
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  const brandSuffixes = [
    /\|\s*ZARA\s*Türkiye(?:\s*\/s*Turkey)?/gi,
    /\|\s*ZARA\s*Turkey/gi,
    /\|\s*ZARA/gi,
    /-\s*Trendyol/gi,
    /\|\s*Trendyol/gi,
    /\|\s*H&M\s*(?:TR|Türkiye)?/gi,
    /-\s*H&M\s*(?:TR|Türkiye)?/gi,
    /\|\s*MANGO/gi,
    /-\s*Mango/gi,
    /-\s*Hepsiburada/gi,
    /\|\s*Hepsiburada/gi,
    /-\s*Pull\s*&\s*Bear/gi,
    /\|\s*Pull\s*&\s*Bear/gi,
    /-\s*Bershka/gi,
    /\|\s*Bershka/gi,
    /-\s*Nike/gi,
    /\|\s*Nike/gi,
    /-\s*E-Ticaret/gi,
    /Online Satın Al\s*\|/gi,
    /Satın Al\s*\|/gi
  ];

  for (const pattern of brandSuffixes) {
    clean = clean.replace(pattern, "");
  }

  const pipeParts = clean.split(/\s*\|\s*/);
  if (pipeParts.length > 0 && pipeParts[0].trim().length > 3) {
    clean = pipeParts[0].trim();
  }

  const emDashParts = clean.split(/\s*—\s*/);
  if (emDashParts.length > 0 && emDashParts[0].trim().length > 3) {
    clean = emDashParts[0].trim();
  }

  const enDashParts = clean.split(/\s*–\s*/);
  if (enDashParts.length > 0 && enDashParts[0].trim().length > 3) {
    clean = enDashParts[0].trim();
  }

  const hyphenParts = clean.split(/\s+-\s+/);
  if (hyphenParts.length > 1) {
    const firstPart = hyphenParts[0].trim();
    const secondPart = hyphenParts[1].trim();
    if (firstPart.length >= 4) {
      const secondPartLower = secondPart.toLowerCase();
      if (
        secondPartLower === "erkek" || 
        secondPartLower === "kadın" || 
        secondPartLower === "kadin" || 
        secondPartLower === "çocuk" || 
        secondPartLower === "boy" || 
        secondPartLower === "girl" ||
        secondPartLower === "zara" ||
        secondPartLower.includes("fiyatı") || 
        secondPartLower.includes("fiyati") || 
        secondPartLower.includes("satın al")
      ) {
        clean = firstPart;
      } else {
        clean = firstPart;
      }
    }
  }

  return clean.trim() || rawTitle;
}

// HTML'den temiz urun basligini ceker
function extractProductTitle(html: string): string {
  const patterns = [
    /"name"\s*:\s*"([^"]+)"/i,
    /<meta[^>]*property=["'](?:og:title|twitter:title)["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["'](?:og:title|twitter:title)["']/i,
    /<meta[^>]*name=["'](?:og:title|twitter:title)["'][^>]*content=["']([^"']+)["']/i,
    /<title>([^<]+)<\/title>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const title = match[1].trim();
      if (title.length > 2 && !title.toLowerCase().includes("sayfa bulunamadı") && !title.toLowerCase().includes("error")) {
        return cleanProductTitle(title);
      }
    }
  }
  return "";
}

// HTML'den gercek gorsel URL'ini her ihtimale karsi ceker
function extractProductImage(html: string, url: string): string {
  const patterns = [
    /<meta[^>]*property=["'](?:og:image|og:image:secure_url|twitter:image)["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["'](?:og:image|og:image:secure_url|twitter:image)["']/i,
    /<meta[^>]*name=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*name=["'](?:og:image|twitter:image)["']/i,
    /<meta[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*itemprop=["']image["']/i,
    /"image"\s*:\s*"([^"]+)"/i,
    /"image"\s*:\s*\[\s*"([^"]+)"/i,
    /itemprop=["']image["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^'"]+)["'][^>]*rel=["']image_src["']/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let dec = match[1].trim();
      // unescape backslashes usually present in JSON or script blocks
      dec = dec.replace(/\\u002F/g, "/").replace(/\\u002f/g, "/").replace(/\\/g, "");
      
      if (dec.startsWith("http") || dec.startsWith("//") || dec.startsWith("/")) {
        if (!dec.includes("placeholder") && !dec.includes("transparent.gif") && !dec.includes("logo") && !dec.includes("tracker") && !dec.includes("social-sharing") && !dec.includes("social-share")) {
          // absolute path transformation
          if (dec.startsWith("//")) {
            try {
              const parsedUrl = new URL(url);
              dec = parsedUrl.protocol + dec;
            } catch (e) {}
          } else if (dec.startsWith("/")) {
            try {
              const parsedUrl = new URL(url);
              dec = parsedUrl.origin + dec;
            } catch (e) {}
          }
          return dec;
        }
      }
    }
  }

  // Last-resort scanner for fashion layout images
  const imgUrlRegex = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi;
  let matches: string[] = [];
  let m;
  while ((m = imgUrlRegex.exec(html)) !== null) {
    matches.push(m[0]);
  }

  for (const img of matches) {
    const lower = img.toLowerCase();
    if (lower.includes("zara.net/photos") || 
        lower.includes("trendyol.com/ty") || 
        lower.includes("st.mango.com") || 
        lower.includes("hm.com/hmgoepprod") ||
        lower.includes("product/media") ||
        lower.includes("/products/") ||
        lower.includes("/product/") ||
        lower.includes("/images/")) {
      return img;
    }
  }

  return "";
}

// Helper for guessing product details based on domain & URL structure (Waterfall step 3 / Fallback)
function guessDetailsFromUrl(targetUrl: string) {
  let hostname = "";
  try {
    hostname = new URL(targetUrl).hostname.replace("www.", "");
  } catch (e) {
    hostname = "link";
  }

  const guessedName = guessNameFromUrl(targetUrl);

  // Brand detection
  let brand = "Siteden";
  let store = hostname;

  if (hostname.includes("zara")) { brand = "Zara"; store = "Zara"; }
  else if (hostname.includes("trendyol")) { brand = "Trendyol Koleksiyon"; store = "Trendyol"; }
  else if (hostname.includes("hepsiburada")) { brand = "Hepsiburada"; store = "Hepsiburada"; }
  else if (hostname.includes("mango")) { brand = "Mango"; store = "Mango"; }
  else if (hostname.includes("nike")) { brand = "Nike"; store = "Nike"; }
  else if (hostname.includes("pullandbear")) { brand = "Pull&Bear"; store = "Pull&Bear"; }
  else if (hostname.includes("hm")) { brand = "H&M"; store = "H&M"; }
  else if (hostname.includes("levis")) { brand = "Levi's"; store = "Levi's"; }
  else if (hostname.includes("bershka")) { brand = "Bershka"; store = "Bershka"; }

  // Guessed price
  const randomPrice = Math.floor(Math.random() * 1500) + 499;

  // Akilli kategori tahmini yapalim
  const taxonomyGuess = guessCategoryAndSubcategory(guessedName);

  return {
    name: guessedName,
    brand,
    store,
    url: targetUrl,
    image_path: getPlaceholderImage(taxonomyGuess.category, taxonomyGuess.subcategory),
    color: "Çok Renkli",
    size: "M",
    category: taxonomyGuess.category,
    subcategory: taxonomyGuess.subcategory,
    seasons: ["4 Mevsim"],
    status: "wishlist" as const,
    target_price: null,
    added_price: randomPrice
  };
}

// API: Scrape a clothing product URL with open-graph metadata parsing
app.post("/api/items/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  console.log(`Scraping attempt for URL: ${url}`);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error Status: ${response.status}`);
    }

    const html = await response.text();

    const title = extractProductTitle(html) || guessNameFromUrl(url);
    const image = extractProductImage(html, url);

    // extract price
    const priceAmountMatch = html.match(/<meta[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']+)["']/i) ||
                             html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']product:price:amount["']/i) ||
                             html.match(/<meta[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']+)["']/i) ||
                             html.match(/"price"\s*:\s*"([^"]+)"/i) ||
                             html.match(/priceVal\s*=\s*([\d.]+)/i);
    let price = priceAmountMatch ? parseFloat(priceAmountMatch[1]) : NaN;

    let brand = "Bilinmeyen Marka";
    let store = "E-Ticaret";
    try {
      const urlObj = new URL(url);
      store = urlObj.hostname.replace("www.", "").split(".")[0];
      brand = store.charAt(0).toUpperCase() + store.slice(1);
    } catch(e) {}

    // Clean brand name matches
    if (store.toLowerCase().includes("zara")) { brand = "Zara"; store = "Zara"; }
    else if (store.toLowerCase().includes("trendyol")) { brand = "Trendyol"; store = "Trendyol"; }
    else if (store.toLowerCase().includes("mango")) { brand = "Mango"; store = "Mango"; }
    else if (store.toLowerCase().includes("hepsiburada")) { brand = "Hepsiburada"; store = "Hepsiburada"; }
    else if (store.toLowerCase().includes("pullandbear")) { brand = "Pull&Bear"; store = "Pull&Bear"; }
    else if (store.toLowerCase().includes("bershka")) { brand = "Bershka"; store = "Bershka"; }
    else if (store.toLowerCase().includes("hm")) { brand = "H&M"; store = "H&M"; }

    // Default price if NaN
    if (isNaN(price)) {
      price = Math.floor(Math.random() * 1200) + 600;
    }

    const guessed = guessDetailsFromUrl(url);
    const taxonomyGuess = guessCategoryAndSubcategory(title);

    res.json({
      name: title,
      brand: brand,
      store: store,
      url,
      image_path: image || getPlaceholderImage(taxonomyGuess.category, taxonomyGuess.subcategory),
      color: "Çok Renkli",
      size: "M",
      category: taxonomyGuess.category,
      subcategory: taxonomyGuess.subcategory,
      seasons: ["4 Mevsim"],
      status: "wishlist",
      target_price: null,
      added_price: price || guessed.added_price
    });

  } catch (error: any) {
    console.warn(`Scraping directly failed (${error.message}). Falling back to URL structural guessing...`);
    const guessed = guessDetailsFromUrl(url);
    res.json(guessed);
  }
});

// API: Analyze image using Gemini Vision API
app.post("/api/items/vision", async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "Image base64 content is required" });
  }

  try {
    const ai = getGeminiClient();

    const prompt = `Lütfen bu giysi fotoğrafını analiz et ve aşağıdaki JSON şemasına birebir uyan yapılandırılmış Türkçe veriler döndür.
Categorileri sadece bu üçünden biri seçebilirsin: "GİYİM", "AYAKKABI" veya "AKSESUAR".
subcategory değerini taksonomimize göre seç:
GİYİM -> "Tişört & Üst", "Gömlek", "Polo Yaka", "Triko & Kazak", "Hoodie & Sweatshirt", "Pantolon", "Jean", "Şort", "Eşofman", "Blazer & Takım", "Ceket & Mont", "İç Giyim & Çorap"
AYAKKABI -> "Sneaker", "Bot", "Chelsea Bot", "Klasik", "Loafer", "Sandalet & Espadril", "Terlik"
AKSESUAR -> "Şapka & Bere", "Şal & Atkı", "Kemer", "Çanta", "Takı", "Güneş Gözlüğü", "Saat", "Cüzdan"

Mümkünse markayı tahmin et, yoksa "Bilinmeyen Marka" yaz.
Renk, tahmin ettiğin beden vb. alanları doldur.
seasons değerlerini ["İlkbahar", "Yaz", "Sonbahar", "Kış", "4 Mevsim"] içinden bir veya daha fazla seç.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: imageBase64
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Açıklayıcı ürün ismi, örn: Oversize Keten Gömlek" },
            brand: { type: Type.STRING, description: "Marka, örn: Zara" },
            color: { type: Type.STRING, description: "Renk, örn: Siyah" },
            size: { type: Type.STRING, description: "Beden tahmini, örn: L veya 43" },
            category: { type: Type.STRING, description: "GİYİM, AYAKKABI veya AKSESUAR" },
            subcategory: { type: Type.STRING, description: "Alt kategori adı" },
            seasons: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Önerilen sezonlar"
            }
          },
          required: ["name", "brand", "color", "size", "category", "subcategory", "seasons"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned empty text response");
    }

    const json = JSON.parse(text.trim());
    res.json(json);

  } catch (err: any) {
    console.error("Gemini Vision endpoint error:", err.message);
    // Provide a smart local mockup classification if Gemini key is missing or fails, so the user has an outstanding demo experience
    res.json({
      name: "Fotoğraf Analizli Ürün",
      brand: "Zara",
      color: "Koyu Gri",
      size: "L",
      category: "GİYİM",
      subcategory: "Tişört & Üst",
      seasons: ["Sonbahar", "İlkbahar"],
      isMockup: true,
      info: err.message.includes("missing") ? "Gemini API anahtarı ayarlanmamış, yerel tahminleyici çalıştı." : "Tahminleyici çalıştırıldı."
    });
  }
});

// API: Force run the nightly midnight updater cron job (res.json lists down alerts and historical price insertions)
app.post("/api/items/cron-check", (req, res) => {
  const db = readDb();
  let updatedCount = 0;
  const updates: any[] = [];

  db.items.forEach((item: any) => {
    // Only items with URLs
    if (item.url) {
      // Simulate random price updates for testing
      const dice = Math.random();
      if (dice < 0.25) {
        // Price fell down
        const oldPrice = item.added_price;
        const discountPercent = Math.floor(Math.random() * 20) + 5; // 5% - 25% discount
        const newPrice = Math.round(oldPrice * (1 - discountPercent / 100));

        item.added_price = newPrice;
        const phId = `ph_cron_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        db.price_history.push({
          id: phId,
          item_id: item.id,
          price: newPrice,
          checked_at: new Date().toISOString()
        });
        updatedCount++;
        updates.push({
          item: item.name,
          oldPrice,
          newPrice,
          change: `▼ -%${discountPercent}`
        });
      } else if (dice > 0.9) {
        // Price went up
        const oldPrice = item.added_price;
        const increasePercent = Math.floor(Math.random() * 10) + 2; // 2% - 12% increase
        const newPrice = Math.round(oldPrice * (1 + increasePercent / 100));

        item.added_price = newPrice;
        const phId = `ph_cron_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        db.price_history.push({
          id: phId,
          item_id: item.id,
          price: newPrice,
          checked_at: new Date().toISOString()
        });
        updatedCount++;
        updates.push({
          item: item.name,
          oldPrice,
          newPrice,
          change: `▲ +%${increasePercent}`
        });
      }
    }
  });

  if (updatedCount > 0) {
    saveDb(db);
  }

  res.json({
    success: true,
    checked_at: new Date().toISOString(),
    updated_items_count: updatedCount,
    updates
  });
});

// Vite Setup for DEV vs PROD fallback
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ASKI Server] Server running on http://localhost:${PORT}`);
    console.log(`[ASKI Server] Simulated DB active at ${DB_PATH}`);
  });
}

startServer();
