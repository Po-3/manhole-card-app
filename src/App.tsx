import React, { useEffect, useState } from "react";

// カード型
type Card = {
  id: string;
  series: string;
  imageUrl: string;
  prefecture: string;
  city: string;
  details: string;
  distributionPlace: string;
};

const FILTERS = ["ALL", "取得済", "未取得"];
const DUMMY_IMAGE = "/blank-card.svg"; // 無画像ダミー

const STORAGE_KEY = "owned-manhole-cards-v2";
const MEMO_KEY = "memo-manhole-cards-v2";

// 初期取得
const getInitialOwned = (): Set<string> => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return new Set();
    return new Set(JSON.parse(s) as string[]);
  } catch {
    return new Set();
  }
};
const getInitialMemo = (): Record<string, string> => {
  try {
    const s = localStorage.getItem(MEMO_KEY);
    if (!s) return {};
    return JSON.parse(s);
  } catch {
    return {};
  }
};

// 都道府県リスト
const getPrefList = (cards: Card[]) =>
  Array.from(new Set(cards.map(c => c.prefecture))).filter(Boolean).sort((a, b) => a.localeCompare(b, "ja"));
// 弾リスト
const getSeriesList = (cards: Card[]) =>
  Array.from(new Set(cards.map(c => c.series))).filter(Boolean).sort((a, b) => b.localeCompare(a, "ja"));

