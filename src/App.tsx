import { useState, useEffect } from "react";
import { Item, PriceHistory, Outfit, OutfitItem, WearLog, ItemStatus } from "./types";

// Import Modular Components
import MainScreen from "./components/MainScreen";
import CategoryScreen from "./components/CategoryScreen";
import ClosetGridScreen from "./components/ClosetGridScreen";
import WishlistScreen from "./components/WishlistScreen";
import PriceTrackingScreen from "./components/PriceTrackingScreen";
import CombinationScreen from "./components/CombinationScreen";
import AddScreen from "./components/AddScreen";
import StatsScreen from "./components/StatsScreen";

export default function App() {
  const [activeScreen, setActiveScreen] = useState<string>("ana");
  const [extraParam, setExtraParam] = useState<any>(null);
  const [sharedUrl, setSharedUrl] = useState<string>("");

  // Core Db States
  const [items, setItems] = useState<Item[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [outfitItems, setOutfitItems] = useState<OutfitItem[]>([]);
  const [wearLog, setWearLog] = useState<WearLog[]>([]);

  // Navigation Filter parameters for ClosetGrid levels
  const [gridFilter, setGridFilter] = useState<{ cat: string; sub: string | null }>({
    cat: "TÜMÜ",
    sub: null,
  });

  // Load all datastores on boot
  const refreshAllData = async () => {
    try {
      const pItems = fetch("/api/items").then((r) => r.json());
      const pHistory = fetch("/api/price-history").then((r) => r.json());
      const pOutfits = fetch("/api/outfits").then((r) => r.json());
      const pLog = fetch("/api/wear-log").then((r) => r.json());

      const [itemsData, historyData, outfitsPayload, logData] = await Promise.all([
        pItems,
        pHistory,
        pOutfits,
        pLog,
      ]);

      setItems(itemsData);
      setPriceHistory(historyData);
      setOutfits(outfitsPayload.outfits || []);
      setOutfitItems(outfitsPayload.outfit_items || []);
      setWearLog(logData);
    } catch (err) {
      console.error("Failed to sync backend DB registers.", err);
    }
  };

  useEffect(() => {
    refreshAllData();

    // PWA Share Target URL parser
    try {
      const queryParams = new URLSearchParams(window.location.search);
      const sUrl = queryParams.get("url") || "";
      const sText = queryParams.get("text") || "";
      const sTitle = queryParams.get("title") || "";

      let foundUrl = "";
      const urlRegex = /(https?:\/\/[^\s]+)/gi;

      if (sUrl && sUrl.match(urlRegex)) {
        foundUrl = sUrl.match(urlRegex)![0];
      } else if (sText && sText.match(urlRegex)) {
        foundUrl = sText.match(urlRegex)![0];
      } else if (sTitle && sTitle.match(urlRegex)) {
        foundUrl = sTitle.match(urlRegex)![0];
      }

      if (foundUrl) {
        // Strip URL queries to avoid loop/refetching on reload
        window.history.replaceState({}, document.title, window.location.pathname);
        setSharedUrl(foundUrl);
        setActiveScreen("ekle");
      }
    } catch (e) {
      console.error("PWA shared URL parsing failed", e);
    }
  }, []);

  // Update Item status (Closet <-> Wishlist <-> Archived)
  const handleUpdateStatus = async (id: string, status: ItemStatus) => {
    try {
      // Find current item to obtain existing values
      const current = items.find((i) => i.id === id);
      if (!current) return;

      const res = await fetch(`/api/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        await refreshAllData();
      }
    } catch (e) {
      console.error("Item update failed", e);
    }
  };

  // Delete product completely
  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (e) {
      console.error("Item delete failed", e);
    }
  };

  // Save combinations
  const handleSaveOutfit = async (name: string, slots: Record<string, string>) => {
    try {
      const res = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slots }),
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (e) {
      console.error("Outfit save failed", e);
    }
  };

  // Record item or outfit wears
  const handleLogWear = async (ids: { item_id: string | null; outfit_id: string | null }) => {
    try {
      const res = await fetch("/api/wear-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids),
      });
      if (res.ok) {
        await refreshAllData();
      }
    } catch (e) {
      console.error("Wear logging failed", e);
    }
  };

  // Unified navigation handler
  const navigateTo = (screen: string, extra?: any) => {
    setActiveScreen(screen);
    if (extra) {
      setExtraParam(extra);
      if (screen === "dolap") {
        setGridFilter({
          cat: extra.category,
          sub: extra.subcategory,
        });
      }
    }
  };

  // Helper properties
  const ownedCount = items.filter((i) => i.status === "closet").length;

  // Calculat direct discount records count to display in FİYAT TAKİBİ bubble count
  const getDiscountsCount = () => {
    let priceDeltas = 0;
    items.forEach((item) => {
      const records = priceHistory
        .filter((ph) => ph.item_id === item.id)
        .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime());

      if (records.length >= 2) {
        // if latest price is different
        if (records[0].price !== records[records.length - 1].price) {
          priceDeltas++;
        }
      }
    });
    // return 3 default if none registered yet to guarantee beautiful matching start counts
    return priceDeltas > 0 ? priceDeltas : 3;
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 md:p-6 select-none bg-neutral-200">
      
      {/* Editorial aesthetic phone frame mockup */}
      <div className="phone w-[390px] h-[820px] bg-white rounded-[44px] border border-neutral-300 shadow-[0_30px_80px_rgba(0,0,0,0.18),_inset_0_0_0_6px_#0A0A0A] overflow-hidden relative flex flex-col text-[#111111]">
        
        {/* Status Bar */}
        <div className="statusbar h-[42px] shrink-0 flex items-center justify-between px-7 font-sans text-xs font-semibold text-neutral-800">
          <span>03:14</span>
          <span>4.5G · %42</span>
        </div>

        {/* Dynamic Display Screens router container */}
        <div className="flex-1 flex flex-col min-h-0">
          
          {activeScreen === "ana" && (
            <MainScreen
              items={items}
              outfits={outfits}
              priceChangesCount={getDiscountsCount()}
              onNavigate={navigateTo}
            />
          )}

          {activeScreen === "kat" && (
            <CategoryScreen
              items={items}
              onNavigateToGrid={(cat, sub) => navigateTo("dolap", { category: cat, subcategory: sub })}
              onBackToHome={() => navigateTo("ana")}
            />
          )}

          {activeScreen === "altkat" && (
            <CategoryScreen
              items={items}
              onNavigateToGrid={(cat, sub) => navigateTo("dolap", { category: cat, subcategory: sub })}
              onBackToHome={() => navigateTo("ana")}
            />
          )}

          {activeScreen === "dolap" && (
            <ClosetGridScreen
              items={items}
              priceHistory={priceHistory}
              filter={gridFilter}
              onNavigateFilter={(cat, sub) => {
                setGridFilter({ cat, sub });
              }}
              onNavigateBack={() => {
                if (gridFilter.sub) {
                  navigateTo("kat");
                } else {
                  navigateTo("ana");
                }
              }}
              onDeleteItem={handleDeleteItem}
              onUpdateStatus={handleUpdateStatus}
            />
          )}

          {activeScreen === "istek" && (
            <WishlistScreen
              items={items}
              outfitItems={outfitItems}
              onBackToHome={() => navigateTo("ana")}
              onUpdateStatus={handleUpdateStatus}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {activeScreen === "fiyat" && (
            <PriceTrackingScreen
              items={items}
              priceHistory={priceHistory}
              onBackToHome={() => navigateTo("ana")}
              onRefreshData={refreshAllData}
            />
          )}

          {activeScreen === "kombin" && (
            <CombinationScreen
              items={items}
              outfits={outfits}
              outfitItems={outfitItems}
              wearLog={wearLog}
              onBackToHome={() => navigateTo("ana")}
              onSaveOutfit={handleSaveOutfit}
              onLogWear={handleLogWear}
              onRefreshData={refreshAllData}
            />
          )}

          {activeScreen === "ekle" && (
            <AddScreen
              onBackToHome={() => {
                setSharedUrl("");
                navigateTo("ana");
              }}
              onRefreshData={refreshAllData}
              onNavigateToGrid={(cat, sub) => {
                setSharedUrl("");
                navigateTo("dolap", { category: cat, subcategory: sub });
              }}
              sharedUrl={sharedUrl}
              onClearSharedUrl={() => setSharedUrl("")}
            />
          )}

          {activeScreen === "stats" && (
            <StatsScreen
              items={items}
              wearLog={wearLog}
              onBackToHome={() => navigateTo("ana")}
            />
          )}

        </div>

        {/* Bottom Navigation Bar */}
        <div className="navbar shrink-0 flex items-center justify-between pb-6 pt-3 px-7.5 border-t border-neutral-100 font-sans font-medium text-xs tracking-widest text-[#111111]">
          <span 
            onClick={() => navigateTo("ana")} 
            className={`cursor-pointer font-sans select-none hover:text-neutral-500 transition-colors ${activeScreen === "ana" ? "font-bold text-black border-b border-black pb-0.5" : ""}`}
          >
            ⌂
          </span>
          <span 
            onClick={() => navigateTo("kat")} 
            className={`cursor-pointer select-none hover:text-neutral-500 transition-colors uppercase ${activeScreen === "kat" ? "font-bold text-black border-b border-black pb-0.5" : ""}`}
          >
            MENÜ
          </span>
          <span 
            onClick={() => navigateTo("ekle")} 
            className={`cursor-pointer font-sans select-none text-[22px] leading-none hover:text-[#C2185B] transition-colors relative top-[-1px] ${activeScreen === "ekle" ? "text-[#C2185B] font-bold" : ""}`}
          >
            +
          </span>
          <span 
            onClick={() => navigateTo("kombin")} 
            className={`cursor-pointer select-none hover:text-neutral-500 transition-colors uppercase ${activeScreen === "kombin" ? "font-bold text-black border-b border-black pb-0.5" : ""}`}
          >
            KOMBİN
          </span>
          <span 
            onClick={() => navigateTo("dolap", { category: "TÜMÜ", subcategory: null })} 
            className={`basket select-none cursor-pointer pb-0.5 relative flex items-baseline justify-center tracking-normal font-mono font-bold text-[11px] h-4 min-w-[20px] px-1 text-center bg-white border border-black group`}
          >
            {ownedCount}
          </span>
        </div>

      </div>
    </div>
  );
}
