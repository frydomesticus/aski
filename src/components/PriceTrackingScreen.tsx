import { useState } from "react";
import { Item, PriceHistory } from "../types";

interface PriceTrackingScreenProps {
  items: Item[];
  priceHistory: PriceHistory[];
  onBackToHome: () => void;
  onRefreshData: () => Promise<void>;
}

export default function PriceTrackingScreen({
  items,
  priceHistory,
  onBackToHome,
  onRefreshData,
}: PriceTrackingScreenProps) {
  const [cronRunning, setCronRunning] = useState(false);
  const [cronReport, setCronReport] = useState<{ checked_at: string; updates: any[] } | null>(null);

  const fmtPrice = (price: number) => {
    return price.toLocaleString("tr-TR") + " ₺";
  };

  // Run simulated nightly job on the server
  const triggerSimulatedCron = async () => {
    setCronRunning(true);
    setCronReport(null);
    try {
      const res = await fetch("/api/items/cron-check", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await onRefreshData();
        setCronReport(data);
      }
    } catch (e) {
      console.error("Cron failed", e);
    } finally {
      setCronRunning(false);
    }
  };

  // Associate price changes. Sort price history items from newest to oldest
  const associatedHistory = priceHistory
    .map((record) => {
      const item = items.find((i) => i.id === record.item_id);
      return { record, item };
    })
    .filter((h) => h.item !== undefined)
    .sort((a, b) => new Date(b.record.checked_at).getTime() - new Date(a.record.checked_at).getTime());

  // Aggregate item discount records (items that have multiple history values where the newer price is different from the original price)
  const discountItems = items.filter((item) => {
    const itemRecords = priceHistory
      .filter((ph) => ph.item_id === item.id)
      .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime());

    if (itemRecords.length < 2) return false;
    // return true if last price is different from first
    return itemRecords[0].price !== itemRecords[itemRecords.length - 1].price;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-fade">
      {/* Header */}
      <div className="px-6 pt-1 shrink-0 flex flex-col">
        <button
          onClick={onBackToHome}
          className="text-left text-xs tracking-widest text-[#8A8A8A] uppercase cursor-pointer hover:text-black self-start"
        >
          ← ANA
        </button>
        <div className="font-display font-semibold text-3xl flex items-baseline justify-between mt-1.5 text-black">
          <span>FİYAT TAKİBİ</span>
          <button 
            onClick={triggerSimulatedCron}
            disabled={cronRunning}
            className="font-sans font-semibold text-[10px] tracking-widest text-[#C2185B] border border-[#C2185B] hover:bg-[#C2185B] hover:text-white px-2.5 py-1.5 transition-all cursor-pointer select-none uppercase"
          >
            {cronRunning ? "KONTROL EDİLİYOR..." : "CRON TETİKLE ⟳"}
          </button>
        </div>
        <div className="text-[10.5px] tracking-[0.14em] text-[#8A8A8A] mt-1.5 uppercase font-medium">
          SON 30 GÜN · GECE 04:00'TE GÜNCELLENİR
        </div>
      </div>

      {/* Interactive feedback for Cron trigger */}
      {cronReport && (
        <div className="mx-6 mt-3 bg-neutral-900 text-white p-3.5 border border-black font-mono text-[11px] leading-tight animate-fade shrink-0">
          <div className="flex justify-between border-b border-neutral-700 pb-1.5 mb-2">
            <span className="text-[#C2185B] font-semibold">✓ GECE RAPORU AKTİF</span>
            <span className="text-neutral-500">{new Date(cronReport.checked_at).toLocaleTimeString("tr-TR")}</span>
          </div>
          {cronReport.updates.length === 0 ? (
            <div className="text-neutral-400 font-light">E-Ticaret sitelerinde fiyatlar stabil; bu gece indirim ya da zam bulunamadı.</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {cronReport.updates.map((up, idx) => (
                <div key={idx} className="flex justify-between items-baseline gap-2">
                  <span className="truncate text-neutral-300">{up.item}</span>
                  <span className={`shrink-0 font-semibold ${up.change.startsWith("▼") ? "text-[#2E7D4F]" : "text-[#C2185B]"}`}>
                    {up.change} ({fmtPrice(up.oldPrice)} → {fmtPrice(up.newPrice)})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History timeline list */}
      <div className="flex-1 overflow-y-auto no-scrollbar mt-3">
        {associatedHistory.length === 0 ? (
          <div className="text-center py-20 text-xs tracking-widest text-[#8A8A8A] uppercase px-6">
            FİYAT DEĞİŞİM GEÇMİŞİ BULUNAMADI.
          </div>
        ) : (
          <div className="flex flex-col">
            {discountItems.map((item) => {
              const itemHistory = priceHistory
                .filter((ph) => ph.item_id === item.id)
                .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime());

              const firstPrice = itemHistory[0].price;
              const currentPrice = itemHistory[itemHistory.length - 1].price;
              const isDown = currentPrice < firstPrice;
              const changePercent = Math.round((Math.abs(currentPrice - firstPrice) / firstPrice) * 100);

              const swatchStyle = item.image_path.startsWith("linear") || item.image_path.startsWith("repeating")
                ? { background: item.image_path }
                : { backgroundImage: `url(${item.image_path})`, backgroundSize: "cover", backgroundPosition: "center" };

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-6 py-4 border-b border-[#E3E3E3]"
                >
                  {/* Swatch */}
                  <div
                    className="w-11 h-13 border border-[#E3E3E3] shrink-0 bg-neutral-100"
                    style={swatchStyle}
                  />

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[13.5px] text-black truncate">
                        {item.name}
                      </span>
                      {item.status === "wishlist" && (
                        <span className="shrink-0 text-[8px] tracking-widest text-[#C2185B] border border-[#C2185B] px-1 font-semibold uppercase">
                          İSTEK
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#8A8A8A] mt-0.5 uppercase truncate">
                      {item.brand} · eklendiğinde {fmtPrice(firstPrice)}
                    </div>
                    {/* Price with absolute arrow representation */}
                    <div className="text-xs font-mono mt-1 text-black flex items-center gap-2">
                      <span className={`font-semibold shrink-0 ${isDown ? "text-[#2E7D4F]" : "text-[#C2185B]"}`}>
                        {isDown ? "▼" : "▲"} %{changePercent}
                      </span>
                      <span className="text-neutral-400 font-light">
                        {fmtPrice(firstPrice)} → <b className="text-neutral-900 font-semibold">{fmtPrice(currentPrice)}</b>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* General Log Header */}
            <div className="bg-neutral-50 px-6 py-2 border-b border-[#E3E3E3] text-[9.5px] tracking-[0.16em] text-[#8A8A8A] uppercase font-semibold">
              KRONOLOJİK GÜNCELLEMELER (TÜM DEĞERLER)
            </div>

            {associatedHistory.slice(0, 20).map(({ record, item }) => {
              if (!item) return null;
              const swatchStyle = item.image_path.startsWith("linear") || item.image_path.startsWith("repeating")
                ? { background: item.image_path }
                : { backgroundImage: `url(${item.image_path})`, backgroundSize: "cover", backgroundPosition: "center" };

              return (
                <div
                  key={record.id}
                  className="flex items-center gap-4 px-6 py-3.5 border-b border-[#E3E3E3]/60 bg-white/70 hover:bg-neutral-50 transition-colors"
                >
                  <div
                    className="w-8 h-10 border border-[#E3E3E3] shrink-0"
                    style={swatchStyle}
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-semibold text-black truncate pr-2">{item.name}</span>
                      <span className="text-[10px] text-[#8A8A8A] font-mono shrink-0">
                        {new Date(record.checked_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-[#8A8A8A] truncate uppercase">
                      {item.brand} · {item.subcategory}
                    </div>
                    <div className="font-mono text-neutral-800 mt-0.5">
                      Sistem Okuması: <b className="font-semibold text-black">{fmtPrice(record.price)}</b>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
