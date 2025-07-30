import { useEffect, useState } from "react";

// カード型
type Card = {
  id: string;
  series: string;
  imageUrl: string;
  prefecture: string;
  city: string;
  details: string;
};

const TABS = ["ALL", "お気に入り", "取得済", "未取得"];
const SERIES = ["すべて", "26", "25", "24", "23", "22", "21"]; // 実際はjsonから取得推奨

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [tab, setTab] = useState("ALL");
  const [series, setSeries] = useState("すべて");
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [favorite, setFavorite] = useState<Set<string>>(new Set());

  // データ読み込み
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then((data: Card[]) => setCards(data));
  }, []);

  // フィルタ
  let filtered = cards;
  if (series !== "すべて") filtered = filtered.filter(c => c.series.includes(series));
  if (tab === "取得済") filtered = filtered.filter(c => owned.has(c.id));
  if (tab === "未取得") filtered = filtered.filter(c => !owned.has(c.id));
  if (tab === "お気に入り") filtered = filtered.filter(c => favorite.has(c.id));
  // 地域は割愛

  // UI
  return (
    <div className="bg-[#f8f8fa] min-h-screen pb-2">
      {/* ヘッダー */}
      <div className="px-3 pt-3 flex flex-col items-center">
        <div className="flex w-full justify-between items-center mb-2">
          <span className="font-bold text-orange-500 text-lg">ALL</span>
          <span className="font-bold text-orange-500 text-xl">{owned.size} / {cards.length || 0}</span>
        </div>
        {/* 上部タブ */}
        <div className="flex gap-2 w-full justify-start mb-2">
          {TABS.map(t => (
            <button key={t}
              className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm transition 
                ${tab === t ? "bg-orange-400 text-white" : "bg-gray-100 text-gray-400"}`}
              onClick={() => setTab(t)}
            >{t}</button>
          ))}
        </div>
        {/* 弾シリーズタブ */}
        <div className="flex gap-2 w-full justify-start overflow-x-auto">
          {SERIES.map(s => (
            <button key={s}
              className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm transition
                ${series === s ? "bg-orange-400 text-white" : "bg-gray-100 text-gray-500"}`}
              onClick={() => setSeries(s)}
            >{s === "すべて" ? "ALL" : `第${s}弾`}</button>
          ))}
        </div>
      </div>
      {/* サムネイルグリッド */}
      <div className="grid grid-cols-2 gap-3 px-2 pt-4">
        {filtered.map(card => (
          <div key={card.id}
            className="flex flex-col items-center rounded-xl shadow border-2 border-orange-300 bg-white py-2 transition relative"
          >
            {/* シリーズ */}
            <span className="absolute top-2 left-2 bg-orange-400 text-white text-xs font-bold rounded px-1.5 py-0.5">{card.series.replace("第","").replace("弾","")}</span>
            {/* サムネイル */}
            <img src={card.imageUrl} alt={card.city} className="w-16 h-16 object-contain rounded-lg bg-gray-100 border mb-1" />
            {/* 県・市・ID */}
            <span className="text-[12px] font-bold text-orange-700 truncate w-full text-center">{card.prefecture}</span>
            <span className="text-[11px] text-gray-700 truncate w-full text-center">{card.city}</span>
            <span className="text-[10px] text-gray-500">{card.details}</span>
            {/* チェックマーク */}
            <div className="mt-1 flex gap-2">
              <button
                className="text-[18px] text-green-500"
                onClick={() => setOwned(prev => {
                  const next = new Set(prev);
                  next.has(card.id) ? next.delete(card.id) : next.add(card.id);
                  return next;
                })}
              >{owned.has(card.id) ? "✔️" : " "}</button>
              <button
                className="text-[18px] text-yellow-500"
                onClick={() => setFavorite(prev => {
                  const next = new Set(prev);
                  next.has(card.id) ? next.delete(card.id) : next.add(card.id);
                  return next;
                })}
              >{favorite.has(card.id) ? "★" : "☆"}</button>
            </div>
          </div>
        ))}
      </div>
      {/* 取得済ゼロ時 */}
      {!filtered.length && (
        <div className="text-center text-gray-400 py-10">カードが見つかりません</div>
      )}
    </div>
  );
}