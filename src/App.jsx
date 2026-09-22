import { useEffect, useState } from 'react'
import {
  CloudSun,
  Plus,
  ArrowLeft,
  Users,
  Coins,
  Timer,
  Flame,
  Snowflake,
  Activity,
  Trophy,
  Radio,
  UserPlus,
} from 'lucide-react'
import Dial from './components/Dial'
import ChainLog from './components/ChainLog'
import NewRoom from './components/NewRoom'
import {
  subscribe,
  getRoom,
  joinRoom,
  tick,
  countdown,
  fmtTime,
  sideLabel,
} from './lib/chain'

const NAME_KEY = 'rialo.sky.player'

export default function App() {
  const [rooms, setRooms] = useState([])
  const [openId, setOpenId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [player, setPlayer] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [, force] = useState(0)

  useEffect(() => subscribe(setRooms), [])

  // Network heartbeat: checks contract time triggers and refreshes countdowns.
  useEffect(() => {
    const t = setInterval(() => {
      tick()
      force((n) => n + 1)
    }, 1000)
    return () => clearInterval(t)
  }, [])

  function savePlayer(name) {
    localStorage.setItem(NAME_KEY, name)
    setPlayer(name)
  }

  if (!player) return <Welcome onDone={savePlayer} />

  const room = openId ? getRoom(openId) : null

  return (
    <div className="shell">
      <header className="topbar">
        <div className="mark">
          <CloudSun size={24} />
          Skyline
          <small>Weather bets on Rialo</small>
        </div>
        <div className="spacer" />
        {room ? (
          <button className="btn btn-ghost" onClick={() => setOpenId(null)}>
            <ArrowLeft size={16} />
            All rooms
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={17} />
            New room
          </button>
        )}
      </header>

      {room ? (
        <RoomView room={room} player={player} />
      ) : (
        <Lobby rooms={rooms} onOpen={setOpenId} onCreate={() => setCreating(true)} />
      )}

      {creating && (
        <NewRoom
          player={player}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            setOpenId(id)
          }}
        />
      )}
    </div>
  )
}

/* ---------- welcome ---------- */

function Welcome({ onDone }) {
  const [name, setName] = useState('')
  return (
    <div className="shell" style={{ maxWidth: 440, paddingTop: 90 }}>
      <div className="mark" style={{ marginBottom: 26 }}>
        <CloudSun size={26} />
        Skyline
        <small>Weather bets on Rialo</small>
      </div>
      <h1 style={{ fontSize: 34, marginBottom: 10 }}>Bet your friends on tomorrow's weather</h1>
      <p style={{ color: 'var(--dim)', marginBottom: 28 }}>
        Stake a bet and pick a side. When the time comes, the contract wakes itself up,
        reads the real temperature off the internet, and pays out the winners.
        No oracle, no server.
      </p>
      <div className="field">
        <label htmlFor="name">Your name in the rooms</label>
        <input id="name" value={name} autoFocus placeholder="e.g. Alex"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onDone(name.trim())} />
      </div>
      <button className="btn btn-primary" disabled={!name.trim()} onClick={() => onDone(name.trim())}>
        Get started
      </button>
    </div>
  )
}

/* ---------- room list ---------- */

