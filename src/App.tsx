import { useState, useEffect, useRef } from "react";

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
  type?: string; // 通常・特別・英語など（拡張対応）
};

// プルダウン用ユニーク値取得
const unique = (arr: (string | undefined)[]) => [...new Set(arr.filter(Boolean))];

const tabs = ["カード", "進捗", "地図", "写真"];

export default function App() {
  // State
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [real, setReal] = useState<Set<string>>(new Set());
  const [coord, setCoord] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<number | null>(null); // index
  const [tab, setTab] = useState("カード");

  // フィルター
  const [filterPref, setFilterPref] = useState("全て");
  const [filterSeries, setFilterSeries] = useState("全て");
  const [filterType, setFilterType] = useState("全て");
  const [search, setSearch] = useState("");

  // データ取得＋localStorage反映
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then((data: Card[]) => setCards(data));
    setOwned(new Set(JSON.parse(localStorage.getItem("owned") || "[]")));
    setReal(new Set(JSON.parse(localStorage.getItem("real") || "[]")));
    setCoord(new Set(JSON.parse(localStorage.getItem("coord") || "[]")));
  }, []);

  // 保存
  useEffect(() => {
    localStorage.setItem("owned", JSON.stringify(Array.from(owned)));
    localStorage.setItem("real", JSON.stringify(Array.from(real)));
    localStorage.setItem("coord", JSON.stringify(Array.from(coord)));
  }, [owned, real, coord]);

  // 検索・絞り込み
  const filtered = cards.filter(card => {
    if (filterPref !== "全て" && card.prefecture !== filterPref) return false;
    if (filterSeries !== "全て" && card.series !== filterSeries) return false;
    if (filterType !== "全て" && card.type !== filterType) return false;
    if (search && !(
      card.city.includes(search) ||
      card.id.includes(search) ||
      card.distributionPlace?.includes(search)
    )) return false;
    return true;
  });

  // プルダウン候補
  const prefs = ["全て", ...unique(cards.map(c => c.prefecture))];
  const seriesList = ["全て", ...unique(cards.map(c => c.series))];
  const typeList = ["全て", ...unique(cards.map(c => c.type || "通常"))];

  // 進捗
  const total = cards.length;
  const ownedCount = owned.size;
  const realCount = real.size;
  const coordCount = coord.size;
  const percent = total ? Math.round((ownedCount / total) * 100) : 0;
  const percentReal = total ? Math.round((realCount / total) * 100) : 0;
  const percentCoord = total ? Math.round((coordCount / total) * 100) : 0;

  // チェック操作
