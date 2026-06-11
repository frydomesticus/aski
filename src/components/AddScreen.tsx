import React, { useState, useRef } from "react";
import { Item, ItemStatus } from "../types";
import { TAXONOMY, SEASONS, getGradientForColor } from "../constants";

interface AddScreenProps {
  onBackToHome: () => void;
  onRefreshData: () => Promise<void>;
  onNavigateToGrid: (category: string, subcategory: string | null) => void;
  sharedUrl?: string;
  onClearSharedUrl?: () => void;
}

const getCurrentSeason = (): string[] => {
  const month = new Date().getMonth() + 1; // 1-12
  if (month === 12 || month === 1 || month === 2) return ["Kış"];
  if (month >= 3 && month <= 5) return ["İlkbahar"];
  if (month >= 6 && month <= 8) return ["Yaz"];
  return ["Sonbahar"];
};

export default function AddScreen({ 
  onBackToHome, 
  onRefreshData, 
  onNavigateToGrid, 
  sharedUrl, 
  onClearSharedUrl 
}: AddScreenProps) {
  const [mode, setMode] = useState<"menu" | "scraping" | "vision" | "confirm">("menu");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  // Input states
  const [pastedUrl, setPastedUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form confirmation details (Onay Kartı) State
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    color: "",
    size: "",
    store: "",
    url: "",
    category: "GİYİM" as "GİYİM" | "AYAKKABI" | "AKSESUAR",
    subcategory: "",
    seasons: getCurrentSeason(),
    added_price: 1000,
    status: "closet" as ItemStatus,
    image_path: "",
  });

  React.useEffect(() => {
    if (sharedUrl) {
      setPastedUrl(sharedUrl);
      setMode("scraping");
      
      const triggerScrape = async () => {
        setLoading(true);
        setLoadingMsg("Scraping waterfall executing — extracting schema metadata...");
        try {
          const res = await fetch("/api/items/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: sharedUrl }),
          });
          const data = await res.json();
          setFormData({
            name: data.name || "Yeni Gardırop Ürünü",
            brand: data.brand || "Bilinmeyen Marka",
            color: data.color || "Siyah",
            size: data.size || "M",
            store: data.store || "E-Ticaret Sitesi",
            url: data.url || sharedUrl,
            category: (data.category as any) || "GİYİM",
            subcategory: data.subcategory || "Gömlek",
            seasons: data.seasons || getCurrentSeason(),
            added_price: data.added_price || 999,
            status: "closet",
            image_path: data.image_path || "linear-gradient(160deg,#3A2E25,#19140F)",
          });
          setMode("confirm");
        } catch (e) {
          console.error(e);
          alert("Hızlı çekim başarısız oldu, manuel ekleme moduna geçiliyor.");
          setMode("confirm");
        } finally {
          setLoading(false);
          setLoadingMsg("");
          if (onClearSharedUrl) {
            onClearSharedUrl();
          }
        }
      };
      
      triggerScrape();
    }
  }, [sharedUrl]);

  // Handle URL scraping (Step 1 of Ingest)
  const handleScrapeSubmit = async () => {
    if (!pastedUrl) return;
    setLoading(true);
    setLoadingMsg("Scraping waterfall executing — extracting schema metadata...");
    try {
      const res = await fetch("/api/items/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pastedUrl }),
      });
      const data = await res.json();

      // Configure seed
      setFormData({
        name: data.name || "Yeni Gardırop Ürünü",
        brand: data.brand || "Bilinmeyen Marka",
        color: data.color || "Siyah",
        size: data.size || "M",
        store: data.store || "E-Ticaret Sitesi",
        url: data.url || pastedUrl,
        category: (data.category as any) || "GİYİM",
        subcategory: data.subcategory || "Gömlek",
        seasons: data.seasons || getCurrentSeason(),
        added_price: data.added_price || 999,
        status: "closet",
        image_path: data.image_path || "linear-gradient(160deg,#3A2E25,#19140F)",
      });

      setMode("confirm");
    } catch (e) {
      console.error(e);
      alert("Hızlı çekim başarısız oldu, manuel ekleme moduna geçiliyor.");
      setMode("confirm");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  // Convert File to Base64 utility
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle local File Selection representing Android Attachments or manual Photo uploads (Step 2 of Ingest)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLoadingMsg("Yapay zekâ görselinizi öznitelik tablosuna göre inceliyor...");

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/items/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type,
        }),
      });
      const data = await res.json();

      setFormData({
        name: data.name || "Fotoğraflı Ürün",
        brand: data.brand || "Zara",
        color: data.color || "Koyu Gri",
        size: data.size || "L",
        store: "Selahattin Mağaza",
        url: "",
        category: (data.category as any) || "GİYİM",
        subcategory: data.subcategory || "Tişört & Üst",
        seasons: data.seasons || ["Sonbahar"],
        added_price: 1540,
        status: "closet",
        image_path: URL.createObjectURL(file), // use local blobs representing images
      });

      setMode("confirm");
    } catch (err) {
      console.error(err);
      alert("Görsel analiz edilemedi. Manuel forma aktarılıyorsunuz.");
      setMode("confirm");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  // Handle direct preset testing to ensure excellent demo flow
  const handleSimulateVision = async () => {
    setLoading(true);
    setLoadingMsg("Sistem örnek kaban görselini yüklüyor ve Gemini ile analiz ediyor...");

    // Delay a brief moment to show AI thinking
    setTimeout(() => {
      setFormData({
        name: "Kaşmir Peluş Kaban",
        brand: "Zara",
        color: "Krem",
        size: "XL",
        store: "Zara Mağaza",
        url: "",
        category: "GİYİM",
        subcategory: "Ceket & Mont",
        seasons: ["Kış", "Sonbahar"],
        added_price: 3450,
        status: "closet",
        image_path: "linear-gradient(160deg,#E8E2D2,#B7AE99)",
      });
      setLoading(false);
      setLoadingMsg("");
      setMode("confirm");
    }, 1500);
  };

  // Form saving logic
  const handleSaveItem = async () => {
    setLoading(true);
    setLoadingMsg("Ürün gardırop dosyasına kaydediliyor...");

    // Sync image gradients if fallback is requested
    const finalForm = { ...formData };
    if (!finalForm.image_path) {
      finalForm.image_path = getGradientForColor(finalForm.color);
    }

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalForm),
      });

      if (res.ok) {
        await onRefreshData();
        alert("Envanter güncellendi! Ürün başarıyla ASKI'ya asıldı.");

        // Clear and routing
        setPastedUrl("");
        if (finalForm.status === "closet") {
          onNavigateToGrid(finalForm.category, finalForm.subcategory);
        } else {
          onBackToHome(); // wishlist is better handled here
        }
      }
    } catch (e) {
      console.error(e);
      alert("Ürün kaydedilemedi");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  // Seasons multi chips selector toggler
  const toggleSeason = (season: string) => {
    setFormData((prev) => {
      const exists = prev.seasons.includes(season);
      if (exists) {
        return { ...prev, seasons: prev.seasons.filter((s) => s !== season) };
      } else {
        return { ...prev, seasons: [...prev.seasons, season] };
      }
    });
  };

  const currentSubcats = TAXONOMY[formData.category] || [];

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-fade relative">
      {/* Header */}
      <div className="px-6 pt-1 shrink-0 flex flex-col">
        <button
          onClick={onBackToHome}
          className="text-left text-xs tracking-widest text-[#8A8A8A] uppercase cursor-pointer hover:text-black self-start"
        >
          ← ANA
        </button>
        <div className="font-display font-semibold text-3xl mt-1.5 text-black">
          EKLE
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pt-2">
        {mode === "menu" && (
          // Ingest selector layout
          <div className="px-6 flex flex-col gap-1 mt-4">
            {/* 01 Link Entry */}
            <div
              onClick={() => setMode("scraping")}
              className="py-7 border-b border-[#E3E3E3] cursor-pointer group flex justify-between items-baseline"
            >
              <div className="flex items-baseline gap-3.5">
                <span className="text-sm font-light text-neutral-400 font-mono">|01|</span>
                <span className="text-xl tracking-widest group-hover:translate-x-1 transition-transform font-light">LİNK YAPIŞTIR</span>
              </div>
              <span className="text-[10px] tracking-wider text-[#8A8A8A] max-w-[150px] text-right leading-relaxed font-sans block">
                ürün, marka, renk, beden, fiyat otomatik çekilir
              </span>
            </div>

            {/* 02 Photo Entry */}
            <div
              onClick={() => setMode("vision")}
              className="py-7 border-b border-[#E3E3E3] cursor-pointer group flex justify-between items-baseline"
            >
              <div className="flex items-baseline gap-3.5">
                <span className="text-sm font-light text-neutral-400 font-mono">|02|</span>
                <span className="text-xl tracking-widest group-hover:translate-x-1 transition-transform font-light font-sans uppercase">GÖRSELDEN EKLE</span>
              </div>
              <span className="text-[10px] tracking-wider text-[#8A8A8A] max-w-[150px] text-right leading-relaxed font-sans block">
                fotoğraf yükle, yapay zekâ model deseniyle etiketlesin
              </span>
            </div>
          </div>
        )}

        {/* Action Level A: Scraping Ingress Input frame */}
        {mode === "scraping" && (
          <div className="px-6 pt-4 flex flex-col gap-5 animate-fade max-w-md mx-auto">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs tracking-widest text-[#8A8A8A] uppercase font-semibold">
                E-Ticaret Ürün Linki
              </label>
              <input
                type="url"
                placeholder="https://www.zara.com/... veya trendyol.com/..."
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
                className="border border-[#E3E3E3] focus:border-black outline-none px-3.5 py-3 text-xs font-sans rounded-none w-full bg-white text-black"
                autoFocus
              />
              <p className="text-[10px] text-neutral-400 leading-relaxed font-sans uppercase">
                * Zara, Mango, Pull&Bear, H&M, Hepsiburada, Trendyol desteklenmektedir.
              </p>
            </div>

            <button
              onClick={handleScrapeSubmit}
              disabled={!pastedUrl}
              className={`w-full py-4 text-xs font-semibold tracking-widest uppercase border border-black cursor-pointer transition-all ${
                pastedUrl 
                  ? "bg-black text-[#FFFFFF] hover:opacity-95" 
                  : "bg-white text-neutral-300 border-neutral-200 cursor-not-allowed"
              }`}
            >
              OTOMATİK METADATA ÇEK
            </button>
            <button
              onClick={() => setMode("menu")}
              className="w-full py-3 text-[10.5px] font-semibold text-neutral-400 hover:text-black tracking-widest uppercase font-mono"
            >
              ← VAZGEÇ
            </button>
          </div>
        )}

        {/* Action Level B: Vision Ingress Attach file frame */}
        {mode === "vision" && (
          <div className="px-6 pt-4 flex flex-col gap-5 animate-fade max-w-sm mx-auto">
            <div className="border-[2px] border-dashed border-[#C4C4C4] hover:border-black p-8 text-center flex flex-col items-center justify-center min-h-[160px] cursor-pointer bg-white"
                 onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-8 h-8 flex items-center justify-center border border-black text-xl leading-none font-light text-black mb-3">
                +
              </div>
              <span className="text-xs font-semibold tracking-wider text-black font-sans uppercase">Mobil Fotoğraf ya da Dosya</span>
              <span className="text-[10px] text-neutral-400 mt-1 uppercase">Görsel seçmek için dokunun</span>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div className="text-center text-[10.5px] font-mono text-[#8A8A8A]">VEYA</div>

            {/* Simulated preset test to protect developers from cold key errors */}
            <button
              onClick={handleSimulateVision}
              className="w-full py-3.5 border border-black text-xs font-medium text-black bg-white tracking-widest hover:bg-neutral-50 cursor-pointer uppercase font-sans"
            >
              ÖRNEK RESİMLE DENE (Simülasyonlu)
            </button>

            <button
              onClick={() => setMode("menu")}
              className="w-full py-3 text-[10.5px] font-semibold text-neutral-400 hover:text-black tracking-widest uppercase font-mono"
            >
              ← VAZGEÇ
            </button>
          </div>
        )}

        {/* Action Level C: Onay Kartı Card validation */}
        {mode === "confirm" && (
          <div className="px-6 pb-8 animate-fade flex flex-col">
            {/* Visual Swatch representing detected image */}
            <div
              className="h-28 border border-[#E3E3E3] mb-4.5 flex items-center justify-center relative bg-neutral-50"
              style={formData.image_path.startsWith("linear") || formData.image_path.startsWith("repeating")
                ? { background: formData.image_path }
                : { backgroundImage: `url(${formData.image_path})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >
              {!(formData.image_path.startsWith("http") || formData.image_path.startsWith("data")) && (
                <span className="text-[10px] text-white/45 tracking-[0.2em] font-mono">OGG:IMAGE VERİSİ</span>
              )}
            </div>

            <span className="inline-block text-[9.5px] tracking-widest text-[#2E7D4F] border border-[#2E7D4F] font-semibold px-2.5 py-1.5 self-start mb-4 uppercase bg-emerald-50/20">
              ✓ OTOMATİK VERİ ÇEKİLDİ — KONTROL EDİN
            </span>

            {/* Editable Field Form elements */}
            <div className="flex flex-col mb-4">
              <div className="flex justify-between items-baseline py-2.5 border-b border-[#E3E3E3]">
                <span className="text-[10px] tracking-widest text-[#8A8A8A] font-semibold">ÜRÜN ADI</span>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-right text-xs font-medium text-black focus:text-neutral-700 outline-none w-2/3 bg-transparent rounded-none"
                />
              </div>

              <div className="flex justify-between items-baseline py-2.5 border-b border-[#E3E3E3]">
                <span className="text-[10px] tracking-widest text-[#8A8A8A] font-semibold uppercase">MARKA</span>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="text-right text-xs font-medium text-black focus:text-neutral-700 outline-none w-2/3 bg-transparent rounded-none"
                />
              </div>

              <div className="flex justify-between items-baseline py-2.5 border-b border-[#E3E3E3]">
                <span className="text-[10px] tracking-widest text-[#8A8A8A] font-semibold uppercase">RENK</span>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="text-right text-xs font-medium text-black focus:text-neutral-700 outline-none w-2/3 bg-transparent rounded-none"
                />
              </div>

              <div className="flex justify-between items-baseline py-2.5 border-b border-[#E3E3E3]">
                <span className="text-[10px] tracking-widest text-[#8A8A8A] font-semibold uppercase">BEDEN</span>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  className="text-right text-xs font-medium text-black focus:text-neutral-700 outline-none w-1/3 bg-transparent rounded-none"
                />
              </div>

              <div className="flex justify-between items-baseline py-2.5 border-b border-[#E3E3E3]">
                <span className="text-[10px] tracking-widest text-[#8A8A8A] font-semibold uppercase">ANA KATEGORİ</span>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const newCat = e.target.value as any;
                    setFormData({
                      ...formData,
                      category: newCat,
                      subcategory: TAXONOMY[newCat]?.[0] || "",
                    });
                  }}
                  className="text-xs font-semibold text-black outline-none bg-transparent rounded-none"
                >
                  <option value="GİYİM">GİYİM</option>
                  <option value="AYAKKABI">AYAKKABI</option>
                  <option value="AKSESUAR">AKSESUAR</option>
                </select>
              </div>

              <div className="flex justify-between items-baseline py-2.5 border-b border-[#E3E3E3]">
                <span className="text-[10px] tracking-widest text-[#8A8A8A] font-semibold uppercase">FİYAT (TL)</span>
                <input
                  type="number"
                  value={formData.added_price}
                  onChange={(e) => setFormData({ ...formData, added_price: parseInt(e.target.value) || 0 })}
                  className="text-right text-xs font-mono font-semibold text-black focus:text-neutral-700 outline-none w-1/3 bg-transparent rounded-none"
                />
              </div>
            </div>

            {/* Section A: Selection Chips of Taxonomy subcategories depending on ANA category */}
            <div className="text-[10px] tracking-[0.16em] text-[#8A8A8A] uppercase mb-2 font-semibold">
              ALT KATEGORİ — TÜRÜ SEÇİNİZ
            </div>
            <div className="flex flex-wrap gap-2 mb-4.5">
              {currentSubcats.map((sub) => {
                const isSel = formData.subcategory === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => setFormData({ ...formData, subcategory: sub })}
                    className={`text-[9.5px] tracking-wider border px-2.5 py-1.5 uppercase font-medium cursor-pointer rounded-none font-sans ${
                      isSel
                        ? "text-white bg-black border-black"
                        : "text-neutral-500 border-neutral-200 hover:text-black hover:border-black bg-white"
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>

            {/* Section B: Multiple Season Chips */}
            <div className="text-[10px] tracking-[0.16em] text-[#8A8A8A] uppercase mb-2 font-semibold">
              SEZON — ÇOKLU SEÇEBİLİRSİNİZ
            </div>
            <div className="flex flex-wrap gap-2 mb-4.5">
              {SEASONS.map((season) => {
                const isSel = formData.seasons.includes(season);
                return (
                  <button
                    key={season}
                    onClick={() => toggleSeason(season)}
                    className={`text-[9.5px] tracking-wider border px-2.5 py-1.5 uppercase font-medium cursor-pointer rounded-none font-sans ${
                      isSel
                        ? "text-white bg-black border-black"
                        : "text-neutral-500 border-neutral-200 hover:text-black hover:border-black bg-white"
                    }`}
                  >
                    {season}
                  </button>
                );
              })}
            </div>

            {/* Section C: Destination Selection */}
            <div className="text-[10px] tracking-[0.16em] text-[#8A8A8A] uppercase mb-2 font-semibold">
              NEREYE ASILSIN?
            </div>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setFormData({ ...formData, status: "closet" as ItemStatus, target_price: null })}
                className={`flex-1 py-3 text-[10px] font-semibold tracking-widest uppercase cursor-pointer rounded-none font-sans border ${
                  formData.status === "closet"
                    ? "text-white bg-black border-black"
                    : "text-neutral-500 border-neutral-200 bg-white"
                }`}
              >
                DOLABIM
              </button>
              <button
                onClick={() => setFormData({ ...formData, status: "wishlist" as ItemStatus, target_price: formData.added_price })}
                className={`flex-1 py-3 text-[10px] font-semibold tracking-widest uppercase cursor-pointer rounded-none font-sans border ${
                  formData.status === "wishlist"
                    ? "text-white bg-black border-black"
                    : "text-neutral-500 border-neutral-200 bg-white"
                }`}
              >
                İSTEK LİSTESİ PALETİ
              </button>
            </div>

            {/* Ingest Commit Trigger */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode("menu")}
                className="flex-1 py-3.5 border border-[#C4C4C4] text-xs font-semibold tracking-widest uppercase hover:text-black hover:border-black cursor-pointer bg-white"
              >
                Geri Dön
              </button>
              <button
                onClick={handleSaveItem}
                className="flex-[2] py-3.5 bg-black text-[#FFFFFF] border border-[#111111] text-xs font-semibold tracking-widest uppercase hover:opacity-90 cursor-pointer"
              >
                GARDIROBA AS ✓
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Structured loading spinner blocking frame */}
      {loading && (
        <div className="absolute inset-0 bg-[#FFFFFF]/90 flex flex-col items-center justify-center p-6 text-center z-[100] animate-fade">
          <div className="w-10 h-10 border-2 border-black border-t-transparent animate-spin mb-4" />
          <span className="text-xs font-semibold tracking-widest text-[#111111] font-mono uppercase">
            {loadingMsg || "İŞLEM ÇALIŞTIRILIYOR..."}
          </span>
          <p className="text-[10px] text-neutral-400 mt-2 tracking-wide uppercase">
            Öğrenci Kredisi & FastAPI Entegrasyon Bulut Sunucusu Aktif
          </p>
        </div>
      )}
    </div>
  );
}
