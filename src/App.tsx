import { useEffect, useState } from "react";

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

const defaultPref = "すべて";
const defaultSeries = "すべて";

// 例: jsonに series: "第１２弾" のようなデータがあればOK
const getSeriesList = (cards: Card[]) =>
  Array.from(new Set(cards.map(c => c.series))).filter(Boolean).sort((a, b) => a.localeCompare(b, "ja"));

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [coord, setCoord] = useState<Set<string>>(new Set());
  const [memo, setMemo] = useState<Record<string, string>>({});
  const [popupIdx, setPopupIdx] = useState<number | null>(null);

  // 絞り込み用
  const [prefFilter, setPrefFilter] = useState(defaultPref);
  const [seriesFilter, setSeriesFilter] = useState(defaultSeries);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"都道府県順" | "シリーズ順" | "未取得優先">("都道府県順");

  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then((data: Card[]) => setCards(data));
  }, []);

  // プルダウン用
  const prefectures = Array.from(new Set(cards.map(c => c.prefecture || "不明"))).filter(Boolean).sort((a, b) => a.localeCompare(b, "ja"));
  const seriesList = getSeriesList(cards);

  // フィルタ処理
  let filtered = cards;
  if (prefFilter !== defaultPref) filtered = filtered.filter(c => c.prefecture === prefFilter);
  if (seriesFilter !== defaultSeries) filtered = filtered.filter(c => c.series === seriesFilter);
  if (search) {
    const s = search.trim();
    filtered = filtered.filter(
      c =>
        c.city.includes(s) ||
        c.details.includes(s) ||
        c.distributionPlace.includes(s)
    );
  }
  if (sortBy === "都道府県順") filtered = filtered.slice().sort((a, b) => a.prefecture.localeCompare(b.prefecture, "ja") || a.city.localeCompare(b.city, "ja"));
  if (sortBy === "シリーズ順") filtered = filtered.slice().sort((a, b) => a.series.localeCompare(b.series, "ja") || a.city.localeCompare(b.city, "ja"));
  if (sortBy === "未取得優先") filtered = filtered.slice().sort((a, b) => (owned.has(a.id) ? 1 : -1) - (owned.has(b.id) ? 1 : -1));

  // 進捗計算
  const total = cards.length;
  const ownedCount = owned.size;
  const coordCount = coord.size;
  const percent = total ? Math.round((ownedCount / total) * 100) : 0;
  const percentCoord = total ? Math.round((coordCount / total) * 100) : 0;

  // チェック処理
  const toggle = (id: string, current: Set<string>, setter: any) => {
    setter((prev: Set<string>) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // メモ保存
  const setMemoFor = (id: string, value: string) => setMemo(prev => ({ ...prev, [id]: value }));

  // Google Maps静止画像URL（APIキーなければ差し替えOK）
  const mapUrl = (lat: number, lng: number) =>
    `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=400x160&markers=color:orange%7C${lat},${lng}&key=YOUR_API_KEY`;

  // GKPサイトリンク（仮/パターン調整）
  const gkpLink = (card: Card) =>
    `https://www.gkpm.jp/manhole_card/detail/?city_code=${card.jisCode}&product_number=${card.productNumber}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7fafc] to-[#fff4fa] flex flex-col pb-16 w-full max-w-[500px] mx-auto">
      {/* ヘッダー */}
      <header className="py-3 px-2 sticky top-0 bg-white z-20 shadow-sm">
        <div className="flex flex-col items-center mb-2">
          <h1 className="font-black text-2xl tracking-tight">マンホールカード管理</h1>
          <div className="w-full bg-gray-200 rounded-full h-3 mt-2 mb-1 relative overflow-hidden">
            <div className="bg-blue-400 h-3 rounded-full transition-all" style={{ width: percent + "%" }} />
            <span className="absolute right-3 top-0.5 text-xs font-bold text-gray-700">{percent}%</span>
          </div>
          <div className="flex gap-4 text-xs mt-1">
            <span>所有 {ownedCount}/{total}</span>
            <span>座標蓋 {coordCount}/{total}</span>
          </div>
        </div>
        {/* 絞り込み */}
        <div className="flex gap-2 flex-wrap items-center justify-between mt-2">
          <select value={prefFilter} onChange={e => setPrefFilter(e.target.value)} className="rounded px-2 py-1 border text-xs">
            <option>{defaultPref}</option>
            {prefectures.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={seriesFilter} onChange={e => setSeriesFilter(e.target.value)} className="rounded px-2 py-1 border text-xs">
            <option>{defaultSeries}</option>
            {seriesList.map(s => <option key={s}>{s}</option>)}
          </select>
          <input type="search" placeholder="市区町村・配布地など" value={search} onChange={e => setSearch(e.target.value)} className="rounded px-2 py-1 border text-xs w-[120px]" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="rounded px-2 py-1 border text-xs">
            <option>都道府県順</option>
            <option>シリーズ順</option>
            <option>未取得優先</option>
          </select>
        </div>
      </header>

      {/* サムネイル一覧 */}
      <main className="flex-1 bg-white px-1 pt-1 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((card, i) => (
            <button
              key={card.id}
              className="bg-white rounded-xl shadow border hover:shadow-lg transition flex flex-col items-center pb-2 pt-2 px-1"
              onClick={() => setPopupIdx(i)}
              style={{ minWidth: 0 }}
            >
              <img src={card.imageUrl} alt="" className="w-16 h-22 object-contain rounded bg-gray-100 border" style={{ width: 66, height: 90 }} />
              <span className="text-[10px] text-gray-500 truncate w-full mt-0.5">{card.city}</span>
              <span className="text-[10px] text-gray-400">{card.series}</span>
              <span className="text-xs font-bold text-blue-500">{owned.has(card.id) ? "✔️" : ""}</span>
              <span className="text-xs font-bold text-green-500">{coord.has(card.id) ? "🟢" : ""}</span>
            </button>
          ))}
        </div>
        {!filtered.length && (
          <div className="text-center text-gray-400 py-12">該当するカードがありません</div>
        )}
      </main>

      {/* ポップアップ */}
      {popupIdx !== null && filtered[popupIdx] && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setPopupIdx(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-[96vw] max-w-md mx-2 relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-3 text-3xl text-gray-400 font-bold" onClick={() => setPopupIdx(null)}>&times;</button>
            {/* 前・次 */}
            <button
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-blue-100 text-xl px-2 py-1 rounded-full shadow"
              disabled={popupIdx === 0}
              onClick={() => setPopupIdx(idx => (idx! > 0 ? idx! - 1 : idx))}
            >◀</button>
            <button
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-blue-100 text-xl px-2 py-1 rounded-full shadow"
              disabled={popupIdx === filtered.length - 1}
              onClick={() => setPopupIdx(idx => (idx! < filtered.length - 1 ? idx! + 1 : idx))}
            >▶</button>

            <div className="flex gap-3 flex-row items-start">
              {/* 画像 */}
              <img src={filtered[popupIdx].imageUrl} alt="" className="w-24 h-32 object-contain rounded-lg border shadow" />
              {/* 情報 */}
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="text-xs font-bold text-white bg-green-600 rounded px-2 py-1 inline-block">{filtered[popupIdx].series}</div>
                <div className="font-bold text-lg">{filtered[popupIdx].city}</div>
                <div className="text-xs text-gray-700">カードID: <span className="font-mono">{filtered[popupIdx].details}</span></div>
                <div className="text-xs text-gray-700 truncate mb-1">配布場所: {filtered[popupIdx].distributionPlace}</div>
                <div className="text-xs text-gray-500">座標: {filtered[popupIdx].latitude}, {filtered[popupIdx].longitude}</div>
                <div className="flex gap-2 mt-2">
                  <label className="flex items-center text-xs font-bold text-blue-500">
                    <input type="checkbox" checked={owned.has(filtered[popupIdx].id)} onChange={() => toggle(filtered[popupIdx].id, owned, setOwned)} />
                    所有
                  </label>
                  <label className="flex items-center text-xs font-bold text-green-500">
                    <input type="checkbox" checked={coord.has(filtered[popupIdx].id)} onChange={() => toggle(filtered[popupIdx].id, coord, setCoord)} />
                    座標蓋
                  </label>
                </div>
                {/* GKPリンク/Googleマップ */}
                <div className="flex gap-2 mt-2 items-center">
                  <a href={gkpLink(filtered[popupIdx])} target="_blank" rel="noopener noreferrer" className="underline text-blue-700 text-xs font-bold">GKP公式</a>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${filtered[popupIdx].latitude},${filtered[popupIdx].longitude}`} target="_blank" rel="noopener noreferrer" className="underline text-green-700 text-xs font-bold">GoogleMap</a>
                </div>
                {/* メモ */}
                <textarea
                  className="rounded border mt-2 text-xs px-2 py-1"
                  placeholder="このカードの思い出やメモ"
                  rows={2}
                  value={memo[filtered[popupIdx].id] || ""}
                  onChange={e => setMemoFor(filtered[popupIdx].id, e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            {/* Google Static Map or ダミー画像 */}
            <div className="my-3">
              <img
                src={mapUrl(filtered[popupIdx].latitude, filtered[popupIdx].longitude)}
                alt="地図"
                className="rounded-lg w-full object-cover mb-1"
                style={{ minWidth: "240px", maxHeight: 120 }}
                onError={e => ((e.target as HTMLImageElement).src = "/samplemap.jpg")}
              />
            </div>
            <div className="text-[11px] text-gray-500 text-center">{filtered[popupIdx].prefecture} {filtered[popupIdx].city}</div>
          </div>
        </div>
      )}
    </div>
  );
}