const toggle = (id: string, setter: any) => {
  setter((prev: Set<string>) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
};

  // カード前後
  const prevCard = () => setSelected(i => (i !== null && i > 0 ? i - 1 : i));
  const nextCard = () => setSelected(i => (i !== null && i < filtered.length - 1 ? i + 1 : i));

  // スワイプで左右切替
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      dx > 0 ? prevCard() : nextCard();
    }
    touchStartX.current = null;
  };

  // 地図画像生成
  const staticMap = (lat: number, lng: number) =>
    `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=13&size=340x120&markers=color:green%7C${lat},${lng}&key=YOUR_API_KEY`;

  // UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7fafc] to-[#fff4fa] flex flex-col pb-16 w-full max-w-[510px] mx-auto">
      {/* タブ */}
      <nav className="flex justify-between items-center px-1 py-2 gap-1 sticky top-0 bg-white z-10 border-b">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-bold rounded transition-all tab-button ${tab === t ? "active" : ""}`}
          >{t}</button>
        ))}
      </nav>

      {/* サマリー・進捗 */}
      {tab === "カード" && (
        <header className="pt-2 pb-2 px-2">
          <div className="flex justify-between items-end mb-1">
            <div>
              <span className="text-sm text-gray-500">所有:</span>
              <span className="ml-1 text-lg font-bold">{ownedCount} / {total} </span>
              <span className="text-xs text-gray-400">({percent}%)</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">座標蓋:</span>
              <span className="ml-1 text-lg font-bold">{coordCount}</span>
              <span className="text-xs text-gray-400">({percentCoord}%)</span>
            </div>
          </div>
          {/* 進捗バー */}
          <div className="progress-bar">
            <div className="progress-bar-inner" style={{ width: `${percent}%` }} />
          </div>
          <div className="progress-bar" style={{ background: "#e8b" }}>
            <div className="progress-bar-inner" style={{ width: `${percentCoord}%`, background: "linear-gradient(90deg,#fbd786 0%,#e8b 100%)" }} />
          </div>
        </header>
      )}

      {/* フィルター */}
      {tab === "カード" && (
        <div className="flex flex-wrap gap-1 px-2 pb-2">
          <select value={filterPref} onChange={e => setFilterPref(e.target.value)}>
            {prefs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterSeries} onChange={e => setFilterSeries(e.target.value)}>
            {seriesList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            {typeList.map(tp => <option key={tp} value={tp}>{tp}</option>)}
          </select>
          <input type="search" placeholder="市区町村やID" value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
        </div>
      )}

      {/* カードリスト */}
      {tab === "カード" && (
        <main className="flex-1 overflow-y-auto px-1 pb-20 bg-white">
          {filtered.length === 0 && (
            <div className="text-center text-gray-400 py-8">該当カードがありません</div>
          )}
          {filtered.map((card, i) => (
            <div
              key={card.id}
              className="flex flex-row items-center border-b py-2 px-1 hover:bg-gray-50 cursor-pointer transition w-full"
              onClick={() => setSelected(i)}
              style={{ minWidth: 0 }}
            >
              {/* サムネイル */}
              <img
                src={card.imageUrl}
                alt=""
                className="w-16 h-22 object-contain rounded bg-gray-100 border mr-2 flex-shrink-0 card-img"
                style={{ width: 66, height: 90 }}
              />
              {/* 情報 */}
              <div className="flex-1 min-w-0 card-info">
                <div className="font-semibold text-sm truncate">{card.city}</div>
                <span className="text-xs text-gray-500">{card.series} / {card.type || "通常"}</span>
                <span className="text-xs text-gray-400">{card.id}</span>
                <span className="text-xs">{card.distributionPlace}</span>
              </div>
              {/* チェック */}
              <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                <label className="flex items-center text-xs font-bold text-blue-500">
<input type="checkbox" checked={owned.has(card.id)} onChange={e => {e.stopPropagation(); toggle(card.id, setOwned);}} onClick={e => e.stopPropagation()} />
                  所持
                </label>
                <label className="flex items-center text-xs font-bold text-green-500">
<input type="checkbox" checked={coord.has(card.id)} onChange={e => {e.stopPropagation(); toggle(card.id, setCoord);}} onClick={e => e.stopPropagation()} />                  座標蓋
                </label>
              </div>
            </div>
          ))}
        </main>
      )}

      {/* 進捗タブ */}
      {tab === "進捗" && (
        <main className="flex-1 overflow-y-auto px-2 bg-white">
          <div className="mt-5 text-lg font-bold">あなたのマンホールカードコレクション進捗</div>
          <div className="my-4">
            <div>所有：{ownedCount} / {total}（{percent}%）</div>
            <div>座標蓋：{coordCount} / {total}（{percentCoord}%）</div>
            <div>実物GET：{realCount} / {total}（{percentReal}%）</div>
          </div>
          <div className="progress-bar"><div className="progress-bar-inner" style={{ width: `${percent}%` }} /></div>
          <div className="progress-bar" style={{ background: "#e8b" }}><div className="progress-bar-inner" style={{ width: `${percentCoord}%`, background: "linear-gradient(90deg,#fbd786 0%,#e8b 100%)" }} /></div>
          <div className="progress-bar" style={{ background: "#bbf" }}><div className="progress-bar-inner" style={{ width: `${percentReal}%`, background: "linear-gradient(90deg,#bbf 0%,#44f 100%)" }} /></div>
          <div className="mt-8 text-xs text-gray-500">シリーズや地域ごとの達成率やグラフ、バッジ解放も拡張可！</div>
        </main>
      )}

      {/* 地図タブ */}
      {tab === "地図" && (
        <main className="flex-1 overflow-y-auto px-2 bg-white">
          <div className="text-center my-4 font-bold text-lg">地図でコレクションを確認</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {filtered.slice(0, 10).map(card => (
              <div key={card.id} className="w-full max-w-xs bg-white rounded-lg shadow mb-3 p-2 flex flex-col items-center">
                <img src={card.imageUrl} alt="" className="w-20 h-28 object-contain mb-1" />
                <div className="text-xs font-bold">{card.city}</div>
                <img src={staticMap(card.latitude, card.longitude)} alt="地図" className="rounded-lg w-full object-cover mb-1" />
                <div className="text-xs text-gray-500">{card.distributionPlace}</div>
                <a className="mt-1 text-xs text-blue-500 underline" target="_blank" rel="noopener noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${card.latitude},${card.longitude}`}>Googleマップで開く</a>
              </div>
            ))}
            <div className="w-full text-xs text-gray-500 text-center mt-3">※全カードの地図表示は今後拡張！</div>
          </div>
        </main>
      )}

      {/* 写真タブ */}
      {tab === "写真" && (
        <main className="flex-1 flex items-center justify-center text-gray-400 text-lg font-bold">
          写真機能は今後追加予定です！
        </main>
      )}

      {/* 詳細ポップアップ */}
      {selected !== null && filtered[selected] && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl p-4 w-[97vw] max-w-md mx-2 relative"
            onClick={e => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* 閉じる */}
            <button className="absolute top-2 right-3 text-3xl text-gray-400 font-bold" onClick={() => setSelected(null)}>&times;</button>
            {/* 前・次 */}
            <button
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-blue-100 text-xl px-2 py-1 rounded-full shadow"
              disabled={selected === 0}
              onClick={prevCard}
              style={{ zIndex: 2 }}
            >◀</button>
            <button
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-gray-100 hover:bg-blue-100 text-xl px-2 py-1 rounded-full shadow"
              disabled={selected === filtered.length - 1}
              onClick={nextCard}
              style={{ zIndex: 2 }}
            >▶</button>

            <div className="flex gap-3 flex-row items-start">
              {/* カード画像 */}
              <img src={filtered[selected].imageUrl} alt="" className="w-24 h-32 object-contain rounded-lg border shadow" />
              {/* 情報 */}
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="text-xs font-bold text-white bg-green-600 rounded px-2 py-1 inline-block">{filtered[selected].series}</div>
                <div className="font-bold text-lg">{filtered[selected].city}</div>
                <div className="text-xs text-gray-500">{filtered[selected].id}</div>
                <div className="text-xs text-gray-700 mb-1 truncate">{filtered[selected].distributionPlace}</div>
                <div className="text-xs text-gray-500">{filtered[selected].details}</div>
                <div className="text-[11px] text-gray-400">緯度: {filtered[selected].latitude}／経度: {filtered[selected].longitude}</div>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center text-xs font-bold text-blue-500">
<input
  type="checkbox"
  checked={owned.has(filtered[selected].id)}
  onChange={() => toggle(filtered[selected].id, setOwned)}
/>
所持

<input
  type="checkbox"
  checked={coord.has(filtered[selected].id)}
  onChange={() => toggle(filtered[selected].id, setCoord)}
/>
                    座標蓋
                  </label>
                </div>
                <div className="flex mt-2">
                  <a className="mr-3 text-xs text-blue-500 underline" target="_blank" rel="noopener noreferrer"
                    href={`https://www.google.com/maps/search/?api=1&query=${filtered[selected].latitude},${filtered[selected].longitude}`}>Googleマップでナビ</a>
                  <a className="text-xs text-blue-400 underline" href={`https://www.gk-p.jp/`} target="_blank" rel="noopener noreferrer">GKP公式</a>
                </div>
              </div>
            </div>
            <div className="my-3">
              <img
                src={staticMap(filtered[selected].latitude, filtered[selected].longitude)}
                alt="地図"
                className="rounded-lg w-full object-cover mb-1"
                style={{ minWidth: "240px" }}
                onError={e => ((e.target as HTMLImageElement).src = "/samplemap.jpg")}
              />
              <div className="text-[11px] text-gray-500 text-center">{filtered[selected].prefecture} {filtered[selected].city}</div>
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