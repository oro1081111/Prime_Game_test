import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs
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

function timestampMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return Number(value) || 0;
}

function scoreTime(row) {
  return timestampMs(row.updatedAt || row.createdAt);
}

function compareRows(a, b, lb) {
  if (lb === 'time') {
    return (a.ms - b.ms)
      || ((a.undos || 0) - (b.undos || 0))
      || (scoreTime(a) - scoreTime(b));
  }
  return ((a.undos || 0) - (b.undos || 0))
    || (a.ms - b.ms)
    || (scoreTime(a) - scoreTime(b));
}

async function fetchScoreRows({ mode, size, lb = 'time' }) {
  const snap = await getDocs(collection(db, 'scores'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(row => row.mode === mode && Number(row.size) === Number(size) && row.kind === lb)
    .sort((a, b) => compareRows(a, b, lb));
}

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
  const start = Number(cursor || 0);
  const rankedRows = (await fetchScoreRows({ mode, size, lb }))
    .map((row, i) => ({ ...row, rank: i + 1 }));
  const rows = rankedRows.slice(start, start + pageSize);
  const nextCursor = start + pageSize < rankedRows.length ? start + pageSize : null;

  return { rows, cursor: nextCursor };
}

export async function calculateTimeRank({ mode, size, timeId }) {
  const rows = await fetchScoreRows({ mode, size, lb: 'time' });
  const index = rows.findIndex(row => row.id === timeId);
  return index === -1 ? null : index + 1;
}
