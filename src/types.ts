export enum ItemStatus {
  CLOSET = "closet",
  WISHLIST = "wishlist",
  ARCHIVED = "archived"
}

export interface Item {
  id: string;
  name: string;
  brand: string;
  store: string;
  url: string;
  image_path: string; // Base64 or local path, or fallback gradient CSS
  color: string;
  size: string;
  category: "GİYİM" | "AYAKKABI" | "AKSESUAR";
  subcategory: string;
  seasons: string[]; // e.g. ["İlkbahar", "Yaz", "Sonbahar", "Kış", "4 Mevsim"]
  status: ItemStatus;
  target_price: number | null;
  added_at: string; // ISO date
  added_price: number;
}

export interface PriceHistory {
  id: string;
  item_id: string;
  price: number;
  checked_at: string; // ISO date
}

export interface Outfit {
  id: string;
  name: string;
  created_at: string; // ISO date
}

export interface OutfitItem {
  outfit_id: string;
  item_id: string;
  slot: "ÜST GİYİM" | "ALT GİYİM" | "AYAKKABI" | "DIŞ KATMAN" | "AKSESUAR";
}

export interface WearLog {
  id: string;
  outfit_id: string | null;
  item_id: string | null;
  worn_on: string; // YYYY-MM-DD
}

export interface DatabaseSchema {
  items: Item[];
  price_history: PriceHistory[];
  outfits: Outfit[];
  outfit_items: OutfitItem[];
  wear_log: WearLog[];
}