function Lobby({ rooms, onOpen, onCreate }) {
  if (!rooms.length) {
    return (
      <div className="empty">
        <CloudSun size={44} />
        <h2>No rooms yet</h2>
        <p>
          Create your first room: pick a city and a temperature threshold, then invite your
          friends before settlement time.
        </p>
        <button className="btn btn-primary" onClick={onCreate}>
          <Plus size={17} />
          New room
        </button>
      </div>
    )
  }

  return (
    <>
      <h1 style={{ fontSize: 28, marginBottom: 18 }}>Open rooms</h1>
      <div className="grid">
        {rooms.map((r) => (
          <button key={r.id} className="room" onClick={() => onOpen(r.id)}>
            <div className="room-head">
              <StatusTag room={r} />
            </div>
            <h3>
              {r.city.name} above <span className="deg num">{r.threshold}°</span>?
            </h3>
            <div style={{ color: 'var(--dim)', fontSize: 14 }}>
              {r.status === 'settled'
                ? `Final reading ${r.result.temp.toFixed(1)}°, "${sideLabel(
                    r.result.winningSide,
                  )}" won`
                : fmtTime(r.settleAt)}
            </div>
            <div className="room-foot">
              <span>
                <Users size={14} />
                <span className="num">{r.bets.length}</span>
              </span>
              <span>
                <Coins size={14} />
                <span className="num">{r.bets.length * r.stake}</span> RIALO
              </span>
              {r.status === 'open' && (
                <span style={{ marginInlineStart: 'auto' }}>
                  <Timer size={14} />
                  <span className="num">{countdown(r.settleAt)}</span>
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

function StatusTag({ room }) {
  if (room.status === 'settling')
    return (
      <span className="tag tag-settling pulse">
        <Radio size={12} />
        Reading weather
      </span>
    )
  if (room.status === 'settled')
    return (
      <span className="tag tag-settled">
        <Trophy size={12} />
        Settled
      </span>
    )
  return (
    <span className="tag tag-open">
      <Activity size={12} />
      Open
    </span>
  )
}

/* ---------- room page ---------- */

function RoomView({ room, player }) {
  const [guest, setGuest] = useState('')
  const [guestSide, setGuestSide] = useState('over')

  const joined = room.bets.find((b) => b.player === player)
  const pot = room.bets.length * room.stake
  const over = room.bets.filter((b) => b.side === 'over').length
  const under = room.bets.length - over

  const caption =
    room.status === 'settled'
      ? 'Final reading'
      : room.status === 'settling'
        ? 'Reading now'
        : `Threshold ${room.threshold}°`

  return (
    <div className="room-layout">
      <div className="panel">
        <StatusTag room={room} />
        <h1 style={{ fontSize: 26, margin: '12px 0 4px' }}>
          {room.city.name} above <span style={{ color: 'var(--gold)' }} className="num">{room.threshold}°</span>?
        </h1>
        <p style={{ color: 'var(--dim)', fontSize: 14, margin: '0 0 8px' }}>
          Settles {fmtTime(room.settleAt)}
          {room.status === 'open' && <> · <span className="num">{countdown(room.settleAt)}</span> left</>}
        </p>

        <Dial threshold={room.threshold} reading={room.result?.temp} caption={caption} />

        <div className="sides" style={{ marginTop: 6 }}>
          <div className={`side side-over ${room.result?.winningSide === 'over' ? 'is-on' : ''}`}>
            <Flame size={18} color="var(--heat)" />
            <strong>Over</strong>
            <small><span className="num">{over}</span> staked</small>
          </div>
          <div className={`side side-under ${room.result?.winningSide === 'under' ? 'is-on' : ''}`}>
            <Snowflake size={18} color="var(--cool)" />
            <strong>Under</strong>
            <small><span className="num">{under}</span> staked</small>
          </div>
        </div>

        <div className="room-foot">
          <span>
            <Coins size={14} />
            Pot <span className="num">{pot}</span> RIALO
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 18 }}>
        <div className="panel">
          <div className="section-title">
            <Users size={17} />
            Depositors
          </div>
          <ul className="players">
            {room.bets.map((b) => (
              <li key={b.id}>
                <span className={`avatar ${b.side}`}>{b.player.slice(0, 1)}</span>
                <span>{b.player}</span>
                <span style={{ color: 'var(--dim)', fontSize: 13 }}>{sideLabel(b.side)}</span>
                {room.result?.winners.includes(b.player) && (
                  <span className="won">
                    <Trophy size={13} />+{room.result.payout.toFixed(1)}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {room.status === 'open' && (
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              {!joined && (
                <p style={{ fontSize: 13, color: 'var(--dim)', margin: '0 0 10px' }}>
                  You haven't staked in this room yet.
                </p>
              )}
              <div className="field" style={{ marginBottom: 10 }}>
                <label htmlFor="guest">Add a depositor</label>
                <input id="guest" value={guest} placeholder="Friend's name"
                  onChange={(e) => setGuest(e.target.value)} />
              </div>
              <div className="sides" style={{ marginBottom: 12 }}>
                <button className={`side side-over ${guestSide === 'over' ? 'is-on' : ''}`}
                  onClick={() => setGuestSide('over')}>
                  <strong>Over</strong>
                </button>
                <button className={`side side-under ${guestSide === 'under' ? 'is-on' : ''}`}
                  onClick={() => setGuestSide('under')}>
                  <strong>Under</strong>
                </button>
              </div>
              <button className="btn btn-primary" disabled={!guest.trim()}
                onClick={() => {
                  joinRoom(room.id, { player: guest.trim(), side: guestSide })
                  setGuest('')
                }}>
                <UserPlus size={16} />
                Stake {room.stake} RIALO
              </button>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="section-title">
            <Activity size={17} />
            What the contract is doing
          </div>
          <ChainLog entries={room.log} />
        </div>
      </div>
    </div>
  )
}
