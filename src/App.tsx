import { useEffect, useState } from "react";

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

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [coord, setCoord] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then((data: Card[]) => setCards(data));
  }, []);

  // チェック切替
  const toggle = (id: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ポップアップ用：カード情報
  const card = selected !== null ? cards[selected] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7fafc] to-[#fff4fa] flex flex-col pb-16 w-full max-w-[500px] mx-auto">
      {/* ヘッダー */}
      <header className="pt-4 pb-2 px-3 border-b bg-white">
        <div className="text-2xl font-black mb-1">マンホールカード管理</div>
      </header>
      {/* カードリスト */}
      <main className="flex-1 overflow-y-auto px-1 pb-20 bg-white">
        {cards.map((card, i) => (
          <div
            key={card.id}
            className="flex items-center border-b py-2 px-1 hover:bg-blue-50 cursor-pointer"
            onClick={() => setSelected(i)}
          >
            <img src={card.imageUrl} alt="" className="w-16 h-22 object-contain rounded bg-gray-100 border mr-2" style={{ width: 66, height: 90 }} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{card.city}</div>
              <div className="text-xs text-gray-500 truncate">{card.distributionPlace}</div>
            </div>
          </div>
        ))}
      </main>

      {/* 詳細ポップアップ */}
      {card && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl px-5 py-6 w-[98vw] max-w-sm relative" onClick={e => e.stopPropagation()}>
            {/* 閉じる */}
            <button className="absolute top-2 right-3 text-3xl text-gray-400 font-bold" onClick={() => setSelected(null)}>&times;</button>
            {/* カード画像＋基本情報 */}
            <div className="flex gap-3 items-center mb-3">
              <img src={card.imageUrl} alt="" className="w-20 h-28 object-contain rounded-md border shadow" />
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="font-bold text-lg truncate">{card.city}</div>
                <div className="text-xs text-gray-600">{card.prefecture}</div>
                <div className="text-xs text-gray-500">カードID: {card.details}</div>
              </div>
            </div>
            <div className="mb-2 text-xs text-gray-700">配布場所: {card.distributionPlace}</div>
            <div className="mb-2 text-xs text-gray-700">
              座標: <a href={`https://www.google.com/maps/search/?api=1&query=${card.latitude},${card.longitude}`} target="_blank" rel="noopener noreferrer" className="underline text-blue-700">{card.latitude},{card.longitude}</a>
            </div>
            <div className="mb-2">
              <a
                href={`https://ekikaramanhole.whitebeach.org/ext/manholecard/lmap/?lat=${card.latitude}&lng=${card.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-yellow-50 border border-yellow-300 rounded px-2 py-1 text-xs text-yellow-700 font-bold mb-1"
              >GKP公式MAPで見る</a>
            </div>
            {/* チェック */}
            <div className="flex gap-6 justify-center mt-4">
              <label className="flex items-center text-xs font-bold text-blue-600">
                <input type="checkbox" checked={owned.has(card.id)} onChange={() => toggle(card.id, setOwned)} />
                <span className="ml-1">カード取得済</span>
              </label>
              <label className="flex items-center text-xs font-bold text-green-600">
                <input type="checkbox" checked={coord.has(card.id)} onChange={() => toggle(card.id, setCoord)} />
                <span className="ml-1">座標蓋チェック済</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}