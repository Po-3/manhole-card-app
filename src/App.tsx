// src/App.tsx
import { useState, useEffect } from "react";

// --- 型定義 ---
type CardType = "通常" | "特別" | "英語" | "その他";
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
  type: CardType;
  // option: ユーザー撮影座標・撮影写真へのパス・メモも拡張可能
};

const TABS = ["カード", "進捗", "地図", "写真"];
const CARD_TYPES: CardType[] = ["通常", "特別", "英語", "その他"];

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [shot, setShot] = useState<Set<string>>(new Set()); // 実物（座標豚）撮影
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState(TABS[0]);

  // --- 絞り込み ---
  const [filterPref, setFilterPref] = useState("");
  const [filterSeries, setFilterSeries] = useState("");
  const [filterType, setFilterType] = useState<CardType | "">("");
  const [filterStatus, setFilterStatus] = useState<"all"|"owned"|"unowned">("all");
  const [filterShot, setFilterShot] = useState<"all"|"shot"|"unshot">("all");
  const [search, setSearch] = useState("");

  // --- データ読込 ---
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then((data: Card[]) => setCards(data));
  }, []);

  // --- マスター抽出 ---
  const allPrefs = Array.from(new Set(cards.map(c => c.prefecture))).filter(x => x);
  const allSeries = Array.from(new Set(cards.map(c => c.series))).filter(x => x);

  // --- 絞り込み ---
  const filtered = cards.filter(card =>
    (!filterPref || card.prefecture === filterPref) &&
    (!filterSeries || card.series === filterSeries) &&
    (!filterType || card.type === filterType) &&
    (filterStatus === "all" || (filterStatus === "owned" ? owned.has(card.id) : !owned.has(card.id))) &&
    (filterShot === "all" || (filterShot === "shot" ? shot.has(card.id) : !shot.has(card.id))) &&
    (!search || (card.city + card.id + card.details + card.distributionPlace).toLowerCase().includes(search.toLowerCase()))
  );

  // --- 進捗 ---
  const total = cards.length;
  const ownedCount = owned.size;
  const shotCount = shot.size;
  const percent = total ? Math.round((ownedCount / total) * 100) : 0;
  const percentShot = total ? Math.round((shotCount / total) * 100) : 0;

  // --- 所持・撮影チェック操作 ---
  const toggleOwned = (id: string) => setOwned(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleShot = (id: string) => setShot(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  // --- 前後カード ---
  const prevCard = () => setSelected(i => (i !== null && i > 0 ? i - 1 : i));
  const nextCard = () => setSelected(i => (i !== null && i < filtered.length - 1 ? i + 1 : i));

  // --- カードタイプカラー ---
  const typeColor = (type: CardType | "") => {
    switch (type) {
      case "特別": return "bg-yellow-200 text-yellow-800";
      case "英語": return "bg-blue-200 text-blue-800";
      case "その他": return "bg-gray-200 text-gray-700";
      default: return "bg-green-100 text-green-700";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7fafc] to-[#fff4fa] flex flex-col pb-16 w-full max-w-[540px] mx-auto">
      {/* タブ */}
      <nav className="tab-nav">
        {TABS.map(t => (
          <button key={t} className={`tab-button${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>

      {/* --- サマリー＆フィルター --- */}
      {tab === "カード" && (
        <>
          {/* 進捗バー */}
          <div className="flex flex-col gap-2 px-3 py-2">
            <div className="flex justify-between">
              <div className="font-bold">所有: <span className="text-green-700">{ownedCount}</span> / {total} <span className="ml-2 text-gray-500 text-xs">({percent}%)</span></div>
              <div className="font-bold">座標豚: <span className="text-blue-700">{shotCount}</span> <span className="text-xs text-gray-500">({percentShot}%)</span></div>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-inner" style={{ width: `${percent}%` }} />
            </div>
            <div className="progress-bar bg-blue-100 mt-0">
              <div className="progress-bar-inner" style={{ background: "linear-gradient(90deg, #00c3ff 70%, #ffff1c 100%)", width: `${percentShot}%` }} />
            </div>
          </div>

          {/* 絞り込み */}
          <div className="flex flex-wrap gap-2 items-center px-2 py-2 mb-2">
            <select value={filterPref} onChange={e => setFilterPref(e.target.value)}><option value="">都道府県</option>{allPrefs.map(pref => <option key={pref}>{pref}</option>)}</select>
            <select value={filterSeries} onChange={e => setFilterSeries(e.target.value)}><option value="">弾（シリーズ）</option>{allSeries.map(series => <option key={series}>{series}</option>)}</select>
            <select value={filterType} onChange={e => setFilterType(e.target.value as CardType | "")}><option value="">カードタイプ</option>{CARD_TYPES.map(tp => <option key={tp}>{tp}</option>)}</select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}><option value="all">全て</option><option value="owned">所持のみ</option><option value="unowned">未所持のみ</option></select>
            <select value={filterShot} onChange={e => setFilterShot(e.target.value as any)}><option value="all">全て</option><option value="shot">撮影済み</option><option value="unshot">未撮影</option></select>
            <input type="search" placeholder="市区町村・番号" value={search} onChange={e => setSearch(e.target.value)} className="w-[110px]"/>
          </div>
        </>
      )}

      {/* --- カードリスト --- */}
      {tab === "カード" && (
        <main className="flex-1 overflow-y-auto px-1 pb-20 bg-white">
          {filtered.length === 0 && <div className="text-center text-gray-400 py-12">該当カードがありません</div>}
          {filtered.map((card, i) => (
            <div key={card.id} className="flex items-center border-b py-2 px-1 hover:bg-gray-50 cursor-pointer transition w-full" onClick={() => setSelected(i)}>
              {/* サムネイル */}
              <img src={card.imageUrl} alt="" className="w-16 h-22 object-contain rounded bg-gray-100 border mr-2 flex-shrink-0" style={{ width: 58, height: 80 }} />
              {/* 情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 items-center">
                  <span className="font-semibold text-sm truncate">{card.city}</span>
                  <span className={`text-xs px-2 py-0.5 ml-1 rounded-full ${typeColor(card.type)}`}>{card.type}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">{card.distributionPlace}</div>
                <div className="text-xs text-gray-400">{card.id}</div>
              </div>
              {/* チェック */}
              <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                <label className="flex items-center text-xs font-bold text-green-700">
                  <input type="checkbox" checked={owned.has(card.id)} onChange={e => {e.stopPropagation(); toggleOwned(card.id);}} onClick={e => e.stopPropagation()} />
                  所持
                </label>
                <label className="flex items-center text-xs font-bold text-blue-700">
                  <input type="checkbox" checked={shot.has(card.id)} onChange={e => {e.stopPropagation(); toggleShot(card.id);}} onClick={e => e.stopPropagation()} />
                  座標豚
                </label>
              </div>
            </div>
          ))}
        </main>
      )}

      {/* --- 詳細ポップアップ --- */}
      {selected !== null && filtered[selected] && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-4 w-[97vw] max-w-md mx-2 relative animate-fadeIn" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-3 text-3xl text-gray-400 font-bold" onClick={() => setSelected(null)}>&times;</button>
            <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-blue-100 text-xl px-2 py-1 rounded-full shadow" disabled={selected === 0} onClick={prevCard}>◀</button>
            <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-blue-100 text-xl px-2 py-1 rounded-full shadow" disabled={selected === filtered.length - 1} onClick={nextCard}>▶</button>
            <div className="flex gap-4 flex-row items-start mb-2">
              {/* 画像 */}
              <img src={filtered[selected].imageUrl} alt="" className="w-28 h-36 object-contain rounded-lg border shadow" />
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className={`text-xs font-bold rounded px-2 py-1 inline-block mb-1 ${typeColor(filtered[selected].type)}`}>{filtered[selected].series} / {filtered[selected].type}</div>
                <div className="font-bold text-lg">{filtered[selected].city}</div>
                <div className="text-xs text-gray-500">{filtered[selected].id}</div>
                <div className="text-xs text-gray-700 mb-1 truncate">{filtered[selected].distributionPlace}</div>
                <div className="text-xs text-gray-500">{filtered[selected].details}</div>
                <div className="text-[11px] text-gray-400">緯度: {filtered[selected].latitude}／経度: {filtered[selected].longitude}</div>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center text-xs font-bold text-green-700">
                    <input type="checkbox" checked={owned.has(filtered[selected].id)} onChange={() => toggleOwned(filtered[selected].id)} />
                    所持
                  </label>
                  <label className="flex items-center text-xs font-bold text-blue-700">
                    <input type="checkbox" checked={shot.has(filtered[selected].id)} onChange={() => toggleShot(filtered[selected].id)} />
                    座標豚
                  </label>
                </div>
              </div>
            </div>
            {/* 地図 */}
            <div className="my-2">
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${filtered[selected].latitude},${filtered[selected].longitude}&zoom=14&size=320x110&markers=color:green%7C${filtered[selected].latitude},${filtered[selected].longitude}&key=YOUR_API_KEY`}
                alt="地図"
                className="rounded-lg w-full object-cover mb-1"
                style={{ minWidth: "240px" }}
                onError={e => ((e.target as HTMLImageElement).src = "/samplemap.jpg")}
              />
              <div className="text-[11px] text-gray-500 text-center">{filtered[selected].prefecture} {filtered[selected].city}</div>
            </div>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 px-3 py-2 rounded mb-1 text-xs text-gray-700">
              <span className="font-bold text-yellow-700 mr-1">!</span>
              配布停止・場所変更に注意。<a href="https://www.gkpm.jp/" target="_blank" className="underline text-blue-700">公式で最新状況確認</a>
            </div>
          </div>
        </div>
      )}

      {/* --- 下部ナビ --- */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white flex justify-around items-center py-2 z-50 max-w-[540px] mx-auto">
        {TABS.map(t => (
          <button key={t} className={`flex flex-col items-center text-xs ${tab === t ? "text-blue-700 font-bold" : "text-gray-400"}`} onClick={() => setTab(t)}>
            <span>{t}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}