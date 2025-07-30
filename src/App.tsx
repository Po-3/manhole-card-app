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

// ---- Firestore 操作用ユーティリティをインライン ----

// 所持カードの取得 (cardId の配列を返す)
async function getOwnedCards(): Promise<string[]> {
  const user = getAuth().currentUser;
  if (!user) return [];
  const db = getFirestore();
  const col = collection(db, "users", user.uid, "cards");
  const snap = await getDocs(col);
  return snap.docs.map(d => d.id);
}

// カードを所持済みにする
async function addOwnedCard(cardId: string) {
  const user = getAuth().currentUser;
  if (!user) return;
  const db = getFirestore();
  const ref = doc(db, "users", user.uid, "cards", cardId);
  await setDoc(ref, { owned: true });
}

// カードの所持を削除する
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
  // --- Google認証 ---
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
<div className="min-h-screen p-4"
        className="bg-gradient-to-br from-indigo-100 via-pink-100 to-yellow-100">

      {/* 認証 */}
      <div style={{ textAlign: "right", marginBottom: 16 }}>
        {user ? (
          <>
            <span style={{ marginRight: 16 }}>こんにちは、{user.displayName}さん</span>
            <button onClick={handleLogout}>ログアウト</button>
          </>
        ) : (
          <button onClick={handleLogin}>Googleでログイン</button>
        )}
      </div>

      <h1>マンホールカード管理</h1>

      {/* 進捗バー */}
      <div
        style={{
          margin: "16px 0",
          padding: 10,
          background: "#f8f9fa",
          borderRadius: 10,
          boxShadow: "0 1px 4px #0001",
          display: "flex",
          alignItems: "center",
          gap: 24
        }}
      >
        <span>
          所持 {ownedCount} / {total}
          <button style={{ marginLeft: 12 }} onClick={handleEdit}>
            TOTAL編集
          </button>
        </span>
        <div
          style={{
            flex: 1,
            marginLeft: 20,
            background: "#ddd",
            borderRadius: 10,
            height: 16,
            position: "relative"
          }}
        >
          <div
            style={{
              width: percent + "%",
              height: "100%",
              background: "linear-gradient(90deg, #4caf50 50%, #c8e6c9 100%)",
              borderRadius: 10,
              transition: "width .3s"
            }}
          />
          <span
            style={{
              position: "absolute",
              right: 10,
              top: 0,
              fontWeight: "bold",
              color: "#333"
            }}
          >
            {percent}%
          </span>
        </div>
        <button onClick={exportCSV}>CSV出力</button>
        <input
          type="file"
          accept=".csv"
          onChange={importCSV}
          style={{ marginLeft: 10 }}
        />
      </div>

      {/* TOTAL編集モーダル */}
      {totalEdit && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={resetTotal}
        >
          <div
            style={{ background: "#fff", borderRadius: 12, padding: 30, minWidth: 260 }}
            onClick={e => e.stopPropagation()}
          >
            <h3>TOTAL枚数を編集</h3>
            <input
              type="number"
              defaultValue={total}
              min={1}
              style={{ width: "80px", fontSize: 18, marginRight: 12 }}
              onBlur={e => saveTotal(Number(e.target.value))}
              autoFocus
            />
            <button style={{ marginLeft: 10 }} onClick={resetTotal}>
              リセット
            </button>
          </div>
        </div>
      )}

      {/* 検索・フィルター */}
      <div style={{ display: "flex", gap: 12, margin: "16px 0" }}>
        <input
          type="search"
          value={search} 
          onChange={e => setSearch(e.target.value)}
          placeholder="市町村名、都道府県、No.で検索"
          style={{ width: 180, fontSize: 16 }}
        />
        <select value={filterPref} onChange={e => setFilterPref(e.target.value)} style={{ fontSize: 16 }}>
          <option value="ALL">都道府県すべて</option>
          {prefs.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterCity} onChange={e => setFilterCity(e.target.value)} style={{ fontSize: 16 }}>
          <option value="ALL">市町村すべて</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterVer} onChange={e => setFilterVer(e.target.value as any)} style={{ fontSize: 16 }}>
          <option value="ALL">バージョン全て</option>
          {versionLabels.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterOwned} onChange={e => setFilterOwned(e.target.value as any)} style={{ fontSize: 16 }}>
          <option value="ALL">所持/未所持すべて</option>
          <option value="OWNED">所持あり</option>
          <option value="NOTOWNED">未所持のみ</option>
        </select>
      </div>

{/* 一覧テーブル */}
+      <div className="overflow-x-auto w-full">
+        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr>
              <th>画像</th>
              <th>市町村</th>
              <th>No.</th>
              {versionLabels.map(label => <th key={label}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {showList.map((g, i) => (
              <tr key={`${g.city}-${g.no}`}>
                {/* ・・・ */}
              </tr>
            ))}
          </tbody>
          </table>
           </div>

      {/* ページネーション */}
      <div style={{ margin: "24px 0", textAlign: "center" }}>
        {Array.from({ length: pageMax }, (_, i) => i + 1).map(pn => (
          <button
            key={pn}
            onClick={() => setPage(pn)}
            style={{
              fontWeight: page === pn ? "bold" : undefined,
              margin: "0 2px",
              padding: "2px 10px",
              borderRadius: 6
            }}
          >
            {pn}
          </button>
        ))}
      </div>

      <p style={{ color: "#777" }}>
        （{filtered.length}件中 {showList.length}件表示／サムネイルクリックで拡大）
      </p>

      {/* 画像拡大モーダル */}
      {modalUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
          onClick={() => setModalUrl(null)}
        >
          <img
            src={modalUrl}
            alt="拡大画像"
            style={{
              maxWidth: "80vw",
              maxHeight: "80vh",
              boxShadow: "0 2px 16px rgba(0,0,0,0.7)",
              background: "#fff",
              borderRadius: 8,
              padding: 8
            }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setModalUrl(null)}
            style={{
              position: "fixed",
              top: 30,
              right: 30,
              fontSize: 30,
              color: "#fff",
              background: "transparent",
              border: "none",
              cursor: "pointer"
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}