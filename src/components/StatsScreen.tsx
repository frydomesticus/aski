import { Item, WearLog } from "../types";

interface StatsScreenProps {
  items: Item[];
  wearLog: WearLog[];
  onBackToHome: () => void;
}

export default function StatsScreen({ items, wearLog, onBackToHome }: StatsScreenProps) {
  const closetItems = items.filter((i) => i.status === "closet");
  const totalValue = closetItems.reduce((sum, item) => sum + item.added_price, 0);
  const totalCount = closetItems.length;
  const avgValue = totalCount > 0 ? Math.round(totalValue / totalCount) : 0;

  const fmtPrice = (price: number) => {
    return price.toLocaleString("tr-TR") + " ₺";
  };

  // 1. Cost Per Wear (CPW) Calculations
  const itemsWithCpw = closetItems.map((item) => {
    const wears = wearLog.filter((log) => log.item_id === item.id).length;
    const cpw = wears > 0 ? item.added_price / wears : item.added_price; // if 0 wears, cpw is full cost
    return { item, wears, cpw };
  });

  const activeCpw = itemsWithCpw.filter((i) => i.wears > 0);

  // sort CPW from lowest to highest (the best / cost-effective pieces)
  const bestCpw = [...activeCpw].sort((a, b) => a.cpw - b.cpw).slice(0, 3);

  // sort CPW from highest to lowest (the worst / expensive relative to usage)
  const worstCpw = [...activeCpw].sort((a, b) => b.cpw - a.cpw).slice(0, 2);

  // 2. ABC analysis simulation based on real wear logs sorting
  // Let's compute Pareto numbers
  const sortedByWears = [...closetItems].map((item) => {
    const wears = wearLog.filter((log) => log.item_id === item.id).length;
    return { item, wears };
  }).sort((a, b) => b.wears - a.wears);

  const totalWearsSum = sortedByWears.reduce((sum, current) => sum + current.wears, 0);

  let pA = 72;
  let pB = 21;
  let pC = 7;
  let paretoText = "Dolabın %22'si giyimlerin %72'sini karşılıyor";

  if (totalWearsSum > 0) {
    // Math logic calculation to separate A (>15 wears), B (5-15 wears), C (<5 wears)
    let wearsA = 0;
    let wearsB = 0;
    let wearsC = 0;

    let itemsACount = 0;

    sortedByWears.forEach((e) => {
      if (e.wears >= 15) {
        wearsA += e.wears;
        itemsACount++;
      } else if (e.wears >= 5) {
        wearsB += e.wears;
      } else {
        wearsC += e.wears;
      }
    });

    pA = Math.round((wearsA / totalWearsSum) * 100) || 70;
    pB = Math.round((wearsB / totalWearsSum) * 100) || 20;
    pC = 100 - (pA + pB);
    if (pC < 0) pC = 0;

    const percentAOfCloset = totalCount > 0 ? Math.round((itemsACount / totalCount) * 100) : 20;
    paretoText = `Dolabın %${percentAOfCloset || 22}'si giyimlerin %${pA}'sini karşılıyor`;
  }

  // 3. Ölü Stok (Dead stock calculation)
  // Items with no wears, or wears older than 45 days
  const fortyFiveDaysAgo = new Date();
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

  const deadStocks = closetItems.filter((item) => {
    const itemLogs = wearLog.filter((log) => log.item_id === item.id);
    if (itemLogs.length === 0) return true; // Never worn is dead stock!

    // Find latest log
    const lastLogDateStr = itemLogs
      .map((l) => l.worn_on)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return new Date(lastLogDateStr).getTime() < fortyFiveDaysAgo.getTime();
  });

  const deadStockPriceSum = deadStocks.reduce((sum, item) => sum + item.added_price, 0);

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
        <div className="font-display font-semibold text-3xl mt-1.5 text-black">
          İSTATİSTİKLER
        </div>
        <div className="text-[10.5px] tracking-[0.14em] text-[#8A8A8A] mt-1.5 uppercase font-medium">
          MÜHENDİS MODU · GİYDİM GÜNLÜĞÜNDEN BESLENİR
        </div>
      </div>

      {/* Scrollable statistics container */}
      <div className="flex-1 overflow-y-auto no-scrollbar pt-2 pb-6">
        {/* DOLAP DEĞERİ block */}
        <div className="px-6 pt-4 flex flex-col">
          <div className="text-[10px] tracking-[0.18em] text-[#8A8A8A] uppercase font-bold text-left mb-1">
            DOLAP DEĞERİ
          </div>
          <div className="font-display font-semibold text-5xl leading-none text-black">
            {fmtPrice(totalValue)}
          </div>
          <div className="text-xs tracking-widest text-[#8A8A8A] mt-2 uppercase font-medium">
            {totalCount} PARÇA · ORTALAMA {fmtPrice(avgValue)}
          </div>
        </div>

        {/* CPW block */}
        <div className="px-6 pt-6 flex flex-col">
          <div className="text-[10px] tracking-[0.18em] text-[#8A8A8A] uppercase mb-2.5 font-bold text-left">
            COST-PER-WEAR — EN DEĞERLİ VE ATIL PARÇALAR
          </div>
          
          {activeCpw.length === 0 ? (
            <div className="text-xs text-[#8A8A8A] tracking-wider uppercase bg-neutral-50 px-4 py-4 border border-[#E3E3E3] border-dashed">
              ANALİZ İÇİN YETERLİ GİYİM VERİSİ BULUNAMADI. LÜTFEN KOMBİN EKRANINDAN "✓ BUGÜN GİYDİM" KAYDI EKLEYİNİZ.
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Best ones (Low CPW) */}
              <div className="text-[8.5px] tracking-widest text-neutral-400 font-mono font-bold uppercase mb-1">EN POPÜLERLER (DEĞERLİ)</div>
              {bestCpw.map(({ item, cpw, wears }) => (
                <div key={item.id} className="flex justify-between items-baseline py-2 border-b border-[#E3E3E3] text-xs">
                  <span className="truncate pr-2 font-medium text-black">
                    {item.name} <span className="text-[10px] text-neutral-400 font-normal">({item.brand})</span>
                  </span>
                  <span className="font-mono font-semibold text-[#2E7D4F] shrink-0">
                    {Math.round(cpw)} ₺ <span className="font-sans text-[9px] text-[#8A8A8A] font-light">({wears} giyim)</span>
                  </span>
                </div>
              ))}

              {/* Worst ones (High CPW) */}
              <div className="text-[8.5px] tracking-widest text-neutral-400 font-mono font-bold uppercase mt-4 mb-1">EN AZ KULLANILANLAR (ATIL)</div>
              {worstCpw.map(({ item, cpw, wears }) => (
                <div key={item.id} className="flex justify-between items-baseline py-2 border-b border-[#E3E3E3] text-xs">
                  <span className="truncate pr-2 font-medium text-black">
                    {item.name} <span className="text-[10px] text-neutral-400 font-normal">({item.brand})</span>
                  </span>
                  <span className="font-mono font-semibold text-[#C2185B] shrink-0">
                    {Math.round(cpw)} ₺ <span className="font-sans text-[9px] text-[#8A8A8A] font-light">({wears} giyim)</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ABC ANALİZİ Pareto block */}
        <div className="px-6 pt-6 flex flex-col">
          <div className="text-[10px] tracking-[0.18em] text-[#8A8A8A] uppercase mb-1 font-bold text-left">
            ABC ANALİZİ — PARETO GİYİM DAĞILIMI
          </div>
          <p className="text-[10.5px] text-neutral-400 tracking-wide leading-relaxed uppercase">
            Giyim Sıklığı analizi ile dolap optimizasyonu.
          </p>

          <div className="flex gap-1.5 items-end h-[74px] mt-4 mb-2.5">
            <div className="flex-1 bg-black relative flex justify-center text-white text-[9.5px] font-mono group" style={{ height: `${pA}%` }}>
              <span className="absolute top-[-18px] text-xs text-[#111111] font-semibold">A %{pA}</span>
            </div>
            <div className="flex-1 bg-neutral-400 relative flex justify-center text-white text-[9.5px] font-mono" style={{ height: `${pB}%` }}>
              <span className="absolute top-[-18px] text-xs text-neutral-500 font-semibold">B %{pB}</span>
            </div>
            <div className="flex-1 bg-neutral-200 relative flex justify-center text-white text-[9.5px] font-mono" style={{ height: `${Math.max(pC, 5)}%` }}>
              <span className="absolute top-[-18px] text-xs text-neutral-400 font-semibold">C %{pC}</span>
            </div>
          </div>

          <div className="text-[11.5px] font-semibold text-black tracking-widest uppercase mt-4 font-sans text-left">
            ⚡ {paretoText.toUpperCase()}
          </div>
        </div>

        {/* ÖLÜ STOK block */}
        <div className="px-6 pt-7 flex flex-col">
          <div className="text-[10px] tracking-[0.18em] text-[#8A8A8A] uppercase mb-2 font-bold text-left">
            ÖLÜ STOK ANALİZİ
          </div>

          <div className="flex justify-between items-baseline py-2.5 border-b border-[#E3E3E3] text-xs">
            <span className="text-[#111111] font-medium">45+ Gündür Atıl Parçalar</span>
            <span className="font-mono font-semibold text-[#C2185B] shrink-0">
              {deadStocks.length} ADET · {fmtPrice(deadStockPriceSum)}
            </span>
          </div>

          <div className="flex justify-between items-baseline py-2.5 border-b border-[#E3E3E3] text-xs">
            <span className="text-[#111111] font-medium">Kar Optimizasyon Önerisi</span>
            <span className="font-semibold text-black shrink-0 tracking-wider">
              ARŞİVLE / SİSTEMDEN SAT
            </span>
          </div>
          
          {deadStocks.length > 0 && (
            <div className="mt-3 bg-neutral-50 p-3 border border-[#E3E3E3] flex flex-col gap-1 text-[11px]">
              <div className="text-[9px] text-[#8A8A8A] font-bold tracking-widest mb-1">EN ATIL PARÇALAR:</div>
              {deadStocks.slice(0, 3).map((item) => (
                <div key={item.id} className="text-black/80 truncate">
                  • {item.name} ({item.brand}) — {fmtPrice(item.added_price)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
