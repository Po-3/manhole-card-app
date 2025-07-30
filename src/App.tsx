import { useState, useEffect } from "react";

type Card = {
  id: string; series: string; imageUrl: string;
  prefecture: string; city: string; details: string;
};

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [popup, setPopup] = useState<Card|null>(null);

  useEffect(() => {
    fetch("/manhole_cards.json").then(res=>res.json()).then(setCards);
  }, []);

  // フィルタ等は省略可

  return (
    <div className="min-h-screen bg-gray-50 p-3 max-w-md mx-auto">
      <header className="text-orange-400 text-2xl font-bold py-3">ALL</header>
      {/* タブ・フィルタ群 */}
      <div className="flex gap-2 overflow-x-auto mb-3">
        <button className="bg-orange-400 text-white rounded-full px-4 py-1 font-bold">ALL</button>
        <button className="bg-gray-200 text-gray-500 rounded-full px-4 py-1">取得済</button>
        {/* ... */}
      </div>
      {/* グリッド */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(card=>(
          <button key={card.id} className="bg-orange-400 rounded-xl p-2 flex flex-col items-center"
            onClick={()=>setPopup(card)}
          >
            <div className="text-xl text-white font-extrabold mb-1">{card.series.replace(/[^\d]/g,'')}</div>
            <div className="h-16 w-full bg-white/90 rounded-md border flex items-center justify-center mb-1">
              <span className="text-2xl text-gray-300 font-extrabold">✓</span>
            </div>
            <div className="text-xs text-white truncate">{card.prefecture} {card.city}</div>
            <div className="text-xs font-mono text-white">{card.details}</div>
          </button>
        ))}
      </div>
      {/* 詳細スライドアップ */}
      {popup && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end" onClick={()=>setPopup(null)}>
          <div className="bg-gradient-to-t from-orange-300/90 to-orange-100/90 w-full p-5 rounded-t-2xl shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <div className="text-lg font-bold">{popup.series}　{popup.prefecture} {popup.city}</div>
              <button className="text-2xl" onClick={()=>setPopup(null)}>&times;</button>
            </div>
            <div className="text-base font-mono mb-2">{popup.details}</div>
            <div className="flex gap-2 mt-3">
              <a href="#" className="bg-white rounded px-3 py-1 shadow text-orange-600 font-bold">配布状況</a>
              <a href="#" className="bg-white rounded px-3 py-1 shadow text-orange-600 font-bold">検索</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}