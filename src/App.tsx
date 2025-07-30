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

// ---- Firestore 操作用ユーティリティ ----
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

// ---- 型定義 ----
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

// ---- バージョン判定 ----
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

        // Firestore から所持データ取得
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

  // CSV 出力
  const exportCSV = () => {
    const rows = [["市町村", "No.", ...versionLabels.map(v => v + "所持")]];
    groups.forEach(g => {
      rows.push([
        g.city,
        g.no,
        ...versionLabels.map(v =>
          g.owned[v] ? "1" : g.versions.some(x => x.version === v) ? "0" : ""
        ),
      ]);
    });
    const csv =
      "\uFEFF" +
      rows.map(r => r.map(f => `"${f.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manhole_collection.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV インポート
  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/);
      const hdr = lines[0].split(",");
      const newGroups = groups.map(g => ({ ...g, owned: { ...g.owned } }));
      lines.slice(1).forEach(line => {
        const cols = line.split(",");
        if (cols.length < 2) return;
        const city = cols[0].replace(/"/g, "");
        const no = cols[1].replace(/"/g, "");
        const i = newGroups.findIndex(g => g.city === city && g.no === no);
        if (i < 0) return;
        versionLabels.forEach((v, vi) => {
          if (hdr[2 + vi] && cols[2 + vi]) {
            newGroups[i].owned[v] = cols[2 + vi].replace(/"/g, "") === "1";
          }
        });
      });
      setGroups(newGroups);
      setFiltered(newGroups);
      const save: Record<string, any> = {};
      newGroups.forEach(g => {
        save[`${g.city}-${g.no}`] = g.owned;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    };
    reader.readAsText(file, "utf-8");
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
    <div className="min-h-screen p-4 bg-gradient-to-br from-indigo-100 via-pink-100 to-yellow-100">

      {/* 認証・タイトル */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <h1 className="text-xl font-bold tracking-tight">マンホールカード</h1>
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

      {/* 進捗バー&CSV */}
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
        <button className="bg-gray-700 text-white px-3 py-1 rounded text-xs" onClick={exportCSV}>CSV出力</button>
        <input type="file" accept=".csv" onChange={importCSV} className="ml-2 text-xs" />
      </div>

      {/* TOTAL編集モーダル */}
      {totalEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={resetTotal}>
          <div className="bg-white rounded-lg p-6 min-w-[220px]" onClick={e => e.stopPropagation()}>
            <h3 className="mb-3 font-bold">TOTAL枚数を編集</h3>
            <input
              type="number"
              defaultValue={total}
              min={1}
              className="w-20 p-1 border border-gray-300 rounded mr-2"
              onBlur={e => saveTotal(Number(e.target.value))}
              autoFocus
            />
            <button className="bg-gray-300 px-2 py-1 rounded text-xs" onClick={resetTotal}>
              リセット
            </button>
          </div>
        </div>
      )}

      {/* 検索・フィルター（縦並び&ラップ対応） */}
      <div className="flex flex-wrap gap-2 mb-4 sm:flex-col">
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

      {/* 一覧テーブル（横スクロール可） */}
<div className="card-list">
  {showList.map((g, i) => (
    <div className="card-box" key={`${g.city}-${g.no}`}>
      <img
        className="card-img"
        src={g.versions[0].imageUrl}
        alt="サムネイル"
        onClick={() => setModalUrl(g.versions[0].imageUrl)}
      />
      <div className="card-info">
        <b>{g.city}</b>
        <span>{g.prefecture}</span>
        <span>No: {g.no}</span>
      </div>
      <div className="check-row">
        {versionLabels.map(label =>
          g.versions.some(v => v.version === label) ? (
            <label key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                className="custom-check"
                type="checkbox"
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

      <p className="text-xs text-gray-500 mb-2">
        （{filtered.length}件中 {showList.length}件表示／サムネイルクリックで拡大）
      </p>

      {/* 画像拡大モーダル */}
      {modalUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          onClick={() => setModalUrl(null)}
        >
          <img
            src={modalUrl}
            alt="拡大画像"
            className="max-w-[90vw] max-h-[80vh] shadow-2xl bg-white rounded-lg p-2"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setModalUrl(null)}
            className="absolute top-5 right-5 text-3xl font-bold text-white bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}

    </div>
  );
}