export default function App() {
  // --- State ---
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(getInitialOwned());
  const [filter, setFilter] = useState("ALL");
  const [series, setSeries] = useState("ALL");
  const [pref, setPref] = useState("ALL");
  const [popupIdx, setPopupIdx] = useState<number | null>(null);
  const [memo, setMemo] = useState<Record<string, string>>(getInitialMemo);

  // --- Data取得 ---
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

  // --- フィルタ ---
  let filtered = cards;
  if (series !== "ALL") filtered = filtered.filter(c => c.series === series);
  if (pref !== "ALL") filtered = filtered.filter(c => c.prefecture === pref);
  if (filter === "取得済") filtered = filtered.filter(c => owned.has(c.id));
  if (filter === "未取得") filtered = filtered.filter(c => !owned.has(c.id));
  // ソート
  filtered = filtered.slice().sort(
    (a, b) =>
      a.prefecture.localeCompare(b.prefecture, "ja") ||
      a.city.localeCompare(b.city, "ja") ||
      a.series.localeCompare(b.series, "ja")
  );
  // リスト
  const prefList = getPrefList(cards);
  const seriesList = getSeriesList(cards);

  // --- 進捗 ---
  const total = cards.length;
  const ownedCount = owned.size;
  const percent = total ? Math.round((ownedCount / total) * 100) : 0;

  // --- 操作 ---
  const toggleOwned = (id: string) => {
    setOwned(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const setMemoFor = (id: string, value: string) => setMemo(prev => ({ ...prev, [id]: value }));

  // --- UI/UX ---
  function renderGrid() {
    const grid = [];
    for (let i = 0; i < filtered.length; i += 2) {
      grid.push(
        <div key={i} className="flex w-full gap-2 mb-3">
          {filtered.slice(i, i + 2).map((card, j) => (
            <CardBox
              key={card.id}
              card={card}
              owned={owned.has(card.id)}
              onCheck={() => toggleOwned(card.id)}
              onClick={() => setPopupIdx(i + j)}
            />
          ))}
          {filtered.length % 2 === 1 && i + 1 === filtered.length && <div className="flex-1" />}
        </div>
      );
    }
    return grid;
  }

  // 詳細
  const showCard = popupIdx !== null && filtered[popupIdx];
  const card = showCard ? filtered[popupIdx!] : null;

  // --- JSX ---
  return (
    <div className="min-h-screen bg-[#fffdf7] font-sans w-full max-w-[430px] mx-auto" style={{ background: "#fffdf7" }}>
      {/* Header */}
      <header className="p-3 pt-4 pb-2 flex flex-col gap-1" style={{ minWidth: 0 }}>
        {/* 進捗＋タイトル */}
        <div className="flex items-center gap-3 mb-1">
          <img src="/manhole-icon.svg" alt="" className="w-8 h-8" />
          <span className="text-[#FFA740] font-black text-2xl tracking-tight">ALL</span>
          <div className="ml-auto flex flex-col items-end">
            <span className="font-black text-[#FFA740] text-lg">{ownedCount} / {total}</span>
            <div className="w-[88px] h-[9px] bg-[#ffe5b8] rounded-full overflow-hidden">
              <div
                className="bg-[#FFA740] h-full rounded-full transition-all"
                style={{ width: percent + "%" }}
              />
            </div>
          </div>
        </div>
        {/* フィルタタブ */}
        <div className="flex flex-row gap-1 mb-1">
          {FILTERS.map(t => (
            <button
              key={t}
              className={`rounded-full px-5 py-1 text-[15px] font-bold ${filter === t ? "bg-[#FFA740] text-white" : "bg-gray-100 text-gray-500"}`}
              onClick={() => setFilter(t)}
              style={{ minWidth: "86px" }}
            >{t}</button>
          ))}
        </div>
        {/* 弾タブ */}
        <div className="flex flex-row gap-1 overflow-x-auto pb-1 hide-scrollbar">
          <button
            className={`rounded-full px-4 py-1 text-[15px] font-bold ${series === "ALL" ? "bg-[#FFA740] text-white" : "bg-gray-100 text-gray-500"}`}
            onClick={() => setSeries("ALL")}
            style={{ minWidth: "74px" }}
          >ALL</button>
          {seriesList.map(s => (
            <button
              key={s}
              className={`rounded-full px-4 py-1 text-[15px] font-bold ${series === s ? "bg-[#FFA740] text-white" : "bg-gray-100 text-gray-500"}`}
              onClick={() => setSeries(s)}
              style={{ minWidth: "74px" }}
            >第{s}弾</button>
          ))}
        </div>
        {/* 都道府県プルダウン */}
        <div className="flex gap-2 items-center mt-2 mb-1">
          <select value={pref} onChange={e => setPref(e.target.value)} className="rounded-full border px-3 py-1 text-base text-gray-700 bg-gray-50">
            <option value="ALL">全ての都道府県</option>
            {prefList.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </header>
      {/* カードグリッド */}
      <main className="px-2 pb-24">
        {renderGrid()}
        {!filtered.length && (
          <div className="text-center text-gray-400 py-10 text-lg">カードがありません</div>
        )}
      </main>
      {/* 詳細モーダル */}
      {showCard && card && (
        <Modal onClose={() => setPopupIdx(null)}>
          <div className="flex flex-col gap-2 px-1 py-2 items-center">
            <div className="text-[#FFA740] font-black text-base mb-1">{card.series}／{card.prefecture}／{card.city}</div>
            <div className="text-base font-mono text-gray-600 mb-1">{card.details}</div>
            {/* サムネイル */}
            <div className="w-full flex justify-center items-center h-[110px] mb-2">
              <img
                src={card.imageUrl || DUMMY_IMAGE}
                alt={card.details}
                className="object-contain w-[80px] h-[110px] rounded-xl bg-white shadow"
                style={{ border: "2px solid #FFA740" }}
              />
            </div>
            {/* 取得ボタン */}
            <button
              onClick={() => toggleOwned(card.id)}
              className={`rounded-full w-16 h-16 flex items-center justify-center mb-2 shadow ${owned.has(card.id) ? "bg-[#FFA740]" : "bg-gray-200"}`}
            >
              {owned.has(card.id)
                ? <span className="text-white text-4xl font-black">✔️</span>
                : <span className="text-gray-400 text-4xl font-black">✔️</span>
              }
            </button>
            {/* 配布地 */}
            <div className="text-xs text-gray-600 mb-2">
              <span className="font-bold text-gray-900">配布場所：</span>
              {card.distributionPlace}
            </div>
            {/* メモ */}
            <textarea
              className="rounded border w-full p-2 text-base"
              placeholder="このカードの思い出やメモ"
              rows={3}
              value={memo[card.id] || ""}
              onChange={e => setMemoFor(card.id, e.target.value)}
              style={{ resize: "none" }}
            />
            {/* ページ送り */}
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

// ----------- CardBox --------------
function CardBox({
  card, owned, onCheck, onClick
}: {
  card: Card;
  owned: boolean;
  onCheck: () => void;
  onClick: () => void;
}) {
  // CSSで「窓見せ」演出
  return (
    <div
      className="flex-1 flex flex-col items-center bg-white rounded-2xl shadow border cursor-pointer transition min-h-[165px] p-1 relative"
      style={{
        borderColor: owned ? "#FFA740" : "#ddd",
        background: owned ? "#FFA74022" : "#fff"
      }}
      onClick={onClick}
    >
      <div className="w-full flex flex-row items-start justify-between px-1 pt-1">
        <span className="font-bold text-[#FFA740] text-lg">{card.series}</span>
        <span className="font-bold text-[#FFA740] text-xs text-right">{card.prefecture}<br />{card.city}</span>
      </div>
      {/* サムネイル（取得済:全身, 未取得:窓見せ＋暗マスク） */}
      <div className="w-full flex justify-center items-center h-[60px] my-2 relative">
        <div
          className={`overflow-hidden rounded-xl border bg-white ${owned ? "" : "brightness-[.90] grayscale"}`}
          style={{
            width: "48px", height: "60px",
            boxShadow: owned ? "0 2px 12px #FFA74044" : "none"
          }}
        >
          <img
            src={card.imageUrl || DUMMY_IMAGE}
            alt={card.details}
            className="object-contain w-[48px] h-[60px]"
            style={owned
              ? {}
              : { objectPosition: "center 14px" /*窓から覗く感じ*/, filter: "brightness(0.75) blur(0.2px)" }}
          />
        </div>
      </div>
      {/* 下部 */}
      <div className="w-full flex flex-col items-center mt-1 mb-1">
        <div className="font-mono text-[13px] text-gray-700">{card.details}</div>
        {/* 大きなチェックボックス風ボタン */}
        <button
          onClick={e => { e.stopPropagation(); onCheck(); }}
          className={`mt-1 w-full rounded-full py-1 font-bold ${owned ? "bg-[#FFA740] text-white" : "bg-gray-100 text-gray-500"}`}
        >
          {owned ? "取得済み" : "未取得"}
        </button>
      </div>
    </div>
  );
}

// ---------- Modal --------------
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