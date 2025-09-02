// assets/js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, where, orderBy, limit, getDocs, startAfter
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAbd97s2tRaR_VJXrBXGlibhMlSTujSl5w",
  authDomain: "prime-game-58db3.firebaseapp.com",
  projectId: "prime-game-58db3",
  storageBucket: "prime-game-58db3.firebasestorage.app",
  messagingSenderId: "1056693585850",
  appId: "1:1056693585850:web:a17b5e82a12fa6525bff83",
  measurementId: "G-0ZLPR7N4FB"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/** 寫入成績（回傳 docId） */
export async function submitScore({ mode, size, name, ms, undos }) {
  const ref = await addDoc(collection(db, "scores"), {
    mode,               // 'basic' | 'hard' | 'hidden'
    size,               // 5 | 7 | 10
    name,               // 玩家名稱
    ms,                 // 毫秒 (整數)
    undos,              // 取消次數 (整數)
    createdAt: serverTimestamp()
  });
  return ref.id;
}

/** 讀排行榜（分頁） */
export async function fetchLeaderboard({ mode, size, sort = "time", pageSize = 50, cursor = null }) {
  const base = [
    where("mode", "==", mode),
    where("size", "==", size),
  ];
  const orders = (sort === "time")
    ? [orderBy("ms", "asc"), orderBy("undos", "asc"), orderBy("createdAt", "asc")]
    : [orderBy("undos", "asc"), orderBy("ms", "asc"), orderBy("createdAt", "asc")];

  let q = query(collection(db, "scores"), ...base, ...orders, limit(pageSize));
  if (cursor) q = query(q, startAfter(cursor));

  const snap = await getDocs(q);
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.docs[snap.docs.length - 1] || null;

  return { rows, cursor: nextCursor };
}
