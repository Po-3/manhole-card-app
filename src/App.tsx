import { useEffect, useState } from "react";
import "./index.css";

// --- 型定義 ---
type Card = {
  id: string;
  series: string;
  imageUrl: string;
  prefecture: string;
  city: string;
  type: string; // 例: "通常", "特別", "英語", "その他"
  latitude: number;
  longitude: number;
  distributionPlace: string;
};

const TABS = ["カード", "進捗", "地図", "写真", "設定"];

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [coord, setCoord] = useState<Set<string>>(new Set());
  const [favorite, setFavorite] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState(TABS[0]);
  const [search, setSearch] = useState("");
  const [filterPref, setFilterPref] = useState("全て");
  const [filterSeries, setFilterSeries] = useState("全て");
  const [filterType, setFilterType] = useState("全て");

  // --- データロード ---
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then(data => setCards(data));
  }, []);

  // --- 動的プルダウン用 ---
  const allPrefs = ["全て", ...Array.from(new Set(cards.map(c => c.prefecture).filter(Boolean)))];
  const allSeries = ["全て", ...Array.from(new Set(cards.map(c => c.series).filter(Boolean)))];
  const allTypes = ["全て", ...Array.from(new Set(cards.map(c => c.type || "通常").filter(Boolean)))];

  // --- フィルタ適用 ---
  const filteredCards = cards.filter(card =>
    (filterPref === "全て" || card.prefecture === filterPref) &&
    (filterSeries === "全て" || card.series === filterSeries) &&
    (filterType === "全て" || (card.type || "通常") === filterType) &&
    (!search || card.city.includes(search) || card.id.includes(search) || (card.distributionPlace || "").includes(search))
  );

  // --- 進捗 ---
  const total = cards.length;
  const ownedCount = owned.size;
  const coordCount = coord.size;
  const percentOwned = total ? Math.round((ownedCount / total) * 100) : 0;
  const percentCoord = total ? Math.round((coordCount / total) * 100) : 0;

  // --- 状態トグル ---
  const toggleOwned = (id: string) => setOwned(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCoord = (id: string) => setCoord(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFavorite = (id: string) => setFavorite(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // --- 詳細カード切替 ---
  const prevCard = () => setSelected(i => (i && i > 0 ? i - 1 : 0));
  const nextCard = () => setSelected(i => (i !== null && i < filteredCards.length - 1 ? i + 1 : i));

  // --- メインUI ---
  return (
    <div id="root" className="max-w-[600px] mx-auto p-2 bg-gradient-to-br from-[#f7fafc] to-[#fff4fa] min-h-screen">
      {/* タブナビ */}
      <nav className="tab-nav mb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab-button${tab === t ? " active" : ""}`}>{t}</button>
        ))}
      </nav>

      {/* サマリー/進捗 */}
      {tab === "カード" && (
        <div className="flex flex-col gap-1 mb-2">
          <div className="flex justify-between items-end text-sm px-1">
            <span>所有: <b>{ownedCount}</b> / {total}（<b>{percentOwned}%</b>）</span>
            <span>座標豚: <b>{coordCount}</b>（<b>{percentCoord}%</b>）</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-inner" style={{ width: `${percentOwned}%` }} />
          </div>
          <div className="progress-bar" style={{ background: "#fbd786" }}>
            <div className="progress-bar-inner" style={{ width: `${percentCoord}%`, background: "#ffb700" }} />
          </div>
        </div>
      )}

      {/* 絞り込み */}
      {tab === "カード" && (
        <div className="flex flex-wrap gap-2 mb-2">
          <select value={filterPref} onChange={e => setFilterPref(e.target.value)}>
            {allPrefs.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={filterSeries} onChange={e => setFilterSeries(e.target.value)}>
            {allSeries.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            {allTypes.map(t => <option key={t}>{t}</option>)}
          </select>
          <input
            type="search"
            className="flex-1 min-w-[60px]"
            placeholder="市区町村/番号/住所"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* カードリスト */}
      {tab === "カード" && (
        <main className="card-list flex flex-col gap-2">
          {filteredCards.map((card, i) => (
            <div className="card-box flex items-center rounded bg-white shadow-sm px-2 py-1" key={card.id}>
              <img src={card.imageUrl} className="card-img mr-2 cursor-pointer" alt="" onClick={() => setSelected(i)} />
              <div className="card-info flex-1 min-w-0" onClick={() => setSelected(i)}>
                <b className="text-sm">{card.city}</b>
                <span className="text-xs text-gray-500 ml-2">{card.series}</span>
                <span className="block text-xs">{card.id}</span>
                <span className="block text-xs text-gray-500 truncate">{card.distributionPlace}</span>
                <span className="block text-xs text-gray-400">{card.type || "通常"}</span>
              </div>
              <div className="flex flex-col items-end gap-1 ml-2">
                <label className="flex items-center text-xs font-bold text-blue-500">
                  <input type="checkbox" checked={owned.has(card.id)} onChange={() => toggleOwned(card.id)} />
                  所持
                </label>
                <label className="flex items-center text-xs font-bold text-yellow-600">
                  <input type="checkbox" checked={coord.has(card.id)} onChange={() => toggleCoord(card.id)} />
                  座標豚
                </label>
                <button onClick={() => toggleFavorite(card.id)} className="text-xl mt-1">{favorite.has(card.id) ? "★" : "☆"}</button>
              </div>
            </div>
          ))}
        </main>
      )}

      {/* 他タブ：進捗・地図・写真・設定 */}
      {tab === "進捗" && (
        <main className="py-8 text-center text-xl text-blue-600 font-bold">
          {/* グラフやバッジ表示、ランキングなども追加可能 */}
          <div className="mb-3">進捗グラフや獲得バッジはここに！</div>
          <div>所持: {ownedCount} / {total} ({percentOwned}%)<br />座標豚: {coordCount} ({percentCoord}%)</div>
        </main>
      )}
      {tab === "地図" && (
        <main className="py-8 text-center text-xl text-blue-600 font-bold">
          <div className="mb-2">Google/OSM地図でピン表示！</div>
          <div className="text-xs text-gray-500">（実装例略。Google StaticMap, OSM API連携で簡単に実装可）</div>
        </main>
      )}
      {tab === "写真" && (
        <main className="py-8 text-center text-lg text-gray-600 font-bold">
          座標豚カードの写真アルバム（カメラ/アップロード機能追加可）
        </main>
      )}
      {tab === "設定" && (
        <main className="py-8 text-center text-lg text-gray-700 font-bold">
          テーマ・バックアップ・インポート・エクスポート機能（カスタム実装例）
        </main>
      )}

      {/* カード詳細ポップアップ */}
      {selected !== null && (
        <div className="modal-bg" onClick={() => setSelected(null)}>
          <div className="modal-box bg-white rounded-xl shadow-xl p-5 w-[98vw] max-w-xl mx-auto relative" onClick={e => e.stopPropagation()}>
            <button className="modal-close absolute top-2 right-3 text-3xl text-gray-400" onClick={() => setSelected(null)}>×</button>
            {/* 前後カード */}
            <button className="absolute left-1 top-1/2 -translate-y-1/2 bg-gray-200 text-xl rounded-full px-3 py-1 shadow" onClick={prevCard} disabled={selected === 0}>◀</button>
            <button className="absolute right-1 top-1/2 -translate-y-1/2 bg-gray-200 text-xl rounded-full px-3 py-1 shadow" onClick={nextCard} disabled={selected === filteredCards.length - 1}>▶</button>
            <div className="flex gap-3 items-start">
              <img src={filteredCards[selected].imageUrl} className="w-28 h-40 object-contain rounded-lg border" alt="" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-white bg-green-600 rounded px-2 py-1 inline-block mb-1">{filteredCards[selected].series}</div>
                <div className="font-bold text-lg">{filteredCards[selected].city}</div>
                <div className="text-xs text-gray-500">{filteredCards[selected].id}</div>
                <div className="text-xs text-gray-700 mb-1 truncate">{filteredCards[selected].distributionPlace}</div>
                <div className="text-xs text-gray-500">{filteredCards[selected].type || "通常"}</div>
                <div className="text-xs text-gray-400">緯度: {filteredCards[selected].latitude} ／ 経度: {filteredCards[selected].longitude}</div>
                <div className="flex gap-3 mt-2">
                  <label className="flex items-center text-xs font-bold text-blue-500">
                    <input type="checkbox" checked={owned.has(filteredCards[selected].id)} onChange={() => toggleOwned(filteredCards[selected].id)} />
                    所持
                  </label>
                  <label className="flex items-center text-xs font-bold text-yellow-600">
                    <input type="checkbox" checked={coord.has(filteredCards[selected].id)} onChange={() => toggleCoord(filteredCards[selected].id)} />
                    座標豚
                  </label>
                  <button onClick={() => toggleFavorite(filteredCards[selected].id)} className="text-lg">{favorite.has(filteredCards[selected].id) ? "★お気に入り" : "☆"}</button>
                </div>
              </div>
            </div>
            {/* 地図サムネ */}
            <div className="mt-3">
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${filteredCards[selected].latitude},${filteredCards[selected].longitude}&zoom=14&size=340x120&markers=color:red|${filteredCards[selected].latitude},${filteredCards[selected].longitude}&key=YOUR_GOOGLE_MAPS_KEY`}
                className="rounded shadow"
                alt="map"
                onError={e => ((e.target as HTMLImageElement).src = "/samplemap.jpg")}
              />
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">※配布状況は事前にご確認を！</div>
          </div>
        </div>
      )}
    </div>
  );
}