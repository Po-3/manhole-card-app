import { useState, useEffect } from "react";
import { ChevronDownIcon } from '@heroicons/react/24/outline';

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
  distributionPlace: string;
};

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [real, setReal] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Card | null>(null);

  // データ読み込み＋localStorage復元
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then(data => setCards(data));

    const o = localStorage.getItem("owned");
    if (o) setOwned(new Set(JSON.parse(o)));
    const r = localStorage.getItem("real");
    if (r) setReal(new Set(JSON.parse(r)));
  }, []);

  // localStorage 保存
  useEffect(() => {
    localStorage.setItem("owned", JSON.stringify(Array.from(owned)));
  }, [owned]);
  useEffect(() => {
    localStorage.setItem("real", JSON.stringify(Array.from(real)));
  }, [real]);

  const total = cards.length;
  const ownedCount = owned.size;
  const realCount = real.size;
  const percentOwned = total ? Math.round((ownedCount / total) * 100) : 0;
  const percentReal = total ? Math.round((realCount / total) * 100) : 0;

  // 都道府県でグループ化
  const byPref = cards.reduce<Record<string, Card[]>>((acc, c) => {
    const key = c.prefecture || "全国";
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-4 py-2 bg-white shadow">
        <div className="flex items-center space-x-4">
          <span className="text-2xl">☰</span>
          <span className="text-2xl">📂</span>
          <div className="text-center">
            <h1 className="text-lg font-bold">マンホールカード</h1>
            <div className="text-xs text-gray-500">全て</div>
          </div>
        </div>
        <div className="space-x-3 text-xl">
          <span>⭐</span>
          <span>🔍</span>
        </div>
      </header>

      {/* サマリー */}
      <div className="flex justify-around items-center bg-white py-4 border-b">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-2 border-gray-300 rounded-full flex flex-col items-center justify-center">
            <span className="text-sm">カード</span>
            <span className="font-bold text-lg">{ownedCount}</span>
            <span className="text-xs text-gray-500">{percentOwned}%</span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-sm text-gray-500">計</div>
          <div className="font-bold text-2xl">{total}</div>
          <button className="-mt-2">
            <ChevronDownIcon className="w-5 h-5 text-gray-400"/>
          </button>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-2 border-gray-300 rounded-full flex flex-col items-center justify-center">
            <span className="text-sm">実物</span>
            <span className="font-bold text-lg">{realCount}</span>
            <span className="text-xs text-gray-500">{percentReal}%</span>
          </div>
        </div>
      </div>

      {/* カードリスト */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {Object.entries(byPref).map(([pref, list]) => (
          <div key={pref} className="mb-4">
            {/* 折りたたみヘッダー */}
            <button
              className="w-full flex justify-between items-center bg-white px-4 py-2 font-semibold"
              onClick={() => {
                const s = new Set(expanded);
                if (s.has(pref)) s.delete(pref);
                else s.add(pref);
                setExpanded(s);
              }}
            >
              <span>{pref}</span>
              <span className="flex items-center space-x-1">
                <span>{list.length}</span>
                <ChevronDownIcon
                  className={`w-4 h-4 transform ${expanded.has(pref) ? 'rotate-180' : ''}`}
                />
              </span>
            </button>
            {expanded.has(pref) && list.map(card => (
              <div
                key={card.id}
                className="flex items-center bg-white px-4 py-2 border-b hover:bg-gray-50"
              >
                {/* サムネイル */}
                <div className="flex-shrink-0 relative">
                  <img
                    src={card.imageUrl}
                    alt=""
                    className="w-10 h-10 rounded border"
                    onClick={() => setSelected(card)}
                  />
                  <span className="absolute top-0 right-0 bg-green-500 text-white text-xs rounded-full px-1">
                    {card.series.replace(/第|弾/g, '')}
                  </span>
                </div>
                {/* テキスト */}
                <div className="flex-1 px-3">
                  <div className="font-medium truncate">{card.city}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {card.distributionPlace}
                  </div>
                </div>
                {/* カードID */}
                <div className="text-xs text-gray-400 w-24">{card.id}</div>
                {/* チェック */}
                <div className="flex items-center space-x-2 pl-2">
                  <label className="flex items-center space-x-1 text-xs">
                    <input
                      type="checkbox"
                      checked={owned.has(card.id)}
                      onChange={() => {
                        const s = new Set(owned);
                        s.has(card.id) ? s.delete(card.id) : s.add(card.id);
                        setOwned(s);
                      }}
                    />
                    <span>カード</span>
                  </label>
                  <label className="flex items-center space-x-1 text-xs">
                    <input
                      type="checkbox"
                      checked={real.has(card.id)}
                      onChange={() => {
                        const s = new Set(real);
                        s.has(card.id) ? s.delete(card.id) : s.add(card.id);
                        setReal(s);
                      }}
                    />
                    <span>実物</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 下部ナビ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2">
        {['カード','アイテム','写真','サマリー'].map((tab, i) => (
          <button
            key={i}
            className={`text-xs ${i === 0 ? 'text-blue-600 font-bold' : 'text-gray-500'}`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* 詳細モーダル */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-lg overflow-auto max-h-[80vh] w-[90vw] p-4 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-500"
              onClick={() => setSelected(null)}
            >×</button>
            <h2 className="text-center font-bold text-xl mb-2">
              {selected.series} {selected.prefecture} {selected.city} ({selected.id})
            </h2>
            <img
              src={selected.imageUrl}
              alt=""
              className="mx-auto mb-2 border rounded"
            />
            <div className="text-sm mb-1">
              <span className="font-semibold">カードID:</span> {selected.id}
            </div>
            <div className="text-sm mb-1">
              <span className="font-semibold">配布場所:</span> {selected.distributionPlace}
            </div>
            <div className="text-sm mb-1">
              <span className="font-semibold">緯度/経度:</span> {selected.latitude}, {selected.longitude}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}