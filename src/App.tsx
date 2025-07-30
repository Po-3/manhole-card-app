import React, { useEffect, useState } from "react";
import "./App.css";

type Card = {
  id: string;
  series: string;
  imageUrl: string;
  prefecture: string;
  city: string;
  details: string;
  distributionPlace: string;
  latitude: number;
  longitude: number;
};

const STORAGE_KEY = "owned-manholecards-v3";
const MEMO_KEY = "memo-manholecards-v3";

const getInitialOwned = (): Set<string> => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? new Set<string>(JSON.parse(s) as string[]) : new Set<string>();
  } catch {
    return new Set<string>();
  }
};

const getInitialMemo = (): Record<string, string> => {
  try {
    const s = localStorage.getItem(MEMO_KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
};

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(getInitialOwned());
  const [memo, setMemo] = useState<Record<string, string>>(getInitialMemo);
  const [series, setSeries] = useState("ALL");
  const [pref, setPref] = useState("ALL");
  const [search, setSearch] = useState("");
  const [popupIdx, setPopupIdx] = useState<number | null>(null);

  // データ読込
  useEffect(() => { fetch("/manhole_cards.json").then(res => res.json()).then(setCards); }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(owned))); }, [owned]);
  useEffect(() => { localStorage.setItem(MEMO_KEY, JSON.stringify(memo)); }, [memo]);

  // 絞り込みリスト
  const allSeries = ["ALL", ...Array.from(new Set(cards.map(c => c.series)))];
  const allPrefs = ["ALL", ...Array.from(new Set(cards.map(c => c.prefecture)))];

  let filtered = cards;
  if (series !== "ALL") filtered = filtered.filter(c => c.series === series);
  if (pref !== "ALL") filtered = filtered.filter(c => c.prefecture === pref);
  if (search) filtered = filtered.filter(
    c => c.city.includes(search) || c.details.includes(search) || c.distributionPlace.includes(search)
  );

  // 進捗
  const total = cards.length, ownedCount = owned.size;
  const percent = total ? Math.round((ownedCount / total) * 100) : 0;

  // 操作
  const toggleOwned = (id: string) => setOwned(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const setMemoFor = (id: string, val: string) => setMemo(prev => ({ ...prev, [id]: val }));

  // 詳細
  const card = popupIdx !== null && filtered[popupIdx!] ? filtered[popupIdx!] : null;

  // JSX
  return (
    <div className="mc-root">
      {/* ヘッダー */}
      <header className="mc-header">
        <h1>マンホールカード管理</h1>
        <div className="mc-progress">
          <div className="mc-progress-bar" style={{ width: percent + "%" }} />
          <span>{ownedCount}/{total}</span>
        </div>
      </header>
      {/* 絞り込み */}
      <div className="mc-filter-bar">
        <select value={series} onChange={e => setSeries(e.target.value)}>
          {allSeries.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={pref} onChange={e => setPref(e.target.value)}>
          {allPrefs.map(p => <option key={p}>{p}</option>)}
        </select>
        <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="キーワード" />
      </div>
      {/* カードグリッド */}
      <main className="mc-grid">
        {filtered.length === 0 && <div className="mc-empty">該当カードなし</div>}
        {filtered.map((c, i) =>
          <div key={c.id} className={`mc-card${owned.has(c.id) ? " owned" : ""}`}
            onClick={() => setPopupIdx(i)}>
            <div className="mc-card-imgwrap">
              <img src={c.imageUrl} alt="" className="mc-card-img" />
              {owned.has(c.id) && <div className="mc-badge">✔</div>}
            </div>
            <div className="mc-card-info">
              <span className="mc-card-pref">{c.prefecture}</span>
              <span className="mc-card-city">{c.city}</span>
            </div>
          </div>
        )}
      </main>
      {/* ポップアップ詳細 */}
      {card && (
        <div className="mc-modal-bg" onClick={() => setPopupIdx(null)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <button className="mc-modal-close" onClick={() => setPopupIdx(null)}>&times;</button>
            <img src={card.imageUrl} alt="" className="mc-modal-img" />
            <div className="mc-modal-section">
              <span className="mc-modal-series">{card.series}</span>
              <span className="mc-modal-pref">{card.prefecture} {card.city}</span>
              <div className="mc-modal-id">{card.details}</div>
              <div className="mc-modal-place">{card.distributionPlace}</div>
              <button className={`mc-modal-getbtn${owned.has(card.id) ? " owned" : ""}`} onClick={() => toggleOwned(card.id)}>
                {owned.has(card.id) ? "取得済み" : "未取得 → 取得"}
              </button>
              <textarea className="mc-modal-memo" rows={3}
                placeholder="メモ" value={memo[card.id] || ""}
                onChange={e => setMemoFor(card.id, e.target.value)}
              />
            </div>
            <div className="mc-modal-nav">
              <button disabled={popupIdx === 0} onClick={() => setPopupIdx(idx => idx! - 1)}>前へ</button>
              <button disabled={popupIdx === filtered.length - 1} onClick={() => setPopupIdx(idx => idx! + 1)}>次へ</button>
            </div>
          </div>
        </div>
      )}
      {/* ナビゲーション */}
      <footer className="mc-footer">
        <button className="active">カード</button>
        <button disabled>コレクション</button>
        <button disabled>設定</button>
      </footer>
    </div>
  );
}