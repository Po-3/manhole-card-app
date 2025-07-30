import { useEffect, useState } from "react";

// 型定義
type Card = {
  id: string;
  series: string;
  imageUrl: string; // 画像URL
  prefecture: string;
  city: string;
  details: string;  // カードID
  // …他のプロパティもあれば追加OK
};

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [filter, setFilter] = useState("ALL");

  // JSONデータ取得
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then(setCards);
  }, []);

  // シリーズ一覧（例: ["ALL", "第26弾", ...]）
  const allSeries = ["ALL", ...Array.from(new Set(cards.map(c => c.series)).values())];

  // フィルタ処理
  const filtered = filter === "ALL"
    ? cards
    : cards.filter(card => card.series === filter);

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col font-sans">
      {/* ヘッダー */}
      <header className="flex items-center px-4 pt-4 pb-2">
        <span className="inline-flex items-center mr-2">
          <span className="bg-[#ededed] rounded-full p-2">
            <svg width="20" height="20"><circle cx="10" cy="10" r="8" fill="#ffa640" /></svg>
          </span>
          <span className="ml-2 text-[#FFA640] font-bold text-lg tracking-tight">ALL</span>
        </span>
        <div className="flex-1" />
        <span className="text-[#FFA640] font-extrabold text-xl">{filtered.length}</span>
        <span className="text-[#FFA640] font-bold text-base">/ {cards.length}</span>
      </header>

      {/* タブバー（シリーズごと） */}
      <div className="flex overflow-x-auto gap-1 px-3 pb-2">
        {allSeries.map(series => (
          <button
            key={series}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full font-bold mr-1 transition
              ${series === filter ? "bg-[#FFA640] text-white" : "bg-[#f5f5f5] text-[#FFA640]"}
              shadow-sm text-sm`}
            onClick={() => setFilter(series)}
          >{series}</button>
        ))}
      </div>

      {/* グリッド（スマホ4列風・PC可変） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-2 pb-12">
        {filtered.map((card) => (
          <div
            key={card.id}
            className="bg-[#FFA640] rounded-xl shadow-lg flex flex-col items-center py-2 px-1 relative min-h-[140px]"
          >
            {/* 弾数（左上） */}
            <span className="absolute left-2 top-2 text-white text-lg font-bold">{card.series.replace("第", "").replace("弾", "")}</span>
            {/* 画像 */}
            <div className="w-[80px] h-[60px] bg-white/70 rounded-md flex items-center justify-center my-2">
              {card.imageUrl
                ? <img src={card.imageUrl} alt={card.city} className="w-[60px] h-[60px] object-contain rounded" />
                : (
                  <svg width="36" height="36">
                    <circle cx="18" cy="18" r="14" fill="#fff" stroke="#FFA640" strokeWidth="3" />
                    <path d="M12 20 l6 6 l10 -12" stroke="#ddd" strokeWidth="3" fill="none" />
                  </svg>
                )}
            </div>
            {/* 都道府県・市 */}
            <div className="text-xs text-white font-bold">{card.prefecture} {card.city}</div>
            {/* カードID */}
            <div className="text-base text-white font-bold tracking-wide">{card.details}</div>
          </div>
        ))}
      </div>
    </div>
  );
}