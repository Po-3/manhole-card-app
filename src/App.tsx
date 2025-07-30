import { useEffect, useState } from "react";
import { auth, provider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firestore Utility
async function getOwnedCards(): Promise<string[]> {
  const user = getAuth().currentUser;
  if (!user) return [];
  const db = getFirestore();
  const col = collection(db, "users", user.uid, "cards");
  const snap = await getDocs(col);
  return snap.docs.map(d => d.id);
}
async function addOwnedCard(cardId: string) {
  const user = getAuth().currentUser;
  if (!user) return;
  const db = getFirestore();
  const ref = doc(db, "users", user.uid, "cards", cardId);
  await setDoc(ref, { owned: true });
}
async function removeOwnedCard(cardId: string) {
  const user = getAuth().currentUser;
  if (!user) return;
  const db = getFirestore();
  const ref = doc(db, "users", user.uid, "cards", cardId);
  await deleteDoc(ref);
}

// 型定義
type VersionType = "通常" | "英語" | "特別";
type Card = {
  id: string;
  city: string;
  prefecture: string;
  series: string;
  imageUrl: string;
};
type CardGroup = {
  city: string;
  no: string;
  prefecture: string;
  versions: { version: VersionType; imageUrl: string }[];
  owned: { [K in VersionType]?: boolean };
};

const STORAGE_KEY = "manhole_owned_v2";
const TOTAL_KEY = "manhole_total";
const versionLabels: VersionType[] = ["通常", "英語", "特別"];
const pageSize = 100;

// バージョン判定
function getCardNo(cardId: string) {
  const m = cardId.match(/([A-Z]\d{3})$/);
  return m ? m[1] : cardId;
}
function seriesToVersion(id: string, series: string): VersionType {
  if (id.startsWith("E-")) return "英語";
  if (series.includes("特別")) return "特別";
  return "通常";
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const handleLogin = () => signInWithPopup(auth, provider);
  const handleLogout = () => signOut(auth);

  // 状態管理
  const [groups, setGroups] = useState<CardGroup[]>([]);
  const [filtered, setFiltered] = useState<CardGroup[]>([]);
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterVer, setFilterVer] = useState<VersionType | "ALL">("ALL");
  const [filterOwned, setFilterOwned] = useState<"ALL" | "OWNED" | "NOTOWNED">("ALL");
  const [filterPref, setFilterPref] = useState("ALL");
  const [filterCity, setFilterCity] = useState("ALL");
  const [page, setPage] = useState(1);
  const [customTotal, setCustomTotal] = useState<number | null>(null);
  const [totalEdit, setTotalEdit] = useState(false);

  // データ読込と初期化
  useEffect(() => {
    fetch("/manhole_cards.json")
      .then(res => res.json())
      .then(async (cards: Card[]) => {
        const groupsMap = new Map<string, CardGroup>();
        for (const card of cards) {
          const no = getCardNo(card.id);
          const key = `${card.city}-${no}`;
          const version = seriesToVersion(card.id, card.series);
          if (!groupsMap.has(key)) {
            groupsMap.set(key, {
              city: card.city,
              no,
              prefecture: card.prefecture,
              versions: [],
              owned: {},
            });
          }
          const g = groupsMap.get(key)!;
          if (!g.versions.some(v => v.version === version)) {
            g.versions.push({ version, imageUrl: card.imageUrl });
            g.owned[version] = false;
          }
        }

        // Firestoreから所持データ取得
        if (user) {
          const ownedList = await getOwnedCards();
          for (const g of groupsMap.values()) {
            const idKey = `${g.city}-${g.no}`;
            for (const v of g.versions) {
              g.owned[v.version] = ownedList.includes(`${idKey}-${v.version}`);
            }
          }
        }

        // localStorage 復元
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          for (const g of groupsMap.values()) {
            const k = `${g.city}-${g.no}`;
            if (data[k]) g.owned = { ...g.owned, ...data[k] };
          }
        }

        // カスタムTOTAL復元
        const custom = localStorage.getItem(TOTAL_KEY);
        if (custom && !isNaN(+custom)) setCustomTotal(Number(custom));

        const arr = Array.from(groupsMap.values());
        setGroups(arr);
        setFiltered(arr);
      });
  }, [user]);

  // 検索・フィルター
  useEffect(() => {
    let r = groups;
    if (search) {
      r = r.filter(
        g =>
          g.city.includes(search) ||
          g.prefecture.includes(search) ||
          g.no.includes(search)
      );
    }
    if (filterPref !== "ALL") r = r.filter(g => g.prefecture === filterPref);
    if (filterCity !== "ALL") r = r.filter(g => g.city === filterCity);
    if (filterVer !== "ALL") r = r.filter(g => g.versions.some(v => v.version === filterVer));
    if (filterOwned !== "ALL") {
      r = r.filter(g =>
        filterOwned === "OWNED"
          ? versionLabels.some(ver => g.owned[ver])
          : !versionLabels.some(ver => g.owned[ver])
      );
    }
    setFiltered(r);
    setPage(1);
  }, [groups, search, filterVer, filterOwned, filterPref, filterCity]);

  // トグル
  const toggle = (idx: number, version: VersionType) => {
    const g = filtered[idx];
    const idKey = `${g.city}-${g.no}`;
    const now = !!g.owned[version];

    if (!now) addOwnedCard(`${idKey}-${version}`);
    else removeOwnedCard(`${idKey}-${version}`);

    const next = groups.map(x =>
      x.city === g.city && x.no === g.no
        ? { ...x, owned: { ...x.owned, [version]: !now } }
        : x
    );
    setGroups(next);

    const toSave: Record<string, any> = {};
    next.forEach(x => {
      toSave[`${x.city}-${x.no}`] = x.owned;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  };

  // 進捗
  const total =
    customTotal && customTotal > 0
      ? customTotal
      : groups.reduce((s, g) => s + g.versions.length, 0);
  const ownedCount = groups.reduce(
    (s, g) => s + versionLabels.filter(v => g.owned[v]).length,
    0
  );
  const percent = total ? Math.round((ownedCount / total) * 1000) / 10 : 0;

  // TOTAL 編集
  const handleEdit = () => setTotalEdit(true);
  const saveTotal = (v: number) => {
    setCustomTotal(v);
    localStorage.setItem(TOTAL_KEY, String(v));
    setTotalEdit(false);
  };
  const resetTotal = () => {
    setCustomTotal(null);
    localStorage.removeItem(TOTAL_KEY);
    setTotalEdit(false);
  };

  // ページ分割
  const pageMax = Math.ceil(filtered.length / pageSize);
  const showList = filtered.slice((page - 1) * pageSize, page * pageSize);

  // フィルタ用データ
  const prefs = Array.from(new Set(groups.map(g => g.prefecture))).sort();
  const cities = Array.from(
    new Set(
      groups
        .filter(g => filterPref === "ALL" || g.prefecture === filterPref)
        .map(g => g.city)
    )
  ).sort();

  return (
    <div className="bg-gradient-to-br from-indigo-100 via-pink-100 to-yellow-100 min-h-screen py-4">
      <div className="max-w-5xl mx-auto px-2">

        {/* 認証・タイトル */}
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-[#24344d] mb-2 tracking-tight text-center drop-shadow">
            マンホールカードコレクション
          </h1>
          <div>
            {user ? (
              <>
                <span className="mr-2 text-sm">こんにちは、{user.displayName}さん</span>
                <button className="bg-gray-700 text-white px-4 py-1 rounded" onClick={handleLogout}>ログアウト</button>
              </>
            ) : (
              <button className="bg-blue-500 text-white px-4 py-1 rounded" onClick={handleLogin}>Googleでログイン</button>
            )}
          </div>
        </div>

        {/* 進捗バー */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="font-medium text-sm">
            所持 <b>{ownedCount}</b> / {total}
            <button className="ml-2 bg-gray-200 px-2 py-0.5 rounded text-xs" onClick={handleEdit}>
              TOTAL編集
            </button>
          </span>
          <div className="flex-1 min-w-[120px] bg-gray-200 rounded h-4 relative overflow-hidden mx-2">
            <div
              className="bg-green-400 rounded h-4 transition-all"
              style={{ width: percent + "%" }}
            />
            <span className="absolute right-2 top-0 text-xs font-bold text-gray-800">{percent}%</span>
          </div>
        </div>

        {/* TOTAL編集モーダル */}
{totalEdit && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    onClick={resetTotal}
  >
    <div
      className="bg-white rounded-lg p-6 min-w-[220px] shadow-xl"
      onClick={e => e.stopPropagation()}
    >
      <h3 className="mb-3 font-bold text-center text-lg">TOTAL枚数を編集</h3>
      <input
        type="number"
        defaultValue={total}
        min={1}
        className="w-20 p-1 border border-gray-300 rounded mr-2 text-center"
        onBlur={e => saveTotal(Number(e.target.value))}
        autoFocus
      />
      <button
        className="bg-gray-300 px-2 py-1 rounded text-xs mt-2"
        onClick={resetTotal}
      >
        リセット
      </button>
    </div>
  </div>
)}

        {/* 検索・フィルター */}
        <div className="flex flex-wrap gap-2 mb-5 sm:flex-col">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="市町村名、都道府県、No.で検索"
            className="w-44 sm:w-full px-2 py-1 rounded border border-gray-300"
          />
          <select value={filterPref} onChange={e => setFilterPref(e.target.value)} className="w-32 sm:w-full px-2 py-1 rounded border border-gray-300">
            <option value="ALL">都道府県すべて</option>
            {prefs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="w-32 sm:w-full px-2 py-1 rounded border border-gray-300">
            <option value="ALL">市町村すべて</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterVer} onChange={e => setFilterVer(e.target.value as any)} className="w-28 sm:w-full px-2 py-1 rounded border border-gray-300">
            <option value="ALL">バージョン全て</option>
            {versionLabels.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterOwned} onChange={e => setFilterOwned(e.target.value as any)} className="w-36 sm:w-full px-2 py-1 rounded border border-gray-300">
            <option value="ALL">所持/未所持すべて</option>
            <option value="OWNED">所持あり</option>
            <option value="NOTOWNED">未所持のみ</option>
          </select>
        </div>

{/* カード一覧グリッド */}
<div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
  {showList.map((g, i) => (
    <div
      key={`${g.city}-${g.no}`}
      className="bg-white rounded-lg shadow border hover:shadow-lg transition-all flex flex-col items-center pb-2 pt-2 px-1"
    >
      <img
        src={g.versions[0].imageUrl}
        alt={`${g.city} サムネイル`}
  className="w-9 h-12 object-contain rounded border mb-1 cursor-pointer"
        onClick={() => setModalUrl(g.versions[0].imageUrl)}
      />
      <div className="text-center w-full mb-0.5">
        <div className="font-semibold text-xs truncate">{g.city}</div>
        <div className="text-[10px] text-gray-500 truncate">{g.prefecture}</div>
        <div className="text-[10px] text-gray-400">{g.no}</div>
      </div>
      <div className="flex justify-center gap-1">
        {versionLabels.map(label =>
          g.versions.some(v => v.version === label) ? (
            <label key={label} className="flex items-center gap-0.5 text-[10px] font-medium">
              <input
                type="checkbox"
                className="accent-blue-400"
                checked={!!g.owned[label]}
                onChange={() => toggle((page - 1) * pageSize + i, label)}
              />
              <span>{label}</span>
            </label>
          ) : null
        )}
      </div>
    </div>
  ))}
</div>

        {/* ページネーション */}
        <div className="mt-5 mb-1 flex flex-wrap justify-center gap-1">
          {Array.from({ length: pageMax }, (_, i) => i + 1).map(pn => (
            <button
              key={pn}
              onClick={() => setPage(pn)}
              className={`px-3 py-1 rounded border text-xs ${page === pn ? "bg-indigo-400 text-white font-bold" : "bg-white border-gray-300 text-gray-700"}`}
            >
              {pn}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 mb-2 text-center">
          （{filtered.length}件中 {showList.length}件表示／サムネイルクリックで拡大）
        </p>
      </div>

      {/* 画像拡大モーダル */}
      {modalUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setModalUrl(null)}>
          <img
            src={modalUrl}
            alt="拡大画像"
            className="max-w-[90vw] max-h-[80vh] shadow-2xl bg-white rounded-lg p-2"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setModalUrl(null)}
            className="absolute top-6 right-8 text-4xl font-bold text-white bg-black/50 rounded-full w-12 h-12 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}