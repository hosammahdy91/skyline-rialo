/**
 * Shared "chain" backed by Firebase Firestore.
 *
 * This plays the same role a real Rialo contract would play: one shared
 * source of truth every visitor reads and writes to. What this module
 * simulates from Rialo's native capabilities:
 *   1. An on-chain time trigger                -> tick() / settle()
 *   2. An HTTPS call from the contract itself   -> fetchMaxTemp(), no oracle
 *   3. Automatic execution and settlement       -> settle()
 *
 * Firestore here stands in for shared on-chain state. When this moves to
 * the real Rialo network, this file is swapped for real SDK calls; the
 * rest of the UI stays the same.
 */

import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  runTransaction,
  arrayUnion,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAMnnLVVt_dh_YdrBwoD6wFh_sFrW3dV7A',
  authDomain: 'skyline-6413c.firebaseapp.com',
  projectId: 'skyline-6413c',
  storageBucket: 'skyline-6413c.firebasestorage.app',
  messagingSenderId: '441735985750',
  appId: '1:441735985750:web:ba6af1519ae3df1d0b99f7',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const roomsCol = collection(db, 'rooms')

export const CITIES = [
  { id: 'cai', name: 'Cairo', lat: 30.0444, lon: 31.2357 },
  { id: 'nyc', name: 'New York', lat: 40.7128, lon: -74.006 },
  { id: 'lon', name: 'London', lat: 51.5072, lon: -0.1276 },
  { id: 'dxb', name: 'Dubai', lat: 25.2048, lon: 55.2708 },
  { id: 'sin', name: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { id: 'mad', name: 'Madrid', lat: 40.4168, lon: -3.7038 },
]

/* ---------- shared live cache ---------- */
/* A single subscription keeps every room in memory so getRoom/getRooms
   can stay synchronous for the rest of the app, same as before. */

let cache = []
const listeners = new Set()

onSnapshot(roomsCol, (snap) => {
  cache = snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt - a.createdAt)
  listeners.forEach((fn) => fn(cache))
})

export function subscribe(fn) {
  listeners.add(fn)
  fn(cache)
  return () => listeners.delete(fn)
}

export function getRooms() {
  return cache
}

export function getRoom(id) {
  return cache.find((r) => r.id === id) || null
}

/* ---------- chain log ---------- */

function entry(kind, text) {
  return { id: crypto.randomUUID(), at: Date.now(), kind, text }
}

/* ---------- create room ---------- */

export function createRoom({ cityId, threshold, stake, player, side, settleAt }) {
  const city = CITIES.find((c) => c.id === cityId)
  const id = crypto.randomUUID().slice(0, 8)
  const room = {
    id,
    city,
    threshold,
    stake,
    settleAt,
    status: 'open', // open | settling | settled
    bets: [{ id: crypto.randomUUID(), player, side, amount: stake }],
    result: null,
    log: [
      entry('deploy', `Contract deployed at rialo1${id}`),
      entry('arm', `On-chain time trigger armed for ${fmtTime(settleAt)}, no external bot needed`),
      entry('bet', `${player} staked ${stake} RIALO on "${sideLabel(side)}"`),
    ],
    createdAt: Date.now(),
  }
  setDoc(doc(roomsCol, id), room)
  return room
}

export async function joinRoom(roomId, { player, side }) {
  const ref = doc(roomsCol, roomId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const room = snap.data()
    if (room.status !== 'open') return
    if (room.bets.some((b) => b.player === player)) return
    tx.update(ref, {
      bets: arrayUnion({ id: crypto.randomUUID(), player, side, amount: room.stake }),
      log: arrayUnion(entry('bet', `${player} staked ${room.stake} RIALO on "${sideLabel(side)}"`)),
    })
  })
}

/* ---------- native web connectivity ---------- */

async function fetchMaxTemp(city, dateISO) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}` +
    `&longitude=${city.lon}&daily=temperature_2m_max&timezone=auto` +
    `&start_date=${dateISO}&end_date=${dateISO}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not reach the weather data source')
  const data = await res.json()
  const temp = data?.daily?.temperature_2m_max?.[0]
  if (typeof temp !== 'number') throw new Error('No temperature reading returned for that day')
  return temp
}

/* ---------- automatic settlement ---------- */

const claimed = new Set()

export async function settle(roomId) {
  if (claimed.has(roomId)) return
  const ref = doc(roomsCol, roomId)

  // Atomically claim settlement so two visitors racing the same due
  // room don't both try to run it at once.
  const claimedHere = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return false
    const room = snap.data()
    if (room.status !== 'open') return false
    tx.update(ref, {
      status: 'settling',
      log: arrayUnion(entry('wake', 'Contract woke itself up at the scheduled time')),
    })
    return true
  })
  if (!claimedHere) return
  claimed.add(roomId)

  try {
    const room = getRoom(roomId) || (await waitForCache(roomId))
    await wait(700)
    await updateLog(ref, entry('http', `GET api.open-meteo.com: max reading for ${room.city.name}`))

    try {
      const dateISO = new Date(room.settleAt).toLocaleDateString('en-CA')
      const temp = await fetchMaxTemp(room.city, dateISO)
      await wait(600)
      await updateLog(ref, entry('data', `Reading returned: ${temp.toFixed(1)}°`))

      const winningSide = temp > room.threshold ? 'over' : 'under'
      const winners = room.bets.filter((b) => b.side === winningSide)
      const pot = room.bets.reduce((s, b) => s + b.amount, 0)
      const payout = winners.length ? pot / winners.length : 0
      const result = { temp, winningSide, pot, payout, winners: winners.map((w) => w.player) }

      const payoutText =
        winners.length === 0
          ? `No one won. ${pot} RIALO refunded to depositors`
          : `${pot} RIALO split between ${winners.length} winner(s), ${payout.toFixed(1)} each`

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists()) return
        tx.update(ref, {
          status: 'settled',
          result,
          log: arrayUnion(entry('payout', payoutText)),
        })
      })
    } catch (err) {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists()) return
        tx.update(ref, {
          status: 'open',
          log: arrayUnion(entry('error', err.message + '. The contract will retry')),
        })
      })
    }
  } finally {
    claimed.delete(roomId)
  }
}

async function updateLog(ref, logEntry) {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    tx.update(ref, { log: arrayUnion(logEntry) })
  })
}

function waitForCache(roomId) {
  return new Promise((resolve) => {
    const unsub = subscribe((rooms) => {
      const room = rooms.find((r) => r.id === roomId)
      if (room) {
        unsub()
        resolve(room)
      }
    })
  })
}

/** Runs the time triggers for every room that's due. */
export function tick() {
  const now = Date.now()
  getRooms()
    .filter((r) => r.status === 'open' && new Date(r.settleAt).getTime() <= now)
    .forEach((r) => settle(r.id))
}

/* ---------- helpers ---------- */

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export function sideLabel(side) {
  return side === 'over' ? 'Over' : 'Under'
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleString('en-US', {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function countdown(iso) {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'due now'
  const h = Math.floor(ms / 3.6e6)
  const m = Math.floor((ms % 3.6e6) / 6e4)
  const s = Math.floor((ms % 6e4) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
