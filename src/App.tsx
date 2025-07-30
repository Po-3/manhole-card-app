import React, { useEffect, useState } from "react";

// マンホールカード型定義（データ形式に合わせて調整！）
type Card = {
  id: string;
  series: string;
  imageUrl: string;
  prefecture: string;
  city: string;
  productNumber: string;
  latitude: number;
  longitude: number;
  details: string;
  distributionPlace: string;
};

// ボトムナビ用
const NAVS = [
  { key: "cards", label: "カード", icon: "💳" },
  { key: "items", label: "アイテム", icon: "🎒" },
  { key: "photos", label: "写真", icon: "📷" },
  { key: "summary", label: "サマリー", icon: "📊" }
];

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<Card | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [real, setReal] = useState<Set<string>>(new Set());
  const [nav, setNav] = useState("cards");
  const [search, setSearch] = useState("");

  // データ取得
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then(setCards);
    // 所持情報はlocalStorage
    setOwned(new Set(JSON.parse(localStorage.getItem("owned") || "[]")));
    setReal(new Set(JSON.parse(localStorage.getItem("real") || "[]")));
  }, []);

  // 所持/実物 保存
  useEffect(() => {
    localStorage.setItem("owned", JSON.stringify(Array.from(owned)));
  }, [owned]);
  useEffect(() => {
    localStorage.setItem("real", JSON.stringify(Array.from(real)));
  }, [real]);

  // 検索・フィルタ
  const filteredCards = cards.filter(card =>
    !search ||
    card.city.includes(search) ||
    card.prefecture.includes(search) ||
    card.series.includes(search)
  );

  // 進捗計算
  const total = cards.length;
  const ownedCount = owned.size;
  const realCount = real.size;
  const percent = total === 0 ? 0 : Math.round((ownedCount / total) * 100);
  const percentReal = total === 0 ? 0 : Math.round((realCount / total) * 100);

  // 所持トグル
  const toggleOwned = (id: string) => {
    setOwned(o => {
      const next = new Set(o);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleReal = (id: string) => {
    setReal(r => {
      const next = new Set(r);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#fff0fa] flex flex-col pb-16">
      {/* ヘッダー */}
      <header className="p-4 pb-1 flex flex-col items-center border-b bg-white sticky top-0 z-30">
        <div className="font-black text-xl tracking-tight mb-1">マンホールカード</div>
        <div className="flex justify-around w-full max-w-md mb-1">
          <div className="flex flex-col items-center">
            <span className="text-gray-600 text-xs">カード</span>
            <span className="font-bold text-xl">{ownedCount}</span>
            <span className="text-gray-400 text-xs">{percent}%</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-600 text-xs">計</span>
            <span className="font-bold text-xl">{total}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-600 text-xs">実物</span>
            <span className="font-bold text-xl">{realCount}</span>
            <span className="text-gray-400 text-xs">{percentReal}%</span>
          </div>
        </div>
        {/* 検索窓 */}
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="市区町村・シリーズで検索"
          className="w-full max-w-xs p-2 rounded border text-sm mt-2 bg-[#f5f5fa]"
        />
      </header>

      {/* タブ切り替え（カード/アイテム/写真/サマリー） */}
      <nav className="flex justify-between w-full max-w-lg mx-auto bg-[#e7e9f7] rounded-xl mt-3 mb-2 px-1 shadow-sm">
        {NAVS.map(n => (
          <button
            key={n.key}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${
              nav === n.key
                ? "bg-gradient-to-tr from-indigo-400 to-blue-300 text-white shadow"
                : "text-gray-700"
            }`}
            onClick={() => setNav(n.key)}
          >
            <span className="text-lg">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {/* 本体リスト or タブ切替 */}
      <main className="flex-1 w-full max-w-lg mx-auto overflow-y-auto">
        {/* カード一覧（カードタブ時） */}
        {nav === "cards" && (
          <div>
            {filteredCards.map(card => (
              <div
                key={card.id}
                className="flex items-center gap-2 p-2 border-b hover:bg-[#f7f8ff] cursor-pointer"
                onClick={() => setSelected(card)}
              >
                <img
                  src={card.imageUrl}
                  alt={card.city}
                  className="w-14 h-20 rounded-md bg-gray-100 border object-contain flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[1rem] text-gray-700 truncate">
                    {card.city}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{card.series}</div>
                  <div className="text-xs text-gray-400">{card.id}</div>
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={owned.has(card.id)}
                      onChange={e => { e.stopPropagation(); toggleOwned(card.id); }}
                    />
                    <span>所持</span>
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={real.has(card.id)}
                      onChange={e => { e.stopPropagation(); toggleReal(card.id); }}
                    />
                    <span>実物</span>
                  </label>
                </div>
              </div>
            ))}
            {filteredCards.length === 0 && (
              <div className="text-center text-gray-400 py-10">カードが見つかりません</div>
            )}
          </div>
        )}

        {/* ダミーのアイテム/写真/サマリー */}
        {nav !== "cards" && (
          <div className="text-center text-gray-400 py-16">
            「{NAVS.find(n => n.key === nav)?.label}」画面は現在未対応です。
          </div>
        )}
      </main>

      {/* 詳細モーダル */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl shadow-lg p-5 w-[95vw] max-w-md relative" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 text-2xl text-gray-400"
              onClick={() => setSelected(null)}
            >×</button>
            <img src={selected.imageUrl} alt={selected.city} className="w-32 h-44 rounded-lg mx-auto mb-2 border object-contain" />
            <div className="font-bold text-lg text-center mb-1">{selected.city}</div>
            <div className="text-xs text-center text-gray-500 mb-1">{selected.series}</div>
            <div className="text-xs text-center text-gray-500 mb-2">{selected.id}</div>
            <div className="text-xs mb-2">{selected.distributionPlace}</div>
            <div className="text-xs text-gray-500 mb-2">{selected.details}</div>
            <div className="text-xs text-gray-600 mb-1">
              緯度: {selected.latitude}, 経度: {selected.longitude}
            </div>
            <div className="flex gap-2 justify-center mt-2">
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={owned.has(selected.id)}
                  onChange={() => toggleOwned(selected.id)}
                />
                所持
              </label>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={real.has(selected.id)}
                  onChange={() => toggleReal(selected.id)}
                />
                実物
              </label>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${selected.latitude},${selected.longitude}`}
              className="block text-center text-blue-500 underline mt-2 text-xs"
              target="_blank" rel="noopener noreferrer"
            >
              Googleマップで開く
            </a>
          </div>
        </div>
      )}

      {/* ボトムナビ固定 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center py-1 z-50 max-w-lg mx-auto">
        {NAVS.map(n => (
          <button
            key={n.key}
            onClick={() => setNav(n.key)}
            className={`flex flex-col items-center text-xs ${nav === n.key ? "text-indigo-600 font-bold" : "text-gray-400"}`}
          >
            <span className="text-xl">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}