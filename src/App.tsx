// src/App.tsx
import { useState, useEffect } from "react";

// ① JSON のひな形に合わせた型定義
type RawCard = {
  id: string;             // 例: "01-208-A001"
  prefecture: string;     // 例: "北海道"
  city: string;           // 例: "北見市"
  series: string;         // 例: "第２弾"
  imageUrl: string;       // サムネイル画像のURL
  latitude: number;       // 緯度
  longitude: number;      // 経度
};

// ② 画面で使うカード型（必要な部分だけ抜き出しています）
type Card = RawCard;

// シリーズ番号→バッジ色マップ（Tailwindクラス）
const badgeColors: { [num: number]: string } = {
  1: "bg-green-500",
  2: "bg-blue-500",
  3: "bg-red-500",
  4: "bg-pink-500",
  // 必要に応じて増やしてください
};

export default function App() {
  // カード一覧を入れる箱
  const [cards, setCards] = useState<Card[]>([]);
  // クリックしたカードの詳細を入れる箱（モーダル用）
  const [selected, setSelected] = useState<Card | null>(null);
  // 「所持」「実物チェック」したカードIDを保存する箱
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [realIds, setRealIds] = useState<string[]>([]);

  // 画面が開いたら JSON を読み込む
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then((res) => res.json())
      .then((data: RawCard[]) => {
        setCards(data);
        // 以前のチェック履歴があれば localStorage から読み込む
        const o = JSON.parse(localStorage.getItem("ownedIds") || "[]");
        const r = JSON.parse(localStorage.getItem("realIds")  || "[]");
        setOwnedIds(o);
        setRealIds(r);
      });
  }, []);

  // チェックを切り替えたとき localStorage にも保存
  function toggleOwned(id: string) {
    const next = ownedIds.includes(id)
      ? ownedIds.filter((x) => x !== id)
      : [...ownedIds, id];
    setOwnedIds(next);
    localStorage.setItem("ownedIds", JSON.stringify(next));
  }
  function toggleReal(id: string) {
    const next = realIds.includes(id)
      ? realIds.filter((x) => x !== id)
      : [...realIds, id];
    setRealIds(next);
    localStorage.setItem("realIds", JSON.stringify(next));
  }

  // 進捗計算
  const total = cards.length;
  const ownedCount = ownedIds.length;
  const realCount  = realIds.length;
  const ownedPercent = total ? Math.round((ownedCount / total) * 100) : 0;
  const realPercent  = total ? Math.round((realCount  / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* --------------------
          ③ サマリー部分
      --------------------- */}
      <header className="bg-white p-4 border-b">
        <h1 className="text-center text-xl font-bold mb-2">マンホールカード</h1>
        <div className="flex justify-around">
          {/* 所持カード */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center mb-1">
              {ownedCount}
            </div>
            <div className="text-sm text-gray-600">カード</div>
            <div className="text-xs text-gray-500">{ownedPercent}%</div>
          </div>
          {/* 総枚数 */}
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold mb-1">{total}</div>
            <div className="text-sm text-gray-600">計</div>
          </div>
          {/* 実物チェック */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center mb-1">
              {realCount}
            </div>
            <div className="text-sm text-gray-600">実物</div>
            <div className="text-xs text-gray-500">{realPercent}%</div>
          </div>
        </div>
      </header>

      {/* --------------------
           ④ カード一覧
      --------------------- */}
      <main className="flex-1 overflow-y-auto p-2">
        {cards.map((c) => {
          // 「第２弾」から数字だけ抜き出す(正規表現)
          const num = Number(c.series.replace(/[^0-9]/g, "")) || 0;
          // 色クラスを決定。なければグレー
          const colorClass = badgeColors[num] || "bg-gray-400";

          return (
            <div
              key={c.id}
              className="flex items-center bg-white p-2 mb-2 rounded shadow-sm hover:shadow-md cursor-pointer"
              onClick={() => setSelected(c)}
            >
              {/* シリーズ番号バッジ */}
              <div className={`${colorClass} text-white w-6 h-6 rounded-full flex items-center justify-center mr-3`}>
                {num}
              </div>
              {/* サムネイル */}
              <img
                src={c.imageUrl}
                alt=""
                className="w-12 h-12 object-contain rounded mr-3 bg-gray-100"
              />
              {/* タイトル＆配布場所 */}
              <div className="flex-1">
                <div className="font-medium">{c.prefecture} {c.city}</div>
                <div className="text-xs text-gray-500 truncate">{c.id}</div>
              </div>
              {/* チェックボタン */}
              <div className="flex flex-col items-center">
                <label className="flex items-center text-xs">
                  <input
                    type="checkbox"
                    className="mr-1"
                    checked={ownedIds.includes(c.id)}
                    onChange={() => toggleOwned(c.id)}
                  />
                  所持
                </label>
                <label className="flex items-center text-xs mt-1">
                  <input
                    type="checkbox"
                    className="mr-1"
                    checked={realIds.includes(c.id)}
                    onChange={() => toggleReal(c.id)}
                  />
                  実物
                </label>
              </div>
            </div>
          );
        })}
      </main>

      {/* --------------------
           ⑤ 下部ナビゲーション
      --------------------- */}
      <nav className="bg-white border-t p-2 fixed bottom-0 w-full flex justify-around">
        <button className="text-xs text-blue-600">カード</button>
        <button className="text-xs text-gray-400">アイテム</button>
        <button className="text-xs text-gray-400">写真</button>
        <button className="text-xs text-gray-400">サマリー</button>
      </nav>

      {/* --------------------
           ⑥ 詳細モーダル
      --------------------- */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white p-4 rounded-lg w-11/12 max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="text-gray-400 float-right text-2xl"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-2">{selected.prefecture} {selected.city}</h2>
            <img
              src={selected.imageUrl}
              alt=""
              className="w-32 h-32 object-contain mx-auto mb-2"
            />
            <div className="text-sm mb-1">カードID: {selected.id}</div>
            <div className="text-sm">シリーズ: {selected.series}</div>
            <div className="text-xs text-gray-600 mt-2">
              緯度: {selected.latitude}, 経度: {selected.longitude}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}