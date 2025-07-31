import { useEffect, useState } from "react";

// --- カード型 ---
type Card = {
  id: string;
  series: string;         // 例: "26"
  prefecture: string;
  city: string;
  details: string;
  imageUrl: string;
};

const STORAGE_KEY = "owned-manhole-cards";

function getInitialOwned(): Set<string> {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? new Set<string>(JSON.parse(s)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(getInitialOwned());
  const [filter, setFilter] = useState("ALL");

  // --- データ取得 ---
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then((data: Card[]) => setCards(data));
  }, []);

  // --- 所有カード変更時に保存 ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(owned)));
  }, [owned]);

  // --- seriesリスト（降順、重複なし） ---
  const uniqueSeries = Array.from(new Set(cards.map(c => c.series)))
    .filter(Boolean)
    .sort((a, b) => Number(b) - Number(a)); // "26", "25", ...

  // --- タブラベル ---
  const TAB_LABELS = [
    "ALL", "取得済", "未取得",
    ...uniqueSeries.map(s => `第${s}弾`)
  ];

  // --- フィルタ ---
  let filtered = cards;
  if (filter === "取得済") filtered = cards.filter(c => owned.has(c.id));
  else if (filter === "未取得") filtered = cards.filter(c => !owned.has(c.id));
  else if (filter.startsWith("第")) {
    const seriesNum = filter.replace("第", "").replace("弾", "");
    filtered = cards.filter(c => c.series === seriesNum);
  }

  // --- カードもseries降順 ---
  filtered = filtered.slice().sort((a, b) => Number(b.series) - Number(a.series));

  // --- 所有数カウント ---
  const ownedCount = owned.size;
  const totalCount = cards.length;

  // --- 所有状態トグル ---
  const toggleOwned = (id: string) => {
    setOwned(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="app-root">
      {/* ヘッダー */}
      <div className="header-appbar">
        <img src="/manhole-icon.svg" className="app-icon" alt="icon" />
        <div className="app-title">ALL</div>
        <div className="app-count">{ownedCount} / {totalCount}</div>
      </div>

      {/* タブバー */}
      <div className="tabbar-outer">
        <div className="tabbar-scroll">
          {TAB_LABELS.map(t => (
            <button
              key={t}
              className={`tab-btn${filter === t ? " active" : ""}`}
              onClick={() => setFilter(t)}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* カードグリッド */}
      <div className="cards-grid">
        {filtered.map(card => (
          <div
            key={card.id}
            className={`card${owned.has(card.id) ? " owned" : ""}`}
            onClick={() => toggleOwned(card.id)}
            tabIndex={0}
            role="button"
            aria-pressed={owned.has(card.id)}
          >
            <div className="card-series">{`第${card.series}弾`}</div>
            <div className="card-area">{card.prefecture}{card.city}</div>
            <div className="card-imgbox">
              {/* サムネイル画像 */}
              <img
                src={card.imageUrl}
                alt=""
                className="card-img"
                style={{
                  width: 80, height: 60, objectFit: "cover",
                  borderRadius: 7, background: "#EEE"
                }}
              />
              {/* 未取得時だけチェックマーク */}
              {!owned.has(card.id) && (
                <span className="card-check">✔️</span>
              )}
            </div>
            <div className="card-code">{card.details}</div>
          </div>
        ))}
        {!filtered.length &&
          <div className="no-data-msg">カードがありません</div>
        }
      </div>
    </div>
  );
}