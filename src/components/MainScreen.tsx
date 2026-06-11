import { useState, useEffect, FormEvent } from "react";
import { Item, Outfit } from "../types";
import { 
  CloudSun, 
  MapPin, 
  Search, 
  Wind, 
  Droplets, 
  Sparkles, 
  Navigation, 
  Link as LinkIcon 
} from "lucide-react";

interface MainScreenProps {
  items: Item[];
  outfits: Outfit[];
  priceChangesCount: number;
  onNavigate: (screen: string, extra?: any) => void;
}

export default function MainScreen({ items, outfits, priceChangesCount, onNavigate }: MainScreenProps) {
  const ownedCount = items.filter((i) => i.status === "closet").length;
  const wishCount = items.filter((i) => i.status === "wishlist").length;
  const outfitCount = outfits.length;

  // Weather States
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchCity, setSearchCity] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [resolvedLocation, setResolvedLocation] = useState<string>("");

  const fetchWeather = async (lat?: number, lng?: number, chosenCity?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weather-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          city: chosenCity
        })
      });
      if (!res.ok) {
        throw new Error("Hava durumu bilgisi alınamadı.");
      }
      const data = await res.json();
      setWeatherData(data);
      if (data.resolvedLocation) {
        setResolvedLocation(data.resolvedLocation);
      }
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleGeoLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          console.warn("Geolocation permission error or timeout, loading default city", err);
          fetchWeather(undefined, undefined, "İstanbul");
        },
        { timeout: 7000 }
      );
    } else {
      fetchWeather(undefined, undefined, "İstanbul");
    }
  };

  const handleManualSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchCity.trim()) {
      fetchWeather(undefined, undefined, searchCity.trim());
      setShowSearch(false);
    }
  };

  // On mount, query active location weather
  useEffect(() => {
    handleGeoLocation();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-fade">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 pt-2 shrink-0 text-xs tracking-widest font-medium uppercase">
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 border-[1.5px] border-[#111111] relative after:content-[''] after:absolute after:inset-[3px] after:border-[1.5px] after:border-[#111111]" />
          <span className="font-semibold">ASKI</span>
        </div>
        <div className="flex gap-5 text-neutral-500">
          <button className="hover:text-black cursor-pointer" onClick={() => alert("ASKI — İbrahim Hakkı için Endüstri Mühendisliği prensipleriyle optimize edilmiş kişisel gardırop yönetim sistemidir.")}>YARDIM</button>
          <span className="text-neutral-300">|</span>
          <button className="hover:text-black cursor-pointer" onClick={() => alert("v1.0 · PWA Entegrasyonu & Bulut Sunucu Hazır")}>AYARLAR</button>
        </div>
      </div>

      {/* Zara-like Large Didone Name */}
      <div className="font-display font-semibold text-[110px] leading-[0.78] tracking-tighter select-none shrink-0 px-3 uppercase mt-3 overflow-hidden text-black pr-0 mr-[-20px] whitespace-nowrap">
        ASKI
      </div>

      {/* Index Menu */}
      <div className="flex-1 overflow-y-auto no-scrollbar pt-4 px-6">
        <div className="flex flex-col">
          {/* 01 DOLABIM */}
          <div 
            onClick={() => onNavigate("dolap", { category: "TÜMÜ", subcategory: null })}
            className="flex items-baseline gap-3.5 py-3 border-b border-neutral-100 hover:border-black cursor-pointer group"
          >
            <span className="text-sm font-light text-neutral-400">|01|</span>
            <span className="text-lg font-light tracking-widest group-hover:translate-x-1 transition-transform">DOLABIM</span>
            <span className="text-xs text-neutral-500 font-mono ml-auto tracking-normal font-medium">{ownedCount} PARÇA</span>
          </div>

          {/* 02 KATEGORİLER */}
          <div 
            onClick={() => onNavigate("kat")}
            className="flex items-baseline gap-3.5 py-3 border-b border-neutral-100 hover:border-black cursor-pointer group"
          >
            <span className="text-sm font-light text-neutral-400">|02|</span>
            <span className="text-lg font-light tracking-widest group-hover:translate-x-1 transition-transform">KATEGORİLER</span>
            <span className="text-xs text-neutral-400 font-mono ml-auto">→</span>
          </div>

          {/* 03 İSTEK LİSTESİ */}
          <div 
            onClick={() => onNavigate("istek")}
            className="flex items-baseline gap-3.5 py-3 border-b border-neutral-100 hover:border-black cursor-pointer group"
          >
            <span className="text-sm font-light text-neutral-400">|03|</span>
            <span className="text-lg font-light tracking-widest group-hover:translate-x-1 transition-transform">İSTEK LİSTESİ</span>
            <span className="text-xs text-neutral-500 font-mono ml-auto tracking-normal font-medium">{wishCount} ÜRÜN</span>
          </div>

          {/* 04 FİYAT TAKİBİ */}
          <div 
            onClick={() => onNavigate("fiyat")}
            className="flex items-baseline gap-3.5 py-3 border-b border-neutral-100 hover:border-black cursor-pointer group"
          >
            <span className="text-sm font-light text-neutral-400">|04|</span>
            <span className="text-lg font-light tracking-widest relative group-hover:translate-x-1 transition-transform">
              FİYAT TAKİBİ
              <span className="absolute top-[3px] right-[-10px] w-1.5 h-1.5 rounded-full bg-[#C2185B]" />
            </span>
            <span className="text-xs text-[#C2185B] font-mono ml-auto tracking-normal font-semibold">
              {priceChangesCount} İNDİRİM
            </span>
          </div>

          {/* 05 KOMBİNLER */}
          <div 
            onClick={() => onNavigate("kombin")}
            className="flex items-baseline gap-3.5 py-3 border-b border-neutral-100 hover:border-black cursor-pointer group"
          >
            <span className="text-sm font-light text-neutral-400">|05|</span>
            <span className="text-lg font-light tracking-widest group-hover:translate-x-1 transition-transform">KOMBİNLER</span>
            <span className="text-xs text-neutral-500 font-mono ml-auto tracking-normal font-medium">{outfitCount} KAYITLI</span>
          </div>

          {/* 06 İSTATİSTİKLER */}
          <div 
            onClick={() => onNavigate("stats")}
            className="flex items-baseline gap-3.5 py-3 border-b border-neutral-100 hover:border-black cursor-pointer group"
          >
            <span className="text-sm font-light text-neutral-400">|06|</span>
            <span className="text-lg font-light tracking-widest group-hover:translate-x-1 transition-transform">İSTATİSTİKLER</span>
            <span className="text-xs text-neutral-500 font-mono ml-auto tracking-normal font-medium">MÜHENDİS MODU</span>
          </div>

          {/* 07 ARŞİV */}
          <div className="flex items-baseline gap-3.5 py-3 border-b border-neutral-100 opacity-40 cursor-not-allowed">
            <span className="text-sm font-light text-neutral-400">|07|</span>
            <span className="text-lg font-light tracking-widest text-[#8A8A8A]">ARŞİV</span>
            <span className="text-xs text-neutral-400 font-mono ml-auto">SEZON DIŞI</span>
          </div>
        </div>

        {/* 08 WEATHER INSTANT AI STYLIST */}
        <div className="my-6 border border-neutral-100 rounded-sm bg-[#FAF8F5] p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed border-neutral-200">
            <div className="flex items-center gap-2">
              <CloudSun className="w-4.5 h-4.5 text-neutral-800" />
              <h3 className="font-sans text-[11px] font-bold tracking-widest uppercase text-neutral-800">
                HAVA DURUMU & AKILLI STİLİST
              </h3>
            </div>
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className="text-[10px] tracking-widest uppercase text-neutral-500 hover:text-black hover:underline cursor-pointer flex items-center gap-1"
            >
              <Search className="w-3 h-3" /> {showSearch ? "KAPAT" : "ŞEHİR SEÇ"}
            </button>
          </div>

          {showSearch && (
            <form onSubmit={handleManualSearch} className="flex gap-2 mb-4 animate-fade">
              <input 
                type="text"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                placeholder="Şehir yazın (örn: Ankara, İzmir)..."
                className="flex-1 bg-white border border-neutral-200 text-xs px-3 py-1.5 focus:outline-none focus:border-black rounded-xs"
              />
              <button 
                type="submit"
                className="bg-neutral-900 text-white px-4 py-1.5 text-[10px] tracking-wider font-semibold uppercase hover:bg-neutral-800 transition-colors"
              >
                ARA
              </button>
              <button 
                type="button"
                onClick={handleGeoLocation}
                title="Konumumu bul"
                className="border border-neutral-200 bg-white hover:bg-neutral-50 px-2.5 flex items-center justify-center rounded-xs"
              >
                <Navigation className="w-3.5 h-3.5 text-neutral-700" />
              </button>
            </form>
          )}

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mb-3" />
              <p className="text-xs text-neutral-500 font-sans tracking-wide">
                {resolvedLocation ? `${resolvedLocation} için` : "Konumunuz için"} güncel hava durumu aranıyor ve gardırobunuz taranıyor...
              </p>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50/50 border border-red-100 text-red-600 rounded-xs mb-2">
              <p className="text-xs">{error}</p>
              <button 
                onClick={() => fetchWeather()}
                className="text-[10px] uppercase font-bold tracking-widest underline mt-1 block"
              >
                YENİDEN DENE
              </button>
            </div>
          ) : weatherData ? (
            <div>
              {/* Weather highlights */}
              <div className="flex items-start justify-between border-b border-neutral-100/80 pb-3.5 mb-3.5">
                <div>
                  <div className="flex items-center gap-1.5 text-neutral-900">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span className="text-xs font-semibold tracking-wider uppercase font-sans">
                      {weatherData.resolvedLocation}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 uppercase mt-0.5 tracking-wider font-mono">
                    {weatherData.condition}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-display font-light text-neutral-900 leading-none flex items-start justify-end">
                    {weatherData.temperature}<span className="text-sm font-sans mt-1">°C</span>
                  </div>
                  <p className="text-[9.5px] text-neutral-500 mt-1 uppercase tracking-wider font-mono">
                    Hissedilen: {weatherData.feelsLike}°C
                  </p>
                </div>
              </div>

              {/* Weather parameters */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 bg-white/70 px-3 py-1.5 border border-neutral-100 rounded-xs">
                  <Wind className="w-3.5 h-3.5 text-neutral-400" />
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono">Rüzgâr</p>
                    <p className="text-[11px] font-semibold text-neutral-700 font-mono leading-tight">{weatherData.wind}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/70 px-3 py-1.5 border border-neutral-100 rounded-xs">
                  <Droplets className="w-3.5 h-3.5 text-neutral-400" />
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono">Nem</p>
                    <p className="text-[11px] font-semibold text-neutral-700 font-mono leading-tight">%{weatherData.humidity}</p>
                  </div>
                </div>
              </div>

              {/* AI Stylist recommendation message */}
              <div className="bg-white border border-neutral-100/60 p-3.5 rounded-xs shadow-sm mb-4">
                <div className="flex items-center gap-1.5 text-neutral-800 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C2185B]" />
                  <span className="text-[10px] font-bold tracking-widest uppercase font-sans text-[#C2185B]">
                    AKILLI ASİSTAN YORUMU
                  </span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-neutral-700 font-serif font-light italic">
                  "{weatherData.summary}"
                </p>
              </div>

              {/* Recommended Closet Items list */}
              <div>
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase font-sans block mb-3">
                  Günün Kombin Parça Önerileri
                </span>

                {(!weatherData.recommendations || weatherData.recommendations.length === 0) ? (
                  <div className="text-center py-4 bg-white/50 border border-neutral-100 rounded-xs">
                    <p className="text-xs text-neutral-400 font-sans">
                      Dolabınızda henüz bu havaya uygun kıyafet bulunamadı. Lütfen yeni kıyafetler ekleyin!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {weatherData.recommendations.map((rec: any, idx: number) => {
                      const matched = items.find((i) => i.id === rec.item_id);
                      if (!matched) return null;

                      return (
                        <div 
                          key={matched.id || idx}
                          onClick={() => onNavigate("dolap", { category: matched.category, subcategory: matched.subcategory })}
                          className="flex gap-3 bg-white border border-neutral-100 hover:border-black p-2.5 rounded-xs transition-colors cursor-pointer group"
                        >
                          <div className="w-14 h-14 bg-neutral-50 border border-neutral-100/50 shrink-0 overflow-hidden flex items-center justify-center rounded-xs relative">
                            {matched.image_path ? (
                              <img 
                                src={matched.image_path} 
                                alt={matched.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="text-[10px] text-neutral-400 uppercase font-bold text-center">Görsel Yok</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono shrink-0">
                                {matched.brand || "ASKI"}
                              </span>
                              <span className="text-[9px] text-neutral-400 uppercase font-sans px-1.5 py-0.2 bg-neutral-50 rounded-xs font-mono">
                                {matched.color}
                              </span>
                            </div>
                            <h4 className="text-[12px] font-semibold text-neutral-950 truncate font-sans uppercase tracking-wider mt-0.5">
                              {matched.name}
                            </h4>
                            <p className="text-[11px] text-neutral-500 font-sans italic leading-tight mt-0.5 line-clamp-2">
                              {rec.reason}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dynamic Search grounding source link outputs if returned */}
              {weatherData.groundingSources && weatherData.groundingSources.length > 0 && (
                <div className="mt-4 pt-3.5 border-t border-neutral-100/80 flex flex-col gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 font-mono">
                    DOĞRULANMIŞ HAVA DURUMU BİLGİ KAYNAKLARI:
                  </span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {weatherData.groundingSources.slice(0, 3).map((source: any, sIdx: number) => (
                      <a 
                        key={sIdx}
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-neutral-500 hover:text-black hover:underline inline-flex items-center gap-1"
                      >
                        <LinkIcon className="w-2.5 h-2.5" />
                        {source.title.length > 25 ? source.title.substring(0, 25) + "..." : source.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-neutral-400">Hava durumu verisi yüklenemedi.</p>
            </div>
          )}
        </div>

        {/* Editorial Visual Band */}
        <div 
          onClick={() => onNavigate("fiyat")}
          className="my-5 h-[130px] relative overflow-hidden cursor-pointer group"
          style={{
            background: "radial-gradient(120% 90% at 75% 18%, #D9CDBC 0%, rgba(217,205,188,0) 55%), linear-gradient(160deg,#C9BBA6 0%,#8F8270 42%,#3C3731 100%)"
          }}
        >
          {/* Accent shading */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent z-[1]" />
          <div className="absolute left-4 bottom-3 z-[2] text-white text-[10.5px] tracking-widest uppercase font-light">
            FİYATI DÜŞENLER | HAZİRAN
          </div>
          <div className="absolute right-4 bottom-2 z-[2] text-white text-lg font-light group-hover:translate-x-1.5 transition-transform duration-200">
            →
          </div>
        </div>
      </div>
    </div>
  );
}
