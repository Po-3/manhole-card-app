import { useState, useEffect, useMemo } from "react";

// カード型
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

  // フィルターUI
  const [pref, setPref] = useState("すべて");
  const [series, setSeries] = useState("すべて");
  const [search, setSearch] = useState("");

  // カード取得
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then((data: Card[]) => setCards(data));
  }, []);

  // フィルタ適用
  const filtered = useMemo(() => {
    return cards.filter(card =>
      (pref === "すべて" || card.prefecture === pref) &&
      (series === "すべて" || card.series === series) &&
      (
        !search ||
        card.city.includes(search) ||
        card.distributionPlace.includes(search) ||
        card.id.includes(search)
      )
    );
  }, [cards, pref, series, search]);

  // プルダウン用都道府県・弾リスト
  const prefList = useMemo(
    () => ["すべて", ...Array.from(new Set(cards.map(c => c.prefecture))).filter(Boolean)],
    [cards]
  );
  const seriesList = useMemo(
    () => ["すべて", ...Array.from(new Set(cards.map(c => c.series))).filter(Boolean)],
    [cards]
  );

  // 進捗
  const total = cards.length;
  const ownedCount = owned.size;
  const coordCount = coord.size;
  const percent = total ? Math.round((ownedCount / total) * 100) : 0;
  const percentCoord = total ? Math.round((coordCount / total) * 100) : 0;

  // チェック切替
  const toggle = (id: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // スライド前後
  const prevCard = () => setSelected(i => (i && i > 0 ? i - 1 : 0));
  const nextCard = () => setSelected(i => (i !== null && i < filtered.length - 1 ? i + 1 : i));

  // GKP公式
  const getGkpUrl = (card: Card) => `https://www.gkpm.jp/manholecard/${card.id.replace(/-/g, "")}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7fafc] to-[#fff4fa] flex flex-col pb-16 w-full max-w-[520px] mx-auto">
      {/* サマリー */}
      <header className="py-3 px-3 border-b bg-white sticky top-0 z-10">
        <div className="text-2xl font-black mb-2">マンホールカード</div>
        <div className="flex justify-around items-end mb-1">
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
            <div className="text-xs text-gray-500">座標蓋</div>
            <div className="text-xl font-bold">{coordCount}</div>
            <div className="text-xs text-gray-400">{percentCoord}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <select value={pref} onChange={e => setPref(e.target.value)}
            className="px-2 py-1 rounded border text-sm bg-[#f6f8ff]">
            {prefList.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={series} onChange={e => setSeries(e.target.value)}
            className="px-2 py-1 rounded border text-sm bg-[#f6f8ff]">
            {seriesList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1 rounded border text-sm bg-[#f6f8ff]"
            placeholder="市町村・配布場所"
          />
        </div>
      </header>

      {/* カードリスト */}
      <main className="flex-1 overflow-y-auto px-1 pb-20 bg-white">
        {filtered.map((card, i) => (
          <div
            key={card.id}
            className="flex flex-row items-center border-b py-2 px-1 hover:bg-gray-50 cursor-pointer transition w-full"
            onClick={() => setSelected(i)}
            style={{ minWidth: 0 }}
          >
            <img
              src={card.imageUrl}
              alt=""
              className="w-14 h-18 object-contain rounded bg-gray-100 border mr-2 flex-shrink-0"
              style={{ width: 52, height: 72 }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{card.city}</div>
              <div className="text-xs text-gray-500 truncate">{card.distributionPlace}</div>
              <div className="text-xs text-gray-400">{card.id}</div>
            </div>
            <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
              <label className="flex items-center text-xs font-bold text-blue-500">
                <input type="checkbox" checked={owned.has(card.id)} onChange={e => { e.stopPropagation(); toggle(card.id, setOwned); }} onClick={e => e.stopPropagation()} />
                カード
              </label>
              <label className="flex items-center text-xs font-bold text-green-500">
                <input type="checkbox" checked={coord.has(card.id)} onChange={e => { e.stopPropagation(); toggle(card.id, setCoord); }} onClick={e => e.stopPropagation()} />
                座標蓋
              </label>
            </div>
          </div>
        ))}
        {!filtered.length &&
          <div className="text-center text-gray-400 py-12">カードが見つかりません</div>
        }
      </main>

      {/* 詳細ポップアップ */}
      {selected !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-4 w-[98vw] max-w-lg mx-2 relative animate-fadeIn" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-3 text-3xl text-gray-400 font-bold" onClick={() => setSelected(null)}>&times;</button>
            <button className="absolute left-1 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-blue-100 text-xl px-2 py-1 rounded-full shadow"
              disabled={selected === 0}
              onClick={prevCard}
            >◀</button>
            <button className="absolute right-1 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-blue-100 text-xl px-2 py-1 rounded-full shadow"
              disabled={selected === filtered.length - 1}
              onClick={nextCard}
            >▶</button>
            <div className="flex gap-4 flex-row items-center">
              <img src={filtered[selected].imageUrl} alt="" className="w-28 h-36 object-contain rounded-lg border shadow" />
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="text-xs font-bold text-white bg-blue-700 rounded px-2 py-1 inline-block mb-1">{filtered[selected].series}</div>
                <div className="font-bold text-lg mb-1">{filtered[selected].city}</div>
                <div className="text-xs text-gray-600 mb-1">都道府県: {filtered[selected].prefecture}</div>
                <div className="text-xs text-gray-500 mb-1">カードID: {filtered[selected].id}</div>
                <div className="text-xs text-gray-700 mb-1">配布場所: {filtered[selected].distributionPlace}</div>
                <a href={getGkpUrl(filtered[selected])} className="text-xs text-blue-600 underline" target="_blank" rel="noopener noreferrer">GKP公式ページ</a>
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">座標</span>
                <span className="text-xs">{filtered[selected].latitude}, {filtered[selected].longitude}</span>
              </div>
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${filtered[selected].latitude},${filtered[selected].longitude}&zoom=15&size=350x120&markers=color:red%7C${filtered[selected].latitude},${filtered[selected].longitude}&key=YOUR_API_KEY`}
                alt="地図"
                className="rounded-lg w-full object-cover mb-1"
                style={{ minWidth: "240px", maxHeight: "120px" }}
                onError={e => ((e.target as HTMLImageElement).src = "/samplemap.jpg")}
              />
            </div>
            <div className="flex gap-6 mt-3 justify-center">
              <label className="flex items-center text-sm font-bold text-blue-500">
                <input type="checkbox" checked={owned.has(filtered[selected].id)} onChange={() => toggle(filtered[selected].id, setOwned)} />
                <span className="ml-1">カード</span>
              </label>
              <label className="flex items-center text-sm font-bold text-green-500">
                <input type="checkbox" checked={coord.has(filtered[selected].id)} onChange={() => toggle(filtered[selected].id, setCoord)} />
                <span className="ml-1">座標蓋</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}