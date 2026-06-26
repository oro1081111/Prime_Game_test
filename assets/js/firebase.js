import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
  collection, query, where, orderBy, limit, getDocs, startAfter
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAbd97s2tRaR_VJXrBXGlibhMlSTujSl5w",
  authDomain: "prime-game-58db3.firebaseapp.com",
  projectId: "prime-game-58db3",
  storageBucket: "prime-game-58db3.firebasestorage.app",
  messagingSenderId: "1056693585850",
  appId: "1:1056693585850:web:a17b5e82a12fa6525bff83"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * 寫入個人最佳成績（時間槽 / 取消槽各一 doc，以 setDoc 覆寫）
 * docId 格式：{uid}__{mode}__{size}__time | __undo
 * 回傳 { beatTime, beatUndo }
 */
export async function submitScore({ uid, name, mode, size, ms, undos }) {
  const timeId = `${uid}__${mode}__${size}__time`;
  const undoId  = `${uid}__${mode}__${size}__undo`;

  const [timeSnap, undoSnap] = await Promise.all([
    getDoc(doc(db, 'scores', timeId)),
    getDoc(doc(db, 'scores', undoId))
  ]);
  const prevTime = timeSnap.exists() ? timeSnap.data() : null;
  const prevUndo = undoSnap.exists()  ? undoSnap.data()  : null;

  const beatTime = !prevTime || ms < prevTime.ms || (ms === prevTime.ms && undos < prevTime.undos);
  const beatUndo = !prevUndo || undos < prevUndo.undos || (undos === prevUndo.undos && ms < prevUndo.ms);

  const record = { uid, name, mode, size: Number(size), ms: Number(ms), undos: Number(undos), updatedAt: serverTimestamp() };
  const writes = [];
  if (beatTime) writes.push(setDoc(doc(db, 'scores', timeId), { ...record, kind: 'time' }));
  if (beatUndo) writes.push(setDoc(doc(db, 'scores', undoId), { ...record, kind: 'undo' }));
  await Promise.all(writes);

  return { beatTime, beatUndo };
}

/**
 * 讀排行榜（分頁）
 * lb: 'time' | 'undo'
 */
export async function fetchLeaderboard({ mode, size, lb = 'time', pageSize = 50, cursor = null }) {
  const base = [
    where('mode', '==', mode),
    where('size', '==', size),
    where('kind', '==', lb),
  ];
  const orders = (lb === 'time')
    ? [orderBy('ms', 'asc'), orderBy('undos', 'asc'), orderBy('updatedAt', 'asc')]
    : [orderBy('undos', 'asc'), orderBy('ms', 'asc'), orderBy('updatedAt', 'asc')];

  let q = query(collection(db, 'scores'), ...base, ...orders, limit(pageSize));
  if (cursor) q = query(q, startAfter(cursor));

  const snap = await getDocs(q);
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.docs[snap.docs.length - 1] || null;

  return { rows, cursor: nextCursor };
}
