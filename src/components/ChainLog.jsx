import {
  Rocket,
  AlarmClock,
  Coins,
  Zap,
  Globe,
  Thermometer,
  Trophy,
  TriangleAlert,
} from 'lucide-react'

const ICONS = {
  deploy: Rocket,
  arm: AlarmClock,
  bet: Coins,
  wake: Zap,
  http: Globe,
  data: Thermometer,
  payout: Trophy,
  error: TriangleAlert,
}

const TONE = {
  wake: 'is-live',
  http: 'is-live',
  payout: 'is-pay',
  error: 'is-err',
}

export default function ChainLog({ entries }) {
  return (
    <ul className="log">
      {entries.map((e) => {
        const Icon = ICONS[e.kind] || Zap
        return (
          <li key={e.id}>
            <span className={`log-dot ${TONE[e.kind] || ''}`}>
              <Icon size={13} />
            </span>
            <span>{e.text}</span>
            <time className="log-time num">
              {new Date(e.at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </time>
          </li>
        )
      })}
    </ul>
  )
}
