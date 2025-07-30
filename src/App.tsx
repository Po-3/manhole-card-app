import { useState, useEffect } from "react";

type Card = {
  id: string;
  series: string;
  imageUrl: string;
  prefecture: string;
  city: string;
  details: string;
  distributionPlace: string;
};

const filters = [
  { key: "ALL", label: "ALL" },
  { key: "OWNED", label: "取得済" },
  { key: "UNOWNED", label: "未取得" },
];

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [series, setSeries] = useState("ALL");

  // カードデータ読込
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then(setCards);
  }, []);

  // 弾リスト抽出
  const seriesList = [
    "ALL",
    ...Array.from(new Set(cards.map(c => c.series))).filter(Boolean).sort((a, b) => a.localeCompare(b, "ja"))
  ];

  // フィルタリング
  let filtered = cards;
  if (series !== "ALL") filtered = filtered.filter(c => c.series === series);
  if (filter === "OWNED") filtered = filtered.filter(c => owned.has(c.id));
  if (filter === "UNOWNED") filtered = filtered.filter(c => !owned.has(c.id));

  // 所有チェック
  const toggleOwned = (id: string) => {
    setOwned(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // モーダル用ページ送り
  const next = () => setModalIdx(i => (i! < filtered.length - 1 ? i! + 1 : i));
  const prev = () => setModalIdx(i => (i! > 0 ? i! - 1 : i));

  // 進捗
  const total = cards.length;
  const ownedCount = owned.size;

  return (
    <div className="min-h-screen bg-[#f8f5fa] pb-28">
      {/* ヘッダー */}
      <header className="sticky top-0 bg-white z-20 py-2 px-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="font-extrabold text-orange-500 text-xl flex items-center gap-1">
            <span className="inline-block w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">🛡️</span>
            ALL
          </div>
          <div className="font-extrabold text-orange-400 text-lg">{ownedCount} / {total}</div>
        </div>
        {/* フィルタボタン群 */}
        <div className="flex gap-1 mb-1 overflow-x-auto">
          {filters.map(f => (
            <button
              key={f.key}
              className={`px-4 py-1 rounded-full font-bold ${filter === f.key ? "bg-orange-400 text-white" : "bg-orange-50 text-orange-400"}`}
              onClick={() => setFilter(f.key)}
            >{f.label}</button>
          ))}
        </div>
        {/* 弾選択 */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {seriesList.map(s => (
            <button
              key={s}
              className={`px-4 py-1 rounded-full font-bold ${series === s ? "bg-blue-400 text-white" : "bg-blue-50 text-blue-400"}`}
              onClick={() => setSeries(s)}
            >{s.replace("第", "").replace("弾", "")}弾</button>
          ))}
        </div>
      </header>

      {/* カードグリッド */}
      <main className="px-2 pt-2">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((card, i) => (
            <button
              key={card.id}
              className="rounded-2xl bg-orange-400 text-white font-bold flex flex-col items-center shadow hover:shadow-lg transition relative"
              style={{ minHeight: 144 }}
              onClick={() => setModalIdx(i)}
            >
              <div className="text-xl pt-1">{card.series.replace("第", "").replace("弾", "")}</div>
              <div className="text-xs">{card.prefecture} {card.city}</div>
              <img src={card.imageUrl} alt="" className="bg-white rounded-lg w-16 h-16 object-contain my-1 shadow" />
              <div className="text-sm tracking-widest">{card.details}</div>
              <div className="absolute top-2 right-2">{owned.has(card.id) && "✔️"}</div>
            </button>
          ))}
        </div>
      </main>

      {/* 下部: 進捗 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white py-2 text-center shadow-inner z-50">
        <div className="text-xs text-orange-500 font-extrabold">進捗: {ownedCount} / {total}</div>
      </footer>

      {/* 詳細モーダル */}
      {modalIdx !== null && filtered[modalIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center"
          onClick={() => setModalIdx(null)}
        >
          <div
            className="w-full max-w-md mx-auto rounded-t-3xl p-5 bg-gradient-to-t from-orange-50 to-orange-200 shadow-2xl min-h-[38vh]"
            style={{ boxShadow: "0 -6px 24px #fd8  " }}
            onClick={e => e.stopPropagation()}
          >
            {/* スワイプバー */}
            <div className="w-14 h-1.5 bg-orange-300 rounded-full mx-auto mb-3" />
            {/* 弾・県・市・ID */}
            <div className="flex flex-col items-center">
              <div className="text-orange-600 text-lg font-extrabold mb-1">{filtered[modalIdx].series}</div>
              <div className="text-base font-bold">{filtered[modalIdx].prefecture} {filtered[modalIdx].city}</div>
              <div className="text-lg font-mono text-white bg-orange-400 px-4 py-1 rounded-2xl mt-1 mb-2 shadow">{filtered[modalIdx].details}</div>
            </div>
            {/* ボタン */}
            <div className="flex gap-3 justify-center mt-2 mb-3">
              <a
                href={`https://www.gkpm.jp/manhole_card/detail/?city_code=${filtered[modalIdx].id.slice(0, 5)}&product_number=${filtered[modalIdx].id.slice(6)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-orange-400 text-white rounded-xl px-4 py-2 text-sm font-bold shadow active:bg-orange-500"
              >配布状況</a>
              <button className="bg-orange-300 text-orange-900 rounded-xl px-4 py-2 text-sm font-bold shadow active:bg-orange-400">
                検索
              </button>
            </div>
            {/* 取得チェック */}
            <div className="flex gap-3 justify-center mb-2">
              <label className="flex items-center font-bold text-orange-700 text-base">
                <input
                  type="checkbox"
                  checked={owned.has(filtered[modalIdx].id)}
                  onChange={() => toggleOwned(filtered[modalIdx].id)}
                  className="w-5 h-5 mr-2"
                />
                取得済み
              </label>
            </div>
            {/* ページ送り */}
            <div className="flex items-center justify-center gap-4 text-lg font-mono mt-2">
              <button onClick={prev} disabled={modalIdx === 0} className="text-orange-400 disabled:text-gray-300">◀</button>
              <span className="text-orange-900">{modalIdx + 1} / {filtered.length}</span>
              <button onClick={next} disabled={modalIdx === filtered.length - 1} className="text-orange-400 disabled:text-gray-300">▶</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}