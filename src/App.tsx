import React, { useEffect, useState } from "react";

// カード型
type Card = {
  id: string;            // 例: "03-216-B001"
  series: string;        // 例: "26"
  prefecture: string;    // 例: "岩手県"
  city: string;          // 例: "滝沢市"
  details: string;       // ID重複用
  imageUrl: string;      // サムネイル画像URL
};

const FILTERS = ["ALL", "取得済", "未取得"];
const STORAGE_KEY = "owned-manhole-cards";
const MEMO_KEY = "memo-manhole-cards";

const getInitialOwned = () => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return new Set<string>();
    return new Set(JSON.parse(s));
  } catch {
    return new Set<string>();
  }
};
const getInitialMemo = () => {
  try {
    const s = localStorage.getItem(MEMO_KEY);
    if (!s) return {};
    return JSON.parse(s);
  } catch {
    return {};
  }
};

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(getInitialOwned());
  const [filter, setFilter] = useState("ALL");
  const [series, setSeries] = useState<string>("ALL");
  const [popupIdx, setPopupIdx] = useState<number | null>(null);
  const [memo, setMemo] = useState<Record<string, string>>(getInitialMemo);

  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then((data: Card[]) => setCards(data));
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(owned)));
  }, [owned]);
  useEffect(() => {
    localStorage.setItem(MEMO_KEY, JSON.stringify(memo));
  }, [memo]);

  // シリーズ一覧
  const seriesList = Array.from(new Set(cards.map(c => c.series))).sort((a, b) => b.localeCompare(a, "ja"));

  // フィルタ
  let filtered = cards;
  if (series !== "ALL") filtered = filtered.filter(c => c.series === series);
  if (filter === "取得済") filtered = filtered.filter(c => owned.has(c.id));
  if (filter === "未取得") filtered = filtered.filter(c => !owned.has(c.id));
  filtered = filtered.slice().sort(
    (a, b) =>
      a.prefecture.localeCompare(b.prefecture, "ja") ||
      a.city.localeCompare(b.city, "ja") ||
      a.id.localeCompare(b.id, "ja")
  );

  const total = cards.length;
  const ownedCount = owned.size;

  // 2列グリッド
  function renderGrid() {
    const grid = [];
    for (let i = 0; i < filtered.length; i += 2) {
      grid.push(
        <div key={i} className="flex gap-3 w-full mb-3">
          {filtered.slice(i, i + 2).map((card, j) => (
            <CardBox
              key={card.id}
              card={card}
              owned={owned.has(card.id)}
              onCheck={() => toggleOwned(card.id)}
              onClick={() => setPopupIdx(i + j)}
            />
          ))}
          {/* 片側が空欄になる場合 */}
          {filtered.length % 2 === 1 && i + 1 === filtered.length && <div className="flex-1" />}
        </div>
      );
    }
    return grid;
  }

  const toggleOwned = (id: string) => {
    setOwned(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const setMemoFor = (id: string, value: string) => setMemo(prev => ({ ...prev, [id]: value }));

  // 詳細モーダル
  const showCard = popupIdx !== null && filtered[popupIdx];
  const card = showCard ? filtered[popupIdx!] : null;

  return (
    <div className="min-h-screen w-full max-w-[430px] mx-auto bg-[#fff6ec] font-sans">
      {/* ヘッダー */}
      <header className="pt-7 pb-2 px-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-7 h-7 rounded-full bg-[#E7E7E7] flex items-center justify-center">
            <svg width="23" height="23"><circle cx="12" cy="12" r="9" fill="#FFA740" /><text x="12" y="17" textAnchor="middle" fontSize="10" fill="#fff">⛲️</text></svg>
          </span>
          <span className="text-[#FFA740] font-black text-2xl tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            ALL
          </span>
          <span className="ml-auto font-bold text-[#FFA740] text-xl">{ownedCount} / {total}</span>
        </div>
        {/* フィルタタブ */}
        <div className="flex flex-row gap-1 mb-1">
          {FILTERS.map(t => (
            <button
              key={t}
              className={`rounded-full px-4 py-1 text-base font-bold ${filter === t ? "bg-[#FFA740] text-white" : "bg-gray-100 text-gray-500"}`}
              onClick={() => setFilter(t)}
            >{t}</button>
          ))}
        </div>
        {/* シリーズタブ（横スクロール） */}
        <div className="flex flex-row gap-1 overflow-x-auto pb-1 hide-scrollbar">
          <button
            className={`rounded-full px-4 py-1 text-base font-bold ${series === "ALL" ? "bg-[#FFA740] text-white" : "bg-gray-100 text-gray-500"}`}
            onClick={() => setSeries("ALL")}
          >ALL</button>
          {seriesList.map(s => (
            <button
              key={s}
              className={`rounded-full px-4 py-1 text-base font-bold ${series === s ? "bg-[#FFA740] text-white" : "bg-gray-100 text-gray-500"}`}
              onClick={() => setSeries(s)}
            >第{s}弾</button>
          ))}
        </div>
      </header>

      {/* カードグリッド */}
      <main className="px-2 pb-16">
        {renderGrid()}
        {!filtered.length && (
          <div className="text-center text-gray-400 py-10 text-lg">カードがありません</div>
        )}
      </main>

      {/* モーダル */}
      {showCard && card && (
        <Modal onClose={() => setPopupIdx(null)}>
          <div className="flex flex-col gap-2 px-1 py-2 items-center">
            <div className="text-[#FFA740] font-black text-lg mb-2">{card.series}／{card.prefecture}／{card.city}</div>
            <div className="text-lg font-mono text-gray-600 mb-1">{card.details}</div>
            <button
              onClick={() => toggleOwned(card.id)}
              className={`rounded-full w-14 h-14 flex items-center justify-center mb-2 shadow ${owned.has(card.id) ? "bg-[#FFA740]" : "bg-gray-200"}`}
            >
              {owned.has(card.id)
                ? <span className="text-white text-4xl font-black">✔️</span>
                : <span className="text-gray-400 text-4xl font-black">✔️</span>
              }
            </button>
            <textarea
              className="rounded border w-full p-2 text-base"
              placeholder="このカードの思い出やメモ"
              rows={3}
              value={memo[card.id] || ""}
              onChange={e => setMemoFor(card.id, e.target.value)}
              style={{ resize: "none" }}
            />
            <div className="flex justify-between items-center w-full mt-3">
              <button
                onClick={() => setPopupIdx(idx => idx! > 0 ? idx! - 1 : idx)}
                disabled={popupIdx === 0}
                className="px-2 py-1 text-2xl font-bold rounded text-[#FFA740] disabled:opacity-40"
              >{"<"}</button>
              <div className="text-base text-[#FFA740]">{popupIdx! + 1} / {filtered.length}</div>
              <button
                onClick={() => setPopupIdx(idx => idx! < filtered.length - 1 ? idx! + 1 : idx)}
                disabled={popupIdx === filtered.length - 1}
                className="px-2 py-1 text-2xl font-bold rounded text-[#FFA740] disabled:opacity-40"
              >{">"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---- カードボックス ----
function CardBox({
  card,
  owned,
  onCheck,
  onClick,
}: {
  card: Card;
  owned: boolean;
  onCheck: () => void;
  onClick: () => void;
}) {
  // 画像の“窓”部分だけ表示
  return (
    <div
      className="flex-1 flex flex-col items-center bg-white rounded-2xl shadow border cursor-pointer transition min-h-[176px] max-w-[172px] px-1 py-2"
      style={{
        borderColor: owned ? "#FFA740" : "#ddd",
        background: owned ? "#FFA74022" : "#fff",
        width: "172px", minWidth: "156px", maxWidth: "172px"
      }}
      onClick={onClick}
    >
      {/* 上部 */}
      <div className="w-full flex flex-row items-start justify-between px-1 pt-0.5 mb-1">
        <span className="font-bold text-[#FFA740] text-lg">{card.series}</span>
        <span className="font-bold text-[#FFA740] text-xs text-right leading-tight">{card.prefecture}<br />{card.city}</span>
      </div>
      {/* 画像“窓”部分（中央寄せて一部だけ見せる） */}
      <div className="relative w-[92px] h-[66px] rounded-xl bg-white overflow-hidden my-1 flex items-center justify-center">
        <img
          src={card.imageUrl}
          alt={card.details}
          className="object-cover w-[92px] h-[132px] translate-y-[-20px]"
        />
        {owned && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg width="36" height="36" fill="none" viewBox="0 0 38 38">
              <circle cx="19" cy="19" r="18" fill="#fff" fillOpacity="0.7" />
              <path d="M12 20l5 5 9-10" stroke="#FFA740" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
        )}
      </div>
      {/* カードID */}
      <div className="font-mono text-base text-gray-800 mt-1">{card.details}</div>
      {/* チェックボタン */}
      <button
        onClick={e => { e.stopPropagation(); onCheck(); }}
        className={`mt-1 w-full rounded-full py-1 font-bold ${owned ? "bg-[#FFA740] text-white" : "bg-gray-100 text-gray-500"}`}
      >
        {owned ? "取得済み" : "未取得"}
      </button>
    </div>
  );
}

// ---- モーダル ----
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end z-50" onClick={onClose}>
      <div className="w-full bg-white rounded-t-2xl pb-4 pt-2 px-3 max-h-[94vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="w-14 h-1 bg-[#FFA74099] rounded-full mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
}