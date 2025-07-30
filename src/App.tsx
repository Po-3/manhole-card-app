import { useState, useEffect } from "react";

type Card = {
  id: string;
  city: string;
  no: string;
  code: string;
  place: string;
  image: string;
  latitude: number;
  longitude: number;
};

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<Card | null>(null);

  // JSONファイルからデータを読む
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then(data => setCards(data));
  }, []);

  // 所持数ダミー（本番はStateやDBで管理！）
  const total = cards.length;
  const owned = 0;
  const real = 0;
  const percent = total === 0 ? 0 : Math.floor((owned / total) * 100);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* サマリー */}
      <header className="px-4 py-3 bg-white border-b">
        <h1 className="text-lg font-bold text-center mb-2">マンホールカード</h1>
        <div className="flex justify-around items-end mb-2">
          <div className="text-center">
            <div className="text-gray-500 text-xs">カード</div>
            <div className="text-2xl font-bold">{owned}</div>
            <div className="text-xs text-gray-400">{percent}%</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-xs">計</div>
            <div className="text-2xl font-bold">{total}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-500 text-xs">実物</div>
            <div className="text-2xl font-bold">{real}</div>
            <div className="text-xs text-gray-400">0%</div>
          </div>
        </div>
      </header>

      {/* カードリスト */}
      <main className="flex-1 overflow-y-auto px-2 pb-24 bg-white">
        {cards.map(card => (
          <div
            key={card.id}
            className="flex items-center p-2 border-b hover:bg-gray-50 cursor-pointer"
            onClick={() => setSelected(card)}
          >
            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-md mr-2 overflow-hidden flex items-center justify-center">
              <img src={card.image} alt="" className="w-12 h-12 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-base truncate">{card.city}（{card.no}）</div>
              <div className="text-xs text-gray-500 truncate">{card.place}</div>
            </div>
            <div className="text-xs text-gray-400 ml-2">{card.code}</div>
          </div>
        ))}
      </main>

      {/* 下部ナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-1 z-50">
        <button className="flex flex-col items-center text-xs text-gray-700"><span>カード</span></button>
        <button className="flex flex-col items-center text-xs text-gray-400"><span>アイテム</span></button>
        <button className="flex flex-col items-center text-xs text-gray-400"><span>写真</span></button>
        <button className="flex flex-col items-center text-xs text-gray-400"><span>サマリー</span></button>
      </nav>

      {/* 詳細モーダル */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-xl p-5 shadow-xl w-[92vw] max-w-lg relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute right-2 top-2">
              <button onClick={() => setSelected(null)} className="text-gray-400 text-3xl leading-4">×</button>
            </div>
            <h2 className="text-base font-bold mb-2">{selected.city}（{selected.no}）</h2>
            <img src={selected.image} alt="" className="w-28 h-28 rounded mx-auto mb-2 border" />
            <div className="text-xs mb-1">{selected.place}</div>
            <div className="text-xs text-gray-400 mb-2">{selected.code}</div>
            <div className="text-xs text-gray-600 mb-1">
              緯度: {selected.latitude}, 経度: {selected.longitude}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}