import { useState } from "react";
import { Item } from "../types";
import { TAXONOMY } from "../constants";

interface CategoryScreenProps {
  items: Item[];
  onNavigateToGrid: (category: string, subcategory: string | null) => void;
  onBackToHome: () => void;
}

export default function CategoryScreen({ items, onNavigateToGrid, onBackToHome }: CategoryScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const ownedItems = items.filter((i) => i.status === "closet");

  // Helper count function
  const countBy = (cat: string, sub?: string | null) => {
    return ownedItems.filter((i) => {
      const matchCat = cat === "TÜMÜ" || i.category === cat;
      const matchSub = !sub || i.subcategory === sub;
      return matchCat && matchSub;
    }).length;
  };

  if (!selectedCategory) {
    // Level 1: Main Category Selection
    return (
      <div className="flex-1 flex flex-col min-h-0 animate-fade">
        {/* HM Header style */}
        <div className="grid grid-cols-[60px_1fr_60px] items-center px-6 py-3.5 shrink-0 border-b border-neutral-100">
          <button onClick={onBackToHome} className="text-xl font-light cursor-pointer text-left">←</button>
          <span className="text-center text-xs tracking-[0.2em] font-medium text-black">KATEGORİLER</span>
          <span />
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="px-6 py-4 flex flex-col">
            {Object.keys(TAXONOMY).map((cat, i) => {
              const count = countBy(cat);
              return (
                <div
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="flex items-baseline gap-3.5 py-3 border-b border-neutral-100 hover:border-black cursor-pointer group"
                >
                  <span className="text-sm font-light text-neutral-400">0{i + 1}</span>
                  <span className="text-[17px] font-light tracking-widest group-hover:translate-x-1 transition-transform uppercase">{cat}</span>
                  <span className="text-[11px] text-neutral-400 font-mono tracking-widest ml-auto">
                    |{count}|
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Level 2: Subcategory Selection with Drill-down
  const subcategories = TAXONOMY[selectedCategory] || [];
  const totalCategoryCount = countBy(selectedCategory);

  return (
    <div className="flex-1 flex flex-col min-h-0 animate-fade">
      {/* HM Header style */}
      <div className="grid grid-cols-[60px_1fr_60px] items-center px-6 py-3.5 shrink-0 border-b border-neutral-100">
        <button onClick={() => setSelectedCategory(null)} className="text-xl font-light cursor-pointer text-left">←</button>
        <span className="text-center text-xs tracking-[0.16em] font-medium text-black uppercase">{selectedCategory}</span>
        <span />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-6 py-4 flex flex-col">
          {/* HEPSİNİ İNCELE option */}
          <div
            onClick={() => totalCategoryCount > 0 && onNavigateToGrid(selectedCategory, null)}
            className={`flex items-baseline gap-3.5 py-3 border-b border-neutral-100 ${
              totalCategoryCount > 0 ? "hover:border-black cursor-pointer group" : "opacity-40 cursor-not-allowed"
            }`}
          >
            <span className="text-[17px] font-medium tracking-widest uppercase">HEPSİNİ İNCELE</span>
            <span className="text-[11px] text-neutral-500 font-mono ml-auto">
              |{totalCategoryCount}|
            </span>
          </div>

          <div className="text-[10px] tracking-[0.18em] text-neutral-400 mt-5 mb-1.5 font-medium uppercase">
            ALT KATEGORİLER
          </div>

          {subcategories.map((sub) => {
            const count = countBy(selectedCategory, sub);
            const isEmpty = count === 0;

            return (
              <div
                key={sub}
                onClick={() => !isEmpty && onNavigateToGrid(selectedCategory, sub)}
                className={`flex items-baseline gap-3.5 py-3 border-b border-neutral-100 ${
                  isEmpty 
                    ? "cursor-default text-neutral-300" 
                    : "hover:border-black cursor-pointer group text-black"
                }`}
              >
                <span className={`text-[17px] font-light tracking-widest uppercase ${isEmpty ? "text-neutral-300" : "group-hover:translate-x-1 transition-transform"}`}>
                  {sub}
                </span>
                <span className={`text-[11px] font-mono ml-auto ${isEmpty ? "text-neutral-200" : "text-neutral-500"}`}>
                  |{count}|
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
