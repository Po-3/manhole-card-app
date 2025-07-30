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

type GroupedCards = { [pref: string]: Card[] };

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

  // チェック切り替え
  const toggleOwned = (id: string) => setOwned(p => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleReal = (id: string) => setReal(p => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  // 横スクロール禁止
  useEffect(() => {
    document.body.style.overflowX = "hidden";
    return () => { document.body.style.overflowX = ""; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7fafc] to-[#fff4fa] flex flex-col pb-20 max-w-full overflow-x-hidden">
      {/* サマリー */}
      <header className="py-3 px-2 border-b bg-white max-w-full">
        <div className="flex justify-between items-center mb-1">
          <div className="text-xl font-black text-center w-full">マンホールカード</div>
        </div>
        <div className="flex justify-around items-end mb-1 max-w-full">
          <div className="text-center w-1/3">
            <div className="text-xs text-gray-500">カード</div>
            <div className="text-xl font-bold">{ownedCount}</div>
            <div className="text-xs text-gray-400">{percent}%</div>
          </div>
          <div className="text-center w-1/3">
            <div className="text-xs text-gray-500">計</div>
            <div className="text-xl font-bold">{total}</div>
          </div>
          <div className="text-center w-1/3">
            <div className="text-xs text-gray-500">実物</div>
            <div className="text-xl font-bold">{realCount}</div>
            <div className="text-xs text-gray-400">{percentReal}%</div>
          </div>
        </div>
      </header>

      {/* グループリスト */}
      <main className="flex-1 overflow-y-auto px-1 max-w-full">
        {Object.entries(grouped).map(([pref, group]) => (
          <div key={pref} className="mb-3 max-w-full">
            <div className="bg-[#f0f4ff] px-2 py-1 rounded font-bold text-[#335] mb-1 flex items-center max-w-full">
              <span className="mr-2">{pref}</span>
              <span className="text-xs text-[#888]">{group.length}</span>
            </div>
            <div>
              {group.map(card => (
                <div
                  key={card.id}
                  className="flex items-center border-b py-1 px-0.5 hover:bg-gray-50 cursor-pointer max-w-full"
                  onClick={() => setSelected(card)}
                >
                  <img
                    src={card.imageUrl}
                    alt=""
                    className="w-16 h-22 min-w-16 max-w-16 max-h-22 object-contain rounded bg-gray-100 mr-2 shadow-sm"
                    style={{ width: "64px", height: "88px" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs truncate">{card.city}</div>
                    <div className="text-[10px] text-gray-500 truncate">{card.distributionPlace}</div>
                    <div className="text-[10px] text-gray-400">{card.id}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-1" onClick={e => e.stopPropagation()}>
                    <label className="flex items-center text-[10px] font-bold text-blue-500">
                      <input type="checkbox" checked={owned.has(card.id)} onChange={() => toggleOwned(card.id)} />
                      所持
                    </label>
                    <label className="flex items-center text-[10px] font-bold text-pink-500">
                      <input type="checkbox" checked={real.has(card.id)} onChange={() => toggleReal(card.id)} />
                      実物
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* 下部ナビ */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white flex justify-around items-center py-2 z-50 max-w-full">
        <button className="flex flex-col items-center text-xs text-indigo-700 font-bold"><span>カード</span></button>
        <button className="flex flex-col items-center text-xs text-gray-400"><span>アイテム</span></button>
        <button className="flex flex-col items-center text-xs text-gray-400"><span>写真</span></button>
        <button className="flex flex-col items-center text-xs text-gray-400"><span>サマリー</span></button>
      </nav>

      {/* カード詳細モーダル（中央・背景あり・✕で閉じる） */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-4 max-w-xs w-full mx-4 relative"
            onClick={e => e.stopPropagation()}
          >
            <button className="absolute right-2 top-2 text-3xl text-gray-400 font-bold" onClick={() => setSelected(null)}>×</button>
            <img src={selected.imageUrl} alt="" className="w-40 h-56 object-contain rounded mx-auto mb-2 border shadow" />
            <div className="font-bold text-base mb-1 text-center">{selected.city}</div>
            <div className="text-xs text-gray-400 mb-1 text-center">{selected.id}</div>
            <div className="text-xs text-gray-600 mb-1 text-center">{selected.series} {selected.details}</div>
            <div className="text-xs mb-1 text-center">{selected.distributionPlace}</div>
            <div className="text-xs text-gray-500 mb-1 text-center">緯度: {selected.latitude}　経度: {selected.longitude}</div>
            <div className="flex gap-5 mt-3 justify-center">
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