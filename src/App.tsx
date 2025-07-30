import { useEffect, useState } from "react";

// カード型定義
type Card = {
  id: string;
  series: string;
  imageUrl: string;
  prefecture: string;
  city: string;
  jisCode: string;
  productNumber: string;
  latitude: number;
  longitude: number;
  details: string;
  genres: string[];
  distributionPlace: string;
};

// タブ名
const tabs = ["カード", "アイテム", "写真", "サマリー"];

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [real, setReal] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<number | null>(null); // indexで管理
  const [tab, setTab] = useState("カード");

  // データ読込
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then((data: Card[]) => setCards(data));
  }, []);

  // 進捗
  const total = cards.length;
  const ownedCount = owned.size;
  const realCount = real.size;
  const percent = total ? Math.round((ownedCount / total) * 100) : 0;
  const percentReal = total ? Math.round((realCount / total) * 100) : 0;

  // カード所持/実物切替
  const toggleOwned = (id: string) => {
    setOwned(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleReal = (id: string) => {
    setReal(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ページ送り
  const prevCard = () => setSelected(i => i !== null && i > 0 ? i - 1 : i);
  const nextCard = () => setSelected(i => i !== null && i < cards.length - 1 ? i + 1 : i);

  // フィルター等は必要に応じ追加可

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7fafc] to-[#fff4fa] flex flex-col pb-16 w-full max-w-[500px] mx-auto">
      {/* タブ */}
      <nav className="flex justify-between items-center px-1 py-2 gap-1 sticky top-0 bg-white z-10 border-b">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-bold rounded transition-all ${tab === t ? "bg-gradient-to-r from-blue-400 to-blue-700 text-white shadow" : "bg-gray-100 text-gray-500"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* サマリー進捗 */}
      {tab === "カード" && (
        <header className="pt-2 pb-2 px-2">
          <div className="flex justify-around items-end">
            <div className="text-center">
              <div className="text-xs text-gray-500">カード</div>
              <div className="text-xl font-bold">{ownedCount}</div>
              <div className="text-xs text-gray-400">{percent}%</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">計</div>
              <div className="text-xl font-bold">{total}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">実物</div>
              <div className="text-xl font-bold">{realCount}</div>
              <div className="text-xs text-gray-400">{percentReal}%</div>
            </div>
          </div>
        </header>
      )}

      {/* カードリスト */}
      {tab === "カード" && (
        <main className="flex-1 overflow-y-auto px-1 pb-20 bg-white">
          {cards.map((card, i) => (
            <div
              key={card.id}
              className="flex items-center border-b py-1 px-1 hover:bg-gray-50 cursor-pointer transition"
              onClick={() => setSelected(i)}
            >
              <img src={card.imageUrl} alt="" className="w-14 h-20 object-contain rounded bg-gray-100 mr-2 border" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{card.city}</div>
                <div className="text-xs text-gray-500 truncate">{card.distributionPlace}</div>
                <div className="text-xs text-gray-400">{card.id}</div>
              </div>
              <div className="flex flex-col items-end gap-1 ml-2">
                <label className="flex items-center text-xs font-bold text-blue-500">
                  <input type="checkbox" checked={owned.has(card.id)} onChange={e => {e.stopPropagation(); toggleOwned(card.id);}} onClick={e => e.stopPropagation()} />
                  所持
                </label>
                <label className="flex items-center text-xs font-bold text-pink-500">
                  <input type="checkbox" checked={real.has(card.id)} onChange={e => {e.stopPropagation(); toggleReal(card.id);}} onClick={e => e.stopPropagation()} />
                  実物
                </label>
              </div>
            </div>
          ))}
        </main>
      )}

      {/* 他タブの中身（仮） */}
      {tab !== "カード" && (
        <main className="flex-1 flex items-center justify-center text-gray-400 text-lg font-bold">
          {tab}は現在未対応です
        </main>
      )}

      {/* 下部ナビ */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white flex justify-around items-center py-2 z-50 max-w-[500px] mx-auto">
        {tabs.map(t => (
          <button
            key={t}
            className={`flex flex-col items-center text-xs ${tab === t ? "text-blue-700 font-bold" : "text-gray-400"}`}
            onClick={() => setTab(t)}
          >
            <span>{t}</span>
          </button>
        ))}
      </nav>

      {/* ポップアップ詳細（スライド・横並びUI・ページ送り） */}
      {selected !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-4 w-[97vw] max-w-md mx-2 relative" onClick={e => e.stopPropagation()}>
            {/* 閉じる */}
            <button className="absolute top-2 right-3 text-3xl text-gray-400 font-bold" onClick={() => setSelected(null)}>&times;</button>
            {/* 前・次 */}
            <button
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-blue-100 text-xl px-2 py-1 rounded-full shadow"
              disabled={selected === 0}
              onClick={prevCard}
            >◀</button>
            <button
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-blue-100 text-xl px-2 py-1 rounded-full shadow"
              disabled={selected === cards.length - 1}
              onClick={nextCard}
            >▶</button>

            <div className="flex gap-3 flex-row items-start">
              {/* カード画像 */}
              <img src={cards[selected].imageUrl} alt="" className="w-24 h-32 object-contain rounded-lg border shadow" />

              {/* 情報 */}
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="text-xs font-bold text-white bg-green-600 rounded px-2 py-1 inline-block">{cards[selected].series}</div>
                <div className="font-bold text-lg">{cards[selected].city}</div>
                <div className="text-xs text-gray-500">{cards[selected].id}</div>
                <div className="text-xs text-gray-700 mb-1 truncate">{cards[selected].distributionPlace}</div>
                <div className="text-xs text-gray-500">{cards[selected].details}</div>
                <div className="text-[11px] text-gray-400">緯度: {cards[selected].latitude}／経度: {cards[selected].longitude}</div>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center text-xs font-bold text-blue-500">
                    <input type="checkbox" checked={owned.has(cards[selected].id)} onChange={() => toggleOwned(cards[selected].id)} />
                    所持
                  </label>
                  <label className="flex items-center text-xs font-bold text-pink-500">
                    <input type="checkbox" checked={real.has(cards[selected].id)} onChange={() => toggleReal(cards[selected].id)} />
                    実物
                  </label>
                </div>
              </div>
            </div>

            {/* 地図とボタン群 */}
            <div className="my-3">
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${cards[selected].latitude},${cards[selected].longitude}&zoom=13&size=320x110&markers=color:green%7C${cards[selected].latitude},${cards[selected].longitude}&key=YOUR_API_KEY`}
                alt="地図"
                className="rounded-lg w-full object-cover mb-1"
                style={{ minWidth: "240px" }}
                onError={e => ((e.target as HTMLImageElement).src = "/samplemap.jpg")}
              />
              <div className="text-[11px] text-gray-500 text-center">{cards[selected].prefecture} {cards[selected].city}</div>
            </div>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 px-3 py-2 rounded mb-3 text-xs text-gray-700">
              <span className="font-bold text-yellow-700 mr-1">!</span>
              カード配布の一時停止や変更がある場合があります。公式情報を必ずご確認下さい。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}