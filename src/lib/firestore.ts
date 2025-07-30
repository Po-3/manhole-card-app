import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// 所持カードの取得
export const getOwnedCards = async () => {
  const user = getAuth().currentUser;
  if (!user) return [];

  const db = getFirestore();
  const col = collection(db, "users", user.uid, "cards");
  const snapshot = await getDocs(col);
  return snapshot.docs.map(doc => doc.id); // 所持してるcardId配列
};

// カードを所持済みにする
export const addOwnedCard = async (cardId: string) => {
  const user = getAuth().currentUser;
  if (!user) return;

  const db = getFirestore();
  const ref = doc(db, "users", user.uid, "cards", cardId);
  await setDoc(ref, { owned: true });
};

// カードの所持を削除する
export const removeOwnedCard = async (cardId: string) => {
  const user = getAuth().currentUser;
  if (!user) return;

  const db = getFirestore();
  const ref = doc(db, "users", user.uid, "cards", cardId);
  await deleteDoc(ref);
};