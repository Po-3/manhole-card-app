// src/App.tsx
import React, { useState, useEffect } from "react";

// JSONの型
type RawCard = {
  id: string;           // ex. "01-208-A001"
  prefecture: string;   // ex. "北海道"
  city: string;         // ex. "北見市"
  series: string;       // ex. "第２弾"
  imageUrl: string;     // サムネイルURL
  latitude: number;
  longitude: number;
};

// Tailwindバッジ用の色マップ
const badgeColors: Record<number, string> = {
  1: "bg-green-500",
  2: "bg-blue-500",
  3: "bg-red-500",
  4: "bg-pink-500",
  // …必要に応じて追加
};

export default function App() {
  const [cards, setCards] = useState<RawCard[]>([]);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [realIds,  setRealIds]  = useState<string[]>([]);
  const [selected, setSelected] = useState<RawCard | null>(null);

  // ① JSON読み込み＋ローカルストレージからチェック状態復元
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then((res) => res.json())
      .then((data: RawCard[]) => {
        setCards(data);
        setOwnedIds(JSON.parse(localStorage.getItem("ownedIds") || "[]"));
        setRealIds( JSON.parse(localStorage.getItem("realIds" ) || "[]"));
      });
  }, []);

  // ② チェックON/OFFトグル
  function toggle(list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, id: string) {
    const next = list.includes(id)
      ? list.filter((x) => x !== id)
      : [...list, id];
    setList(next);
    localStorage.setItem(
      list === ownedIds ? "ownedIds" : "realIds",
      JSON.stringify(next)
    );
  }

  // ③ 進捗サマリー計算
  const total      = cards.length;
  const ownedCount = ownedIds.length;
  const realCount  = realIds.length;
  const ownedPct = total ? Math.round((ownedCount / total) * 100) : 0;
  const realPct  = total ? Math.round((realCount  / total) * 100) : 0;

  // ④ 都道府県ごとにグルーピング（例では北海道のみ見せます）
  const byPref: Record<string, RawCard[]> = {};
  cards.forEach((c) => {
    byPref[c.prefecture] = byPref[c.prefecture] || [];
    byPref[c.prefecture].push(c);
  });
  const prefectures = Object.keys(byPref);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* ──────────── ヘッダー ──────────── */}
      <header className="bg-white flex items-center justify-between px-4 py-2 shadow">
        {/* 横三本線アイコン */}
        <button className="text-2xl leading-none">≡</button>
        {/* フォルダアイコン＋タイトル */}
        <div className="flex items-center space-x-2">
          <span className="text-xl">📁</span>
          <div className="text-center">
            <div className="text-lg font-semibold">マンホールカード</div>
            <div className="text-xs text-gray-500">全て</div>
          </div>
        </div>
        {/* スター＋虫眼鏡 */}
        <div className="flex items-center space-x-3 text-2xl">
          <button>★</button>
          <button>🔍</button>
        </div>
      </header>

      {/* ──────────── サマリー ──────────── */}
      <section className="bg-white p-4 flex justify-around border-b">
        {[
          { label: "カード",   count: ownedCount, pct: ownedPct },
          { label: "計",       count: total,      pct: null      },
          { label: "実物",     count: realCount,  pct: realPct   },
        ].map((s, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl font-bold">
              {s.count}
            </div>
            <div className="mt-1 text-sm text-gray-600">{s.label}</div>
            {s.pct !== null && (
              <div className="text-xs text-gray-500 mt-0.5">{s.pct}%</div>
            )}
          </div>
        ))}
      </section>

      {/* ──────────── リスト部 ──────────── */}
      <main className="flex-1 overflow-y-auto">
        {prefectures.map((pref) => (
          <div key={pref} className="mb-4">
            {/* 都道府県ヘッダー */}
            <div className="bg-white px-4 py-2 flex justify-between items-center text-lg font-medium border-b">
              <span>{pref}</span>
              <span className="flex items-center text-sm text-gray-500">
                {byPref[pref].length}
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
            {/* カード項目 */}
            {byPref[pref].map((c) => {
              const num = Number(c.series.replace(/[^0-9]/g, "")) || 0;
              const badgeClass = badgeColors[num] || "bg-gray-400";
              return (
                <div
                  key={c.id}
                  className="bg-white flex items-center p-3 space-x-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelected(c)}
                >
                  {/* シリーズ番号バッジ */}
                  <div className={`${badgeClass} text-white w-6 h-6 flex items-center justify-center rounded-full`}>
                    {num}
                  </div>
                  {/* サムネイル */}
                  <img
                    src={c.imageUrl}
                    alt={c.city}
                    className="w-12 h-12 object-contain rounded bg-gray-100"
                  />
                  {/* テキスト */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.city}（{c.id.split("-")[2]}）</div>
                    <div className="text-xs text-gray-500 truncate">{c.id}</div>
                  </div>
                  {/* チェックボックス */}
                  <div className="flex flex-col space-y-1">
                    <label className="flex items-center text-xs">
                      <input
                        type="checkbox"
                        className="mr-1 accent-blue-500"
                        checked={ownedIds.includes(c.id)}
                        onChange={() => toggle(ownedIds, setOwnedIds, c.id)}
                      />
                      所持
                    </label>
                    <label className="flex items-center text-xs">
                      <input
                        type="checkbox"
                        className="mr-1 accent-green-500"
                        checked={realIds.includes(c.id)}
                        onChange={() => toggle(realIds, setRealIds, c.id)}
                      />
                      実物
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </main>

      {/* ──────────── 下部ナビ ──────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex justify-around">
        {["カード","アイテム","写真","サマリー"].map((t, i) => (
          <button
            key={i}
            className={`text-xs font-medium ${
              i === 0 ? "text-blue-600" : "text-gray-400"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* ──────────── 詳細モーダル ──────────── */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-lg p-4 w-11/12 max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="text-gray-400 float-right text-2xl"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-2">
              {selected.prefecture} {selected.city}
            </h2>
            <img
              src={selected.imageUrl}
              alt=""
              className="w-32 h-32 object-contain mx-auto mb-4"
            />
            <div className="text-sm mb-1">カードID: {selected.id}</div>
            <div className="text-sm mb-1">シリーズ: {selected.series}</div>
            <div className="text-xs text-gray-600">
              緯度: {selected.latitude}, 経度: {selected.longitude}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}