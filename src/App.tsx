import { useState, useEffect } from "react";

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
};

type GroupedCards = {
  [prefecture: string]: Card[];
};

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [real, setReal] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Card | null>(null);

  // データ読込
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then((data: Card[]) => setCards(data));
  }, []);

  // 都道府県でグループ化
  const grouped: GroupedCards = {};
  for (const c of cards) {
    const pref = c.prefecture || "不明";
    if (!grouped[pref]) grouped[pref] = [];
    grouped[pref].push(c);
  }

  // 進捗
  const total = cards.length;
  const ownedCount = owned.size;
  const realCount = real.size;
  const percent = total ? Math.round((ownedCount / total) * 100) : 0;
  const percentReal = total ? Math.round((realCount / total) * 100) : 0;

  // 所持/実物チェック切り替え
  const toggleOwned = (id: string) => {
    setOwned(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleReal = (id: string) => {
    setReal(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7fafc] to-[#fff4fa] flex flex-col pb-16">
      {/* サマリー */}
      <header className="py-3 px-3 border-b bg-white">
        <div className="flex justify-between items-center mb-1">
          <div className="text-2xl font-black">マンホールカード</div>
        </div>
        <div className="flex justify-around items-end mb-2">
          <div className="text-center">
            <div className="text-xs text-gray-500">カード</div>
            <div className="text-xl font-bold">{ownedCount}</div>
            <div className="text-xs text-gray-400">{percent}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">計</div>
            <div className="text-xl font-bold">{total}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">実物</div>
            <div className="text-xl font-bold">{realCount}</div>
            <div className="text-xs text-gray-400">{percentReal}%</div>
          </div>
        </div>
      </header>

      {/* グループリスト */}
      <main className="flex-1 overflow-y-auto px-2 bg-white">
        {Object.entries(grouped).map(([pref, group]) => (
          <div key={pref} className="mb-3">
            <div className="bg-[#f0f4ff] px-2 py-1 rounded font-bold text-[#335] mb-1 flex items-center">
              <span className="mr-2">{pref}</span>
              <span className="text-xs text-[#888]">{group.length}</span>
            </div>
            {group.map(card => (
              <div
                key={card.id}
                className="flex items-center border-b py-2 px-1 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelected(card)}
              >
                <img src={card.imageUrl} alt="" className="w-12 h-16 object-contain rounded bg-gray-100 mr-2" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{card.city}</div>
                  <div className="text-xs text-gray-500 truncate">{card.distributionPlace}</div>
                  <div className="text-xs text-gray-400">{card.id}</div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2">
                  <label className="flex items-center text-xs font-bold text-blue-500">
                    <input type="checkbox" checked={owned.has(card.id)} onChange={e => {e.stopPropagation(); toggleOwned(card.id)}} onClick={e => e.stopPropagation()} />
                    所持
                  </label>
                  <label className="flex items-center text-xs font-bold text-pink-500">
                    <input type="checkbox" checked={real.has(card.id)} onChange={e => {e.stopPropagation(); toggleReal(card.id)}} onClick={e => e.stopPropagation()} />
                    実物
                  </label>
                </div>
              </div>
            ))}
          </div>
        ))}
      </main>

      {/* 下部ナビ */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white flex justify-around items-center py-2 z-50">
        <button className="flex flex-col items-center text-xs text-indigo-700 font-bold"><span>カード</span></button>
        <button className="flex flex-col items-center text-xs text-gray-400"><span>アイテム</span></button>
        <button className="flex flex-col items-center text-xs text-gray-400"><span>写真</span></button>
        <button className="flex flex-col items-center text-xs text-gray-400"><span>サマリー</span></button>
      </nav>

      {/* カード詳細 */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl p-6 shadow-xl w-[90vw] max-w-lg relative" onClick={e => e.stopPropagation()}>
            <button className="absolute right-2 top-2 text-3xl text-gray-400" onClick={() => setSelected(null)}>×</button>
            <img src={selected.imageUrl} alt="" className="w-40 h-52 object-contain rounded mx-auto mb-3 border" />
            <div className="font-bold text-lg mb-1">{selected.city}</div>
            <div className="text-xs text-gray-400 mb-2">{selected.id}</div>
            <div className="mb-2">{selected.distributionPlace}</div>
            <div className="text-xs mb-1">緯度: {selected.latitude} 経度: {selected.longitude}</div>
            <div className="text-xs text-gray-500">{selected.series} {selected.details}</div>
            <div className="flex gap-4 mt-2 justify-center">
              <label className="flex items-center text-xs font-bold text-blue-500">
                <input type="checkbox" checked={owned.has(selected.id)} onChange={() => toggleOwned(selected.id)} />
                所持
              </label>
              <label className="flex items-center text-xs font-bold text-pink-500">
                <input type="checkbox" checked={real.has(selected.id)} onChange={() => toggleReal(selected.id)} />
                実物
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}