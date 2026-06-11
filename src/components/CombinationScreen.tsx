import { useState, useEffect } from "react";
import { Item, Outfit, OutfitItem, WearLog } from "../types";

interface CombinationScreenProps {
  items: Item[];
  outfits: Outfit[];
  outfitItems: OutfitItem[];
  wearLog: WearLog[];
  onBackToHome: () => void;
  onSaveOutfit: (name: string, slots: Record<string, string>) => Promise<any>;
  onLogWear: (idObj: { item_id: string | null; outfit_id: string | null }) => Promise<void>;
  onRefreshData: () => Promise<void>;
}

interface SlotDefinition {
  name: "ÜST GİYİM" | "ALT GİYİM" | "AYAKKABI" | "DIŞ KATMAN" | "AKSESUAR";
  filter: (item: Item) => boolean;
}

const SLOT_DEFS: SlotDefinition[] = [
  {
    name: "ÜST GİYİM",
    filter: (i) =>
      i.category === "GİYİM" &&
      ["Tişört & Üst", "Gömlek", "Polo Yaka", "Triko & Kazak", "Hoodie & Sweatshirt"].includes(i.subcategory),
  },
  {
    name: "ALT GİYİM",
    filter: (i) => i.category === "GİYİM" && ["Pantolon", "Jean", "Şort", "Eşofman"].includes(i.subcategory),
  },
  {
    name: "AYAKKABI",
    filter: (i) => i.category === "AYAKKABI",
  },
  {
    name: "DIŞ KATMAN",
    filter: (i) => i.category === "GİYİM" && ["Blazer & Takım", "Ceket & Mont"].includes(i.subcategory),
  },
  {
    name: "AKSESUAR",
    filter: (i) => i.category === "AKSESUAR",
  },
];

