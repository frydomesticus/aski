import { useState } from "react";
import { Item, PriceHistory, ItemStatus } from "../types";
import { getGradientForColor } from "../constants";

interface ClosetGridScreenProps {
  items: Item[];
  priceHistory: PriceHistory[];
  filter: { cat: string; sub: string | null };
  onNavigateFilter: (category: string, subcategory: string | null) => void;
  onNavigateBack: () => void;
  onDeleteItem: (id: string) => void;
  onUpdateStatus: (id: string, status: ItemStatus) => void;
}

export default function ClosetGridScreen({
  items,
  priceHistory,
  filter,
  onNavigateFilter,
  onNavigateBack,
  onDeleteItem,
  onUpdateStatus,
}: ClosetGridScreenProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Filter only closet items
  const ownedItems = items.filter((i) => i.status === "closet");

  // Apply visual category checks
  const filteredList = ownedItems.filter((i) => {
    const matchCat = filter.cat === "TÜMÜ" || i.category === filter.cat;
    const matchSub = !filter.sub || i.subcategory === filter.sub;
    return matchCat && matchSub;
  });

  // Calculate price changes dynamically from historical records
  const getPriceDelta = (item: Item) => {
    const history = priceHistory
      .filter((ph) => ph.item_id === item.id)
      .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime());

    if (history.length < 2) return null;

    const firstPrice = history[0].price;
    const latestPrice = history[history.length - 1].price;

    if (firstPrice === latestPrice) return null;

    const diffPercent = Math.round(((latestPrice - firstPrice) / firstPrice) * 100);

    return {
      isDown: latestPrice < firstPrice,
      percent: Math.abs(diffPercent),
    };
  };

  const fmtPrice = (price: number) => {
    return price.toLocaleString("tr-TR") + " ₺";
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-fade">
      {/* Header */}
      <div className="px-6 pt-1 shrink-0 flex flex-col">
        <button
          onClick={onNavigateBack}
          className="text-left text-xs tracking-widest text-[#8A8A8A] uppercase cursor-pointer hover:text-black self-start"
        >
          {filter.sub ? `← ${filter.cat}` : "← ANA"}
        </button>
        <div className="font-display font-semibold text-3xl flex items-baseline gap-2.5 mt-1.5 uppercase text-black">
          {filter.sub ? filter.sub : filter.cat === "TÜMÜ" ? "DOLABIM" : filter.cat}
          <span className="font-sans font-light text-sm tracking-widest text-[#8A8A8A] font-mono">
            |{filteredList.length}|
          </span>
        </div>
      </div>

      {/* Filter Chips (hidden when subcategory filter is active) */}
      {!filter.sub && (
        <div className="flex gap-2.5 px-6 pt-3.5 pb-1 overflow-x-auto no-scrollbar shrink-0">
          {["TÜMÜ", "GİYİM", "AYAKKABI", "AKSESUAR"].map((cat) => {
            const isActive = filter.cat === cat;
            return (
              <button
                key={cat}
                onClick={() => onNavigateFilter(cat, null)}
                className={`text-xs tracking-wider border px-3 py-1.5 whitespace-nowrap cursor-pointer transition-colors duration-200 uppercase font-sans ${
                  isActive
                    ? "text-[#FFFFFF] bg-[#111111] border-[#111111]"
                    : "text-[#8A8A8A] border-[#E3E3E3] hover:text-[#111111]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-6">
        {filteredList.length === 0 ? (
          <div className="text-center py-20 text-xs tracking-widest text-[#8A8A8A] uppercase">
            BU KATEGORİ HENÜZ BOŞ
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-5.5">
            {filteredList.map((item) => {
              const delta = getPriceDelta(item);
              const swatchStyle = item.image_path.startsWith("linear") || item.image_path.startsWith("repeating")
                ? { background: item.image_path }
                : { backgroundImage: `url(${item.image_path})`, backgroundSize: "cover", backgroundPosition: "center" };

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className="flex flex-col cursor-pointer group"
                >
                  {/* Swatch Image frame */}
                  <div 
                    className="h-37 border border-[#E3E3E3] relative flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-[#111111] bg-neutral-50"
                    style={swatchStyle}
                  >
                    {/* Price change badge */}
                    {delta && (
                      <span className={`absolute top-2 right-2 font-mono text-[9px] px-1.5 py-0.5 bg-white border border-[#E3E3E3] font-medium tracking-tighter ${
                        delta.isDown ? "text-[#2E7D4F]" : "text-[#C2185B]"
                      }`}>
                        {delta.isDown ? "▼" : "▲"} %{delta.percent}
                      </span>
                    )}

                    {/* Short Visual code for placeholder gradient description */}
                    {!(item.image_path.startsWith("http") || item.image_path.startsWith("data")) && (
                      <span className="text-[10px] text-white/30 tracking-widest select-none uppercase font-mono font-light">
                        {item.subcategory.slice(0, 3)}
                      </span>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="font-semibold text-[13px] leading-snug mt-2 text-black truncate group-hover:underline">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-[#8A8A8A] mt-0.5 tracking-wider uppercase truncate">
                    {item.subcategory.toUpperCase()} · {item.brand} ({item.size})
                  </div>
                  <div className="font-mono text-[12.5px] mt-1 font-medium text-black">
                    {fmtPrice(item.added_price)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drill-down Detail Modal / Bottom Drawer overlay */}
      {selectedItemId && (() => {
        const item = items.find((i) => i.id === selectedItemId);
        if (!item) return null;

        const history = priceHistory
          .filter((ph) => ph.item_id === item.id)
          .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime());

        return (
          <div className="absolute inset-0 bg-[#111111]/35 backdrop-blur-xs flex items-end justify-center z-50 animate-fade">
            <div className="bg-[#FFFFFF] w-full max-h-[85%] flex flex-col pt-5 pb-6 text-[#111111] animate-spin-slot">
              {/* Top Row bar */}
              <div className="flex justify-between items-center px-6 pb-4 border-b border-[#E3E3E3]">
                <span className="text-xs tracking-widest font-mono text-[#8A8A8A]">| {item.id.toUpperCase()} |</span>
                <button
                  onClick={() => setSelectedItemId(null)}
                  className="text-xs tracking-[0.16em] font-medium border border-[#111111] px-2.5 py-1 text-black hover:bg-neutral-50 cursor-pointer"
                >
                  KAPAT
                </button>
              </div>

              {/* Data body */}
              <div className="flex-1 overflow-y-auto px-6 pt-4">
                <div 
                  className="h-44 border border-[#E3E3E3] mb-4 flex items-center justify-center bg-neutral-50"
                  style={item.image_path.startsWith("linear") || item.image_path.startsWith("repeating")
                    ? { background: item.image_path }
                    : { backgroundImage: `url(${item.image_path})`, backgroundSize: "cover", backgroundPosition: "center" }}
                />

                <h3 className="font-display font-semibold text-2xl uppercase tracking-tight text-neutral-900 leading-tight">
                  {item.name}
                </h3>
                <p className="text-xs tracking-widest text-[#8A8A8A] uppercase mt-1">
                  {item.brand} · {item.subcategory}
                </p>

                <div className="grid grid-cols-2 gap-4 mt-4 border-t border-b border-[#E3E3E3] py-4">
                  <div>
                    <span className="text-[10px] tracking-widest text-[#8A8A8A]" style={{ display: "block" }}>BEDEN / RENK</span>
                    <span className="text-xs font-semibold uppercase">{item.size} · {item.color}</span>
                  </div>
                  <div>
                    <span className="text-[10px] tracking-widest text-[#8A8A8A]" style={{ display: "block" }}>SEZON</span>
                    <span className="text-xs font-semibold uppercase">{item.seasons.join(", ")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] tracking-widest text-[#8A8A8A]" style={{ display: "block" }}>EDİNME TARİHİ</span>
                    <span className="text-xs font-semibold">{new Date(item.added_at).toLocaleDateString("tr-TR")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] tracking-widest text-[#8A8A8A]" style={{ display: "block" }}>SİTE / MAĞAZA</span>
                    <span className="text-xs font-semibold uppercase">{item.store}</span>
                  </div>
                </div>

                {/* Price History Timeline inside modal */}
                <div className="mt-4">
                  <h4 className="text-[10px] tracking-[0.16em] text-[#8A8A8A] uppercase mb-2 font-medium">FİYAT GEÇMİŞİ</h4>
                  <div className="flex flex-col gap-2 bg-[#F9F9F9] p-3 border border-[#E3E3E3]">
                    {history.map((record, rIdx) => (
                      <div key={record.id} className="flex justify-between items-baseline text-xs font-mono">
                        <span className="text-[#8A8A8A]">{new Date(record.checked_at).toLocaleDateString("tr-TR")}</span>
                        <span className="font-semibold text-black">
                          {fmtPrice(record.price)} {rIdx === 0 && <span className="text-[9px] font-sans text-neutral-400 font-light">(EKLEME FİYATI)</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* External URL action if any */}
                {item.url && (
                  <div className="mt-4">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center border border-black py-2.5 text-xs text-black font-semibold tracking-wider uppercase hover:bg-neutral-50"
                    >
                      ÜRÜN SİTESİNE GİT ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Delete / Wishlist transfer options */}
              <div className="px-6 pt-4 border-t border-[#E3E3E3] flex gap-2.5">
                <button
                  onClick={() => {
                    if (confirm("Bu ürünü istek listesine taşımak istediğinizden emin misiniz?")) {
                      onUpdateStatus(item.id, ItemStatus.WISHLIST);
                      setSelectedItemId(null);
                    }
                  }}
                  className="flex-1 py-3 text-[11px] font-semibold tracking-wider uppercase border border-neutral-300 text-neutral-600 hover:text-black hover:border-black cursor-pointer bg-white"
                >
                  İSTEK LİSTESİNE GÖNDER
                </button>
                <button
                  onClick={() => {
                    if (confirm("Bu ürünü dolabınızdan tamamen silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
                      onDeleteItem(item.id);
                      setSelectedItemId(null);
                    }
                  }}
                  className="flex-1 py-3 text-[11px] font-semibold tracking-wider uppercase bg-white border border-[#C2185B] text-[#C2185B] hover:bg-red-50 cursor-pointer"
                >
                  ÜRÜNÜ SİL
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
