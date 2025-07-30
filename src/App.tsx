import { useState, useEffect } from "react";

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

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [coord, setCoord] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);

  const [filterPref, setFilterPref] = useState("ALL");
  const [filterSeries, setFilterSeries] = useState("ALL");

  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then((data: Card[]) => setCards(data));
  }, []);

  // プルダウン選択肢
  const prefs = Array.from(new Set(cards.map(c => c.prefecture).filter(Boolean))).sort();
  const seriesList = Array.from(new Set(cards.map(c => c.series).filter(Boolean))).sort();

  // フィルター
  let filtered = cards;
  if (filterPref !== "ALL") filtered = filtered.filter(c => c.prefecture === filterPref);
  if (filterSeries !== "ALL") filtered = filtered.filter(c => c.series === filterSeries);

  // 進捗
  const total = filtered.length;
  const ownedCount = filtered.filter(c => owned.has(c.id)).length;
  const coordCount = filtered.filter(c => coord.has(c.id)).length;
  const percent = total ? Math.round((ownedCount / total) * 100) : 0;
  const percentCoord = total ? Math.round((coordCount / total) * 100) : 0;

  // チェック操作
  const toggle = (id: string, set: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    set(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // GKPリンク
  const getGKPlink = (c: Card) =>
    `https://www.gkpbusiness.jp/search/detail.php?code=${c.jisCode}`;

  // Google Mapsリンク
  const getMapsLink = (c: Card) =>
    `https://www.google.com/maps?q=${c.latitude},${c.longitude}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-pink-50 flex flex-col pb-16 w-full max-w-md mx-auto">
      {/* アプリ名＋進捗バー */}
      <header className="py-3 px-4 border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="font-black text-lg mb-2 text-center tracking-tight">マンホールカード管理</div>
        <div className="flex justify-between items-end gap-2">
          <div className="text-center flex-1">
            <div className="text-xs text-gray-500">カード</div>
            <div className="text-xl font-bold">{ownedCount} / {total}</div>
            <div className="text-xs text-gray-400">{percent}%</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-xs text-gray-500">座標蓋</div>
            <div className="text-xl font-bold">{coordCount}</div>
            <div className="text-xs text-gray-400">{percentCoord}%</div>
          </div>
        </div>
      </header>

      {/* プルダウン */}
      <div className="flex gap-2 px-3 py-2 bg-white sticky top-[61px] z-10">
        <select value={filterPref} onChange={e => setFilterPref(e.target.value)} className="flex-1 p-2 rounded border border-gray-300 bg-white shadow-sm text-sm">
          <option value="ALL">都道府県すべて</option>
          {prefs.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterSeries} onChange={e => setFilterSeries(e.target.value)} className="flex-1 p-2 rounded border border-gray-300 bg-white shadow-sm text-sm">
          <option value="ALL">弾（シリーズ）すべて</option>
          {seriesList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* カード一覧（2列グリッド） */}
      <main className="flex-1 bg-transparent overflow-y-auto px-2">
        <div className="grid grid-cols-2 gap-3 pt-3">
          {filtered.map((card, i) => (
            <div
              key={card.id}
              className="bg-white rounded-xl shadow hover:shadow-lg p-2 flex flex-col items-center cursor-pointer transition group border"
              onClick={() => setSelected(i)}
            >
              <img src={card.imageUrl} alt="" className="w-20 h-28 object-contain rounded mb-2 bg-gray-50 border" />
              <div className="text-center w-full">
                <div className="font-bold text-[15px] truncate">{card.city}</div>
                <div className="text-xs text-gray-400 truncate">{card.details}</div>
              </div>
              <div className="flex gap-2 mt-1">
                <span className={`text-[11px] font-bold px-1 rounded ${owned.has(card.id) ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-400'}`}>所有</span>
                <span className={`text-[11px] font-bold px-1 rounded ${coord.has(card.id) ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-400'}`}>座標蓋</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* リッチポップアップ */}
      {selected !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-[92vw] relative animate-fadein" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-3 text-3xl text-gray-400 font-bold" onClick={() => setSelected(null)}>&times;</button>
            <div className="flex gap-4">
              <img src={filtered[selected].imageUrl} alt="" className="w-24 h-32 object-contain rounded-lg border bg-gray-50" />
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="text-xs font-bold text-white bg-blue-500 rounded px-2 py-1 inline-block mb-1">{filtered[selected].series}</div>
                <div className="font-bold text-lg">{filtered[selected].city}</div>
                <div className="text-xs text-gray-400">{filtered[selected].details}</div>
                <div className="text-xs text-gray-600 truncate">{filtered[selected].distributionPlace}</div>
                <div className="flex gap-3 mt-2">
                  <label className="flex items-center gap-1 text-xs font-bold text-blue-600">
                    <input type="checkbox" checked={owned.has(filtered[selected].id)} onChange={() => toggle(filtered[selected].id, setOwned)} />
                    所有
                  </label>
                  <label className="flex items-center gap-1 text-xs font-bold text-green-600">
                    <input type="checkbox" checked={coord.has(filtered[selected].id)} onChange={() => toggle(filtered[selected].id, setCoord)} />
                    座標蓋
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <a href={getMapsLink(filtered[selected])} target="_blank" className="text-sm text-blue-600 underline font-semibold">Google Mapsで見る</a>
              <a href={getGKPlink(filtered[selected])} target="_blank" className="text-sm text-orange-600 underline font-semibold">GKP公式サイト</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}