export default function CombinationScreen({
  items,
  outfits,
  outfitItems,
  wearLog,
  onBackToHome,
  onSaveOutfit,
  onLogWear,
  onRefreshData,
}: CombinationScreenProps) {
  const [activeTab, setActiveTab] = useState<"shuffler" | "saved">("shuffler");

  // Shuffler state
  const [slotItems, setSlotItems] = useState<Record<string, Item[]>>({});
  const [indices, setIndices] = useState<Record<string, number>>({});
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const [spunSlots, setSpunSlots] = useState<string[]>([]);
  const [outfitName, setOutfitName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load / prepare pools on mount/items change
  useEffect(() => {
    const preparedPools: Record<string, Item[]> = {};
    const preparedIndices: Record<string, number> = {};
    const preparedLocks: Record<string, boolean> = {};

    SLOT_DEFS.forEach((slot) => {
      // Find matching items (both closet and wishlist for the "eksik parça köprüsü")
      const matches = items.filter(slot.filter);
      preparedPools[slot.name] = matches.length > 0 ? matches : [];
      preparedIndices[slot.name] = 0;
      preparedLocks[slot.name] = locked[slot.name] || false;
    });

    setSlotItems(preparedPools);
    setIndices(preparedIndices);
    setLocked(preparedLocks);
  }, [items]);

  // Shuffle unlocked slots
  const handleShuffle = () => {
    const newIndices = { ...indices };
    const newlySpun: string[] = [];

    SLOT_DEFS.forEach((slot) => {
      if (!locked[slot.name]) {
        const pool = slotItems[slot.name] || [];
        if (pool.length > 1) {
          let next = Math.floor(Math.random() * pool.length);
          // prevent repeating the exact same item
          if (next === indices[slot.name]) {
            next = (next + 1) % pool.length;
          }
          newIndices[slot.name] = next;
          newlySpun.push(slot.name);
        }
      }
    });

    setIndices(newIndices);
    setSpunSlots(newlySpun);

    // Clear animations after delay
    setTimeout(() => {
      setSpunSlots([]);
    }, 400);
  };

  const handleToggleLock = (slotName: string) => {
    setLocked((prev) => ({ ...prev, [slotName]: !prev[slotName] }));
  };

  // Calculations for current selected slots
  const getSelectedItems = () => {
    return SLOT_DEFS.map((slot) => {
      const idx = indices[slot.name] || 0;
      const pool = slotItems[slot.name] || [];
      const item = pool[idx] || null;
      return { slotName: slot.name, item };
    });
  };

  const selectedSlots = getSelectedItems();
  const totalValue = selectedSlots.reduce((acc, current) => acc + (current.item?.added_price || 0), 0);

  // Computes Cost Per Wear for current selections
  const calculateCPWInfo = () => {
    let cpwSum = 0;
    let countsLog = 0;

    selectedSlots.forEach(({ item }) => {
      if (item) {
        const itemWears = wearLog.filter((l) => l.item_id === item.id).length;
        if (itemWears > 0) {
          cpwSum += item.added_price / itemWears;
          countsLog++;
        }
      }
    });

    return {
      average: countsLog > 0 ? Math.round(cpwSum / countsLog) : null,
      count: countsLog,
    };
  };

  const cpwInfo = calculateCPWInfo();

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const slotsData: Record<string, string> = {};
    selectedSlots.forEach(({ slotName, item }) => {
      if (item) slotsData[slotName] = item.id;
    });

    try {
      await onSaveOutfit(outfitName || "Haftalık Kombin", slotsData);
      setOutfitName("");
      alert("Kör kombin başarıyla kaydedildi!");
      setActiveTab("saved");
    } catch (e) {
      console.error(e);
      alert("Kombin kaydedilemedi");
    } finally {
      setIsSaving(false);
    }
  };

  const fmtPrice = (price: number) => {
    return price.toLocaleString("tr-TR") + " ₺";
  };

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
          <span>KOMBİNLER</span>
          <span className="font-sans font-light text-sm tracking-widest text-[#8A8A8A] font-mono">
            |{outfits.length}|
          </span>
        </div>
      </div>

      {/* Tabs selector */}
      <div className="flex px-6 border-b border-[#E3E3E3] shrink-0 mt-3 text-xs tracking-widest">
        <button
          onClick={() => setActiveTab("shuffler")}
          className={`flex-1 py-3 text-center cursor-pointer font-semibold uppercase ${
            activeTab === "shuffler"
              ? "text-black border-b-[2px] border-black"
              : "text-[#8A8A8A] hover:text-[#111111]"
          }`}
        >
          KARIŞTIR & YAP
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex-1 py-3 text-center cursor-pointer font-semibold uppercase ${
            activeTab === "saved"
              ? "text-black border-b-[2px] border-black"
              : "text-[#8A8A8A] hover:text-[#111111]"
          }`}
        >
          KAYITLI KOMBİNLER
        </button>
      </div>

      {activeTab === "shuffler" ? (
        // 1. Shuffler / Generator Screen
        <div className="flex-1 flex flex-col min-h-0 animate-fade">
          {/* Subtitle instructions */}
          <div className="px-6 pt-3 text-[10px] tracking-widest text-[#8A8A8A] uppercase font-medium">
            BEĞENDİĞİNİ SABİTLE, GERİSİNİ KARIŞTIR
          </div>

          {/* Slots scroll */}
          <div className="flex-1 overflow-y-auto no-scrollbar pt-2 px-6">
            <div className="flex flex-col">
              {SLOT_DEFS.map((slot, i) => {
                const idx = indices[slot.name] || 0;
                const pool = slotItems[slot.name] || [];
                const item = pool[idx];
                const isLocked = locked[slot.name];
                const isSpun = spunSlots.includes(slot.name);

                if (!item) {
                  return (
                    <div
                      key={slot.name}
                      className="flex items-center gap-3.5 py-3.5 border-b border-[#E3E3E3] opacity-55 text-[#8A8A8A]"
                    >
                      <span className="text-xs font-mono font-light shrink-0 w-8">|0{i + 1}|</span>
                      <div className="flex-1 text-xs tracking-wider uppercase">
                        {slot.name} SEÇENEĞİ BOŞ
                      </div>
                    </div>
                  );
                }

                const isWishlistItem = item.status === "wishlist";
                const swatchStyle = item.image_path.startsWith("linear") || item.image_path.startsWith("repeating")
                  ? { background: item.image_path }
                  : { backgroundImage: `url(${item.image_path})`, backgroundSize: "cover", backgroundPosition: "center" };

                return (
                  <div
                    key={slot.name}
                    className={`flex items-center gap-3.5 py-3 border-b border-[#E3E3E3] transition-all duration-300 ${
                      isSpun ? "animate-spin-slot" : ""
                    }`}
                  >
                    <span className="text-xs font-mono font-light shrink-0 w-8">|0{i + 1}|</span>

                    {/* Thumbnail Swatch */}
                    <div className="w-12 h-14 border border-[#E3E3E3] shrink-0 bg-neutral-100" style={swatchStyle} />

                    {/* Text Body info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[9.5px] tracking-[0.18em] text-[#8A8A8A] uppercase font-medium">
                        {slot.name} · {item.subcategory.toUpperCase()}
                      </div>
                      <div className="font-semibold text-[13.5px] text-black truncate pr-1">
                        {item.name}
                      </div>
                      <div className="text-[10.5px] text-[#8A8A8A] truncate font-sans">
                        {item.brand} ({item.size}) · <b className="font-mono text-black font-semibold">{fmtPrice(item.added_price)}</b>
                        {isWishlistItem && (
                          <span className="text-[#C2185B] font-semibold tracking-tighter ml-1.5 font-mono text-[9px]">
                            ▼ MEVCUT DEĞİL (İSTEK)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sabitleme lock switch button */}
                    <button
                      onClick={() => handleToggleLock(slot.name)}
                      className={`text-[8.5px] tracking-widest font-semibold border border-black px-2 py-1.5 select-none transition-all duration-200 cursor-pointer font-sans rounded-none uppercase ${
                        isLocked ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-50"
                      }`}
                    >
                      {isLocked ? "SABİT" : "SABİTLE"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Save name inputs */}
            <div className="mt-5 pb-5 shrink-0 flex gap-2.5 items-end">
              <div className="flex-1 flex flex-col">
                <label className="text-[10px] tracking-widest text-[#8A8A8A] font-semibold mb-1 uppercase">KOMBİN ADALANDIR</label>
                <input
                  type="text"
                  placeholder="örn: Mülakat Şıklığı, Pazar Kahvaltısı"
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                  className="border border-[#E3E3E3] focus:border-black outline-none px-3 py-2 text-xs font-sans rounded-none w-full placeholder-neutral-400 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Engineer Stripe values bottom indicator */}
          <div className="shrink-0 border-t border-black mx-6 py-2.5 flex justify-between items-baseline font-mono text-xs">
            <div>
              <span className="text-[9.5px] font-sans tracking-[0.16em] text-[#8A8A8A] uppercase">TOPLAM DEĞER </span>
              <b className="font-semibold text-black">{fmtPrice(totalValue)}</b>
            </div>
            <div>
              <span className="text-[9.5px] font-sans tracking-[0.16em] text-[#8A8A8A] uppercase">ORT. CPW </span>
              <b className="font-semibold text-black">{cpwInfo.average ? fmtPrice(cpwInfo.average) : "—"}</b>
              <span className="text-[9.5px] font-sans text-neutral-400 font-light"> /giydim</span>
            </div>
          </div>

          {/* Bottom primary button layout */}
          <div className="shrink-0 flex gap-2.5 px-6 pb-5 pt-1">
            <button
              onClick={handleShuffle}
              className="flex-1 py-3.5 border border-black text-xs font-semibold tracking-widest uppercase hover:bg-neutral-50 cursor-pointer text-black"
            >
              KARIŞTIR ⟳
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3.5 bg-black text-[#FFFFFF] border border-black text-xs font-semibold tracking-widest uppercase hover:opacity-90 cursor-pointer"
            >
              {isSaving ? "KAYDEDİLİYOR..." : "KAYDET ✓"}
            </button>
          </div>
        </div>
      ) : (
        // 2. Saved Outfits List
        <div className="flex-1 overflow-y-auto no-scrollbar pt-3 pb-6 px-6 animate-fade">
          {outfits.length === 0 ? (
            <div className="text-center py-24 text-xs tracking-widest text-[#8A8A8A] uppercase">
              HİÇ KAYITLI KOMBİN BULUNAMADI. YENİ KOMBİNLER OLUŞTURUN VE SİSTEME EKLEYİNİZ.
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {outfits
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((outfit) => {
                  // Get associated items for this outfit
                  const outfitMatches = outfitItems.filter((oi) => oi.outfit_id === outfit.id);

                  // Calculate total outfit price
                  const matchingItems = outfitMatches
                    .map((oi) => items.find((i) => i.id === oi.item_id))
                    .filter((i) => i !== undefined) as Item[];

                  const outfitPrice = matchingItems.reduce((sum, item) => sum + item.added_price, 0);

                  // calculate outfit wear counts
                  const outfitWears = wearLog.filter((log) => log.outfit_id === outfit.id).length;

                  return (
                    <div
                      key={outfit.id}
                      className="border border-[#E3E3E3] p-4.5 bg-white/50 hover:border-black transition-all duration-200 flex flex-col gap-3"
                    >
                      {/* Name row */}
                      <div className="flex justify-between items-baseline border-b border-[#E3E3E3] pb-2.5">
                        <div className="flex flex-col">
                          <h4 className="font-display font-semibold text-lg uppercase text-black">
                            {outfit.name}
                          </h4>
                          <span className="text-[9px] text-[#8A8A8A] font-mono leading-none">
                            OLUŞTURMA: {new Date(outfit.created_at).toLocaleDateString("tr-TR")}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-black font-semibold shrink-0">
                          {fmtPrice(outfitPrice)}
                        </div>
                      </div>

                      {/* Items thumbnails row */}
                      <div className="flex gap-2.5 flex-wrap">
                        {matchingItems.map((item) => {
                          const swatchStyle = item.image_path.startsWith("linear") || item.image_path.startsWith("repeating")
                            ? { background: item.image_path }
                            : { backgroundImage: `url(${item.image_path})`, backgroundSize: "cover", backgroundPosition: "center" };

                          return (
                            <div
                              key={item.id}
                              style={swatchStyle}
                              title={`${item.subcategory}: ${item.name}`}
                              className="w-10 h-12 border border-[#E3E3E3] flex items-center justify-center text-[8px] text-white/50 select-none font-mono"
                            >
                              {!item.image_path.includes("http") && item.subcategory.slice(0, 1)}
                            </div>
                          );
                        })}
                      </div>

                      {/* Detail list elements list inside combo */}
                      <div className="text-[10.5px] text-[#8A8A8A] leading-normal uppercase">
                        {matchingItems.map((item, idx) => (
                          <div key={item.id}>
                            ✦ {item.subcategory.toUpperCase()}: <span className="text-[#111111] font-semibold">{item.name}</span> ({item.brand})
                          </div>
                        ))}
                      </div>

                      {/* Lower Actions button */}
                      <div className="flex items-center justify-between border-t border-[#E3E3E3] pt-3 mt-1 text-xs">
                        <div className="font-mono text-[10.5px] text-[#8A8A8A]">
                          Giyilme: <b className="text-[#111111] font-semibold">{outfitWears} defa</b>
                        </div>
                        <button
                          onClick={async () => {
                            await onLogWear({ item_id: null, outfit_id: outfit.id });
                            alert(`✓ ${outfit.name} kombin giydim günlüğüne kaydedildi!`);
                          }}
                          className="text-[9.5px] border border-black font-semibold text-black tracking-widest px-3 py-1.5 hover:bg-black hover:text-white transition-colors cursor-pointer rounded-none uppercase"
                        >
                          BUGÜN GİYDİM ✓
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
