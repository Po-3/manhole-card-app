// src/App.tsx
import { useState, useEffect, useMemo } from "react";

// --- 型定義 ---
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

type TabType = "カード" | "地図" | "進捗" | "写真";

// --- 都道府県、弾、タイプ取得 ---
const getAllPrefectures = (cards: Card[]) => [...new Set(cards.map(c => c.prefecture).filter(Boolean))];
const getAllSeries = (cards: Card[]) => [...new Set(cards.map(c => c.series).filter(Boolean))];
const getAllTypes = (cards: Card[]) => {
  let all = new Set<string>();
  for (const c of cards) {
    if (c.genres) c.genres.forEach(g => all.add(g));
  }
  return [...all];
};

export default function App() {
  // --- 状態管理 ---
  const [cards, setCards] = useState<Card[]>([]);
  const [tab, setTab] = useState<TabType>("カード");
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [coord, setCoord] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<number | null>(null); // index in filtered
  const [filterPref, setFilterPref] = useState<string>("全て");
  const [filterSeries, setFilterSeries] = useState<string>("全て");
  const [filterType, setFilterType] = useState<string>("全て");
  const [search, setSearch] = useState<string>("");

  // --- データ読込 ---
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then(setCards);
    // 所持・座標豚はLocalStorage自動復元
    setOwned(new Set(JSON.parse(localStorage.getItem("owned") ?? "[]")));
    setCoord(new Set(JSON.parse(localStorage.getItem("coord") ?? "[]")));
  }, []);
  useEffect(() => {
    localStorage.setItem("owned", JSON.stringify(Array.from(owned)));
  }, [owned]);
  useEffect(() => {
    localStorage.setItem("coord", JSON.stringify(Array.from(coord)));
  }, [coord]);

  // --- 選択肢 ---
  const allPref = useMemo(() => ["全て", ...getAllPrefectures(cards)], [cards]);
  const allSeries = useMemo(() => ["全て", ...getAllSeries(cards)], [cards]);
  const allTypes = useMemo(() => ["全て", ...getAllTypes(cards)], [cards]);

  // --- 絞り込み ---
  const filtered = useMemo(() => {
    return cards.filter(c =>
      (filterPref === "全て" || c.prefecture === filterPref) &&
      (filterSeries === "全て" || c.series === filterSeries) &&
      (filterType === "全て" || c.genres?.includes(filterType)) &&
      (search === "" ||
        c.city.includes(search) ||
        c.id.includes(search) ||
        c.details.includes(search) ||
        c.distributionPlace?.includes(search))
    );
  }, [cards, filterPref, filterSeries, filterType, search]);

  // --- 進捗計算 ---
  const total = cards.length;
  const totalFiltered = filtered.length;
  const ownedCount = owned.size;
  const coordCount = coord.size;
  const ownedPercent = total ? Math.round((ownedCount / total) * 100) : 0;
  const coordPercent = total ? Math.round((coordCount / total) * 100) : 0;

  // --- チェックボックス操作 ---
  const toggle = (id: string, current: Set<string>, setter: any) => {
    setter((prev: Set<string>) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // --- ページ送り ---
  const prevCard = () => setSelected(i => i && i > 0 ? i - 1 : i);
  const nextCard = () => setSelected(i => i !== null && i < filtered.length - 1 ? i + 1 : i);

  // --- 実装ここから ---
  return (
    <div id="root" className="min-h-screen flex flex-col items-center bg-gradient-to-br from-[#f5f7fa] to-[#ffe7fa] pb-20 w-full">
      {/* タブ */}
      <nav className="tab-nav w-full max-w-[500px] sticky top-0 z-30 bg-[#f5f7fa] flex">
        {(["カード", "進捗", "地図", "写真"] as TabType[]).map(t => (
          <button key={t} className={`tab-button ${tab === t ? "active" : ""} flex-1`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      {/* サマリー・フィルター */}
      {tab === "カード" && (
        <header className="w-full max-w-[500px] px-2 py-1 mb-2">
          <div className="flex flex-row flex-wrap gap-2 mb-2">
            <span className="font-semibold">所有: {ownedCount} / {total}（{ownedPercent}%）</span>
            <span className="font-semibold">座標豚: {coordCount}（{coordPercent}%）</span>
            <span className="font-semibold">表示: {totalFiltered}</span>
          </div>
          <div className="flex gap-2 flex-wrap mb-1">
            <select value={filterPref} onChange={e => setFilterPref(e.target.value)}>{allPref.map(x => <option key={x}>{x}</option>)}</select>
            <select value={filterSeries} onChange={e => setFilterSeries(e.target.value)}>{allSeries.map(x => <option key={x}>{x}</option>)}</select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>{allTypes.map(x => <option key={x}>{x}</option>)}</select>
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="市区町村・ID・場所" />
          </div>
        </header>
      )}

      {/* カードリスト */}
      {tab === "カード" && (
        <main className="flex-1 w-full max-w-[500px] overflow-y-auto">
          <div>
            {filtered.map((card, i) => (
              <div key={card.id}
                className="flex items-center border-b py-1 px-1 gap-2 hover:bg-[#f6f7ff] cursor-pointer"
                onClick={() => setSelected(i)}
                style={{ minWidth: 0 }}>
                <img src={card.imageUrl} alt="" className="card-img rounded bg-gray-100 border shadow mr-1" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{card.city}</div>
                  <div className="text-xs text-gray-500 truncate">{card.distributionPlace}</div>
                  <div className="text-xs text-gray-400">{card.id}</div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <label className="flex items-center text-xs font-bold text-blue-500">
                    <input type="checkbox" checked={owned.has(card.id)} onChange={e => { e.stopPropagation(); toggle(card.id, owned, setOwned); }} onClick={e => e.stopPropagation()} />
                    所持
                  </label>
                  <label className="flex items-center text-xs font-bold text-green-500">
                    <input type="checkbox" checked={coord.has(card.id)} onChange={e => { e.stopPropagation(); toggle(card.id, coord, setCoord); }} onClick={e => e.stopPropagation()} />
                    座標豚
                  </label>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* 進捗タブ */}
      {tab === "進捗" && (
        <main className="w-full max-w-[500px] flex flex-col items-center px-2 py-3 gap-5">
          <h2 className="font-bold text-lg mb-1">進捗サマリー</h2>
          <div className="w-full bg-white rounded shadow p-3">
            <div>全カード：{total}枚</div>
            <div>所持カード：{ownedCount}枚（{ownedPercent}%）</div>
            <div className="progress-bar"><div className="progress-bar-inner" style={{ width: `${ownedPercent}%` }} /></div>
            <div>座標豚済み：{coordCount}枚（{coordPercent}%）</div>
            <div className="progress-bar"><div className="progress-bar-inner" style={{ width: `${coordPercent}%`, background: "#57b846" }} /></div>
          </div>
          {/* 都道府県別進捗 */}
          <div className="w-full">
            <h3 className="font-bold text-md my-1">都道府県別進捗</h3>
            <div className="flex flex-col gap-1 max-h-[220px] overflow-auto">
              {allPref.slice(1).map(pref => {
                const prefCards = cards.filter(c => c.prefecture === pref);
                const own = prefCards.filter(c => owned.has(c.id)).length;
                const coorded = prefCards.filter(c => coord.has(c.id)).length;
                return (
                  <div key={pref} className="flex gap-2 items-center">
                    <span className="w-18 text-xs">{pref}</span>
                    <span className="text-xs">{own}/{prefCards.length} 所持</span>
                    <span className="text-xs">{coorded} 座標豚</span>
                    <div className="flex-1 progress-bar" style={{ maxWidth: 100 }}>
                      <div className="progress-bar-inner" style={{ width: `${prefCards.length ? own / prefCards.length * 100 : 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* 地図タブ */}
      {tab === "地図" && (
        <main className="w-full max-w-[500px] flex flex-col items-center px-2 py-4 gap-3">
          <h2 className="font-bold text-lg mb-2">地図ビュー</h2>
          <div className="w-full bg-white p-3 rounded shadow flex flex-col items-center">
            <img
              src={`https://maps.googleapis.com/maps/api/staticmap?center=35.68,139.76&zoom=4&size=420x210&key=YOUR_API_KEY&markers=${Array.from(owned).slice(0, 10).map(id => {
                const c = cards.find(c => c.id === id);
                return c ? `${c.latitude},${c.longitude}` : '';
              }).join('|')}`}
              alt="全国地図"
              className="w-full rounded"
            />
            <div className="text-xs text-gray-500 mt-1">
              ※10箇所のみ表示中。MAP拡張・ピン詳細化は将来対応
            </div>
          </div>
        </main>
      )}

      {/* 写真タブ（今は未対応UI） */}
      {tab === "写真" && (
        <main className="flex-1 flex items-center justify-center text-gray-400 text-lg font-bold w-full max-w-[500px]">
          写真管理は今後実装予定です
        </main>
      )}

      {/* --- カード詳細ポップアップ --- */}
      {selected !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-4 w-[97vw] max-w-md mx-2 relative" onClick={e => e.stopPropagation()}>
            {/* 閉じる */}
            <button className="absolute top-2 right-3 text-3xl text-gray-400 font-bold" onClick={() => setSelected(null)}>&times;</button>
            {/* 前・次 */}
            <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-blue-100 text-xl px-2 py-1 rounded-full shadow"
              disabled={selected === 0}
              onClick={prevCard}
            >◀</button>
            <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-blue-100 text-xl px-2 py-1 rounded-full shadow"
              disabled={selected === filtered.length - 1}
              onClick={nextCard}
            >▶</button>

            <div className="flex gap-3 flex-row items-start mt-2">
              {/* カード画像 */}
              <img src={filtered[selected].imageUrl} alt="" className="w-24 h-32 object-contain rounded-lg border shadow" />
              {/* 情報 */}
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="text-xs font-bold text-white bg-blue-700 rounded px-2 py-1 inline-block">{filtered[selected].series}</div>
                <div className="font-bold text-lg">{filtered[selected].city}</div>
                <div className="text-xs text-gray-400">{filtered[selected].id}</div>
                <div className="text-xs text-gray-500 mb-1 truncate">{filtered[selected].distributionPlace}</div>
                <div className="text-xs text-gray-500">{filtered[selected].details}</div>
                <div className="text-xs text-gray-500">座標: {filtered[selected].latitude},{filtered[selected].longitude}</div>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center text-xs font-bold text-blue-500">
                    <input type="checkbox" checked={owned.has(filtered[selected].id)} onChange={() => toggle(filtered[selected].id, owned, setOwned)} />
                    所持
                  </label>
                  <label className="flex items-center text-xs font-bold text-green-500">
                    <input type="checkbox" checked={coord.has(filtered[selected].id)} onChange={() => toggle(filtered[selected].id, coord, setCoord)} />
                    座標豚
                  </label>
                </div>
                {/* MAPリンク・公式等 */}
                <div className="flex gap-2 mt-2">
                  <a className="text-xs text-blue-600 underline" href={`https://www.google.com/maps?q=${filtered[selected].latitude},${filtered[selected].longitude}`} target="_blank" rel="noopener noreferrer">Googleマップ</a>
                  <a className="text-xs text-indigo-700 underline" href="https://www.gk-p.jp/" target="_blank" rel="noopener noreferrer">GKP公式</a>
                </div>
              </div>
            </div>
            {/* MAP */}
            <div className="mt-2 mb-2 rounded-lg overflow-hidden w-full">
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${filtered[selected].latitude},${filtered[selected].longitude}&zoom=15&size=320x110&markers=color:red%7C${filtered[selected].latitude},${filtered[selected].longitude}&key=YOUR_API_KEY`}
                alt="地図"
                className="rounded-lg w-full object-cover"
                onError={e => ((e.target as HTMLImageElement).src = "/samplemap.jpg")}
              />
            </div>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 px-3 py-2 rounded mb-2 text-xs text-gray-700 mt-1">
              <span className="font-bold text-yellow-700 mr-1">!</span>
              配布情報や地図位置は変わることがあります。公式情報を必ずご確認ください。
            </div>
          </div>
        </div>
      )}

      {/* --- 下部ナビ --- */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white flex justify-around items-center py-2 z-50 max-w-[500px] mx-auto">
        {(["カード", "進捗", "地図", "写真"] as TabType[]).map(t => (
          <button
            key={t}
            className={`flex flex-col items-center text-xs ${tab === t ? "text-blue-700 font-bold" : "text-gray-400"}`}
            onClick={() => setTab(t)}
          >
            <span>{t}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}