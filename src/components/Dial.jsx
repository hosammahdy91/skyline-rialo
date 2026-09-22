const MIN = 10
const MAX = 50
const START = 200
const SWEEP = 220

const CX = 160
const CY = 172
const R = 124

function polar(r, deg) {
  const rad = (deg * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)]
}

function angleOf(v) {
  const t = Math.min(1, Math.max(0, (v - MIN) / (MAX - MIN)))
  return START - t * SWEEP
}

function arc(r, from, to) {
  const [x1, y1] = polar(r, from)
  const [x2, y2] = polar(r, to)
  const large = Math.abs(from - to) > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

/**
 * A dial reading today's temperature against the agreed threshold.
 * The warm arc is the "Over" zone, the cool arc is "Under".
 */
export default function Dial({ threshold, reading, caption }) {
  const tAngle = angleOf(threshold)
  const hasReading = typeof reading === 'number'
  const rAngle = hasReading ? angleOf(reading) : null
  const isOver = hasReading && reading > threshold

  const [tx1, ty1] = polar(R - 20, tAngle)
  const [tx2, ty2] = polar(R + 9, tAngle)
  const [nx, ny] = hasReading ? polar(R - 7, rAngle) : [0, 0]
  const [bx, by] = hasReading ? polar(28, rAngle) : [0, 0]

  return (
    <svg className="dial" viewBox="0 0 320 210" role="img"
      aria-label={`Threshold ${threshold} degrees${hasReading ? `, reading ${reading}` : ''}`}>
      {/* "Under" zone */}
      <path d={arc(R, START, tAngle)} fill="none" stroke="var(--cool)" strokeOpacity="0.28"
        strokeWidth="14" strokeLinecap="round" />
      {/* "Over" zone */}
      <path d={arc(R, tAngle, START - SWEEP)} fill="none" stroke="var(--heat)" strokeOpacity="0.28"
        strokeWidth="14" strokeLinecap="round" />

      {/* threshold marker */}
      <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--gold)" strokeWidth="3"
        strokeLinecap="round" />
      <text x={polar(R + 24, tAngle)[0]} y={polar(R + 24, tAngle)[1] + 4}
        textAnchor="middle" fill="var(--gold)" fontSize="13" className="num">
        {threshold}°
      </text>

      {hasReading && (
        <>
          <line x1={CX} y1={CY} x2={nx} y2={ny}
            stroke={isOver ? 'var(--heat)' : 'var(--cool)'} strokeWidth="3" strokeLinecap="round" />
          <circle cx={bx} cy={by} r="5" fill={isOver ? 'var(--heat)' : 'var(--cool)'} />
          <circle cx={CX} cy={CY} r="7" fill="var(--surface)" stroke="var(--line)" />
        </>
      )}

      <text x={CX} y={hasReading ? CY - 46 : CY - 34} textAnchor="middle" className="dial-reading num">
        {hasReading ? Math.round(reading) : '··'}
        {hasReading && <tspan className="dial-unit">°</tspan>}
      </text>
      {caption && (
        <text x={CX} y={CY - 16} textAnchor="middle" className="dial-caption">
          {caption}
        </text>
      )}
    </svg>
  )
}
