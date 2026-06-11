export const TAXONOMY: Record<string, string[]> = {
  "GİYİM": [
    "Tişört & Üst",
    "Gömlek",
    "Polo Yaka",
    "Triko & Kazak",
    "Hoodie & Sweatshirt",
    "Pantolon",
    "Jean",
    "Şort",
    "Eşofman",
    "Blazer & Takım",
    "Ceket & Mont",
    "İç Giyim & Çorap"
  ],
  "AYAKKABI": [
    "Sneaker",
    "Bot",
    "Chelsea Bot",
    "Klasik",
    "Loafer",
    "Sandalet & Espadril",
    "Terlik"
  ],
  "AKSESUAR": [
    "Şapka & Bere",
    "Şal & Atkı",
    "Kemer",
    "Çanta",
    "Takı",
    "Güneş Gözlüğü",
    "Saat",
    "Cüzdan"
  ]
};

export const SEASONS = ["İlkbahar", "Yaz", "Sonbahar", "Kış", "4 Mevsim"];

// Helpers for color styling gradients
export function getGradientForColor(color: string): string {
  const c = color.toLowerCase();
  if (c.includes("siyah")) return "linear-gradient(160deg,#2E2C2A,#191817)";
  if (c.includes("mavi")) return "linear-gradient(160deg,#46618A,#2C3E59)";
  if (c.includes("yeşil") || c.includes("haki")) return "linear-gradient(160deg,#6B6F52,#4A4D39)";
  if (c.includes("krem") || c.includes("bej")) return "linear-gradient(160deg,#E8E0CE,#CFC4AC)";
  if (c.includes("gri") || c.includes("antrasit")) return "linear-gradient(160deg,#4D4D52,#323236)";
  if (c.includes("indigo") || c.includes("lacivert")) return "linear-gradient(160deg,#5B7186,#3C4C5C)";
  if (c.includes("taba") || c.includes("kahve")) return "linear-gradient(160deg,#9C6B43,#6E4A2E)";
  return "linear-gradient(160deg,#C9C2B8,#A39B8F)"; // default warm gray
}
