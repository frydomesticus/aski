import { Item, Outfit } from "../types";

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
