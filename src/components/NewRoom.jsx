import { useState } from 'react'
import { Flame, Snowflake } from 'lucide-react'
import { CITIES, createRoom } from '../lib/chain'

// Rooms must settle at least this far in the future so everyone invited
// has a real chance to join before the contract wakes up.
const MIN_LEAD_MINUTES = 15

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

function atTime(daysFromNow, hour) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, 0, 0, 0)
  return d
}

const now = new Date()
const minAllowed = new Date(now.getTime() + MIN_LEAD_MINUTES * 60 * 1000)

const PRESETS = [
  { label: 'This evening', date: atTime(0, 20) },
  { label: 'Tomorrow evening', date: atTime(1, 18) },
  { label: 'In 2 days', date: atTime(2, 18) },
].filter((p) => p.date > minAllowed)

const defaultDate = PRESETS[0]?.date || atTime(1, 18)

export default function NewRoom({ player, onClose, onCreated }) {
  const [cityId, setCityId] = useState('cai')
  const [threshold, setThreshold] = useState(35)
  const [stake, setStake] = useState(10)
  const [side, setSide] = useState('over')
  const [when, setWhen] = useState(toLocalInputValue(defaultDate))

  const settleDate = new Date(when)
  const tooSoon = isNaN(settleDate.getTime()) || settleDate < minAllowed

  function submit() {
    if (tooSoon) return
    const room = createRoom({
      cityId,
      threshold: Number(threshold),
      stake: Number(stake),
      player,
      side,
      settleAt: settleDate.toISOString(),
    })
    onCreated(room.id)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New room</h2>

        <div className="field">
          <label htmlFor="city">City</label>
          <select id="city" value={cityId} onChange={(e) => setCityId(e.target.value)}>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="th">Temperature threshold: {threshold}°</label>
          <input id="th" type="range" min="15" max="48" value={threshold}
            onChange={(e) => setThreshold(e.target.value)} />
        </div>

        <div className="field">
          <label>Your pick</label>
          <div className="sides">
            <button className={`side side-over ${side === 'over' ? 'is-on' : ''}`}
              onClick={() => setSide('over')}>
              <Flame size={20} color="var(--heat)" />
              <strong>Over</strong>
              <small>goes above {threshold}°</small>
            </button>
            <button className={`side side-under ${side === 'under' ? 'is-on' : ''}`}
              onClick={() => setSide('under')}>
              <Snowflake size={20} color="var(--cool)" />
              <strong>Under</strong>
              <small>stays at or below {threshold}°</small>
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="stake">Stake per player</label>
          <input id="stake" type="number" min="1" value={stake}
            onChange={(e) => setStake(e.target.value)} />
        </div>

        <div className="field">
          <label>Settlement time</label>
          {PRESETS.length > 0 && (
            <div className="chips" style={{ marginBottom: 10 }}>
              {PRESETS.map((p) => (
                <button key={p.label}
                  className={`chip ${when === toLocalInputValue(p.date) ? 'is-on' : ''}`}
                  onClick={() => setWhen(toLocalInputValue(p.date))}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <input type="datetime-local" value={when}
            min={toLocalInputValue(minAllowed)}
            onChange={(e) => setWhen(e.target.value)} />
          {tooSoon && (
            <small style={{ color: 'var(--heat)', display: 'block', marginTop: 6 }}>
              Pick a time at least {MIN_LEAD_MINUTES} minutes from now, so friends have time to join.
            </small>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" disabled={tooSoon} onClick={submit}>
            Deploy contract
          </button>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
