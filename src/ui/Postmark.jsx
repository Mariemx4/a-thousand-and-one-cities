/** A circular cancellation mark: town around the rim, date in the middle. */
export function Postmark({ top = 'GABÈS', bottom = 'TUNISIE', date = '26·XI·26', className = '', id = 'pm' }) {
  return (
    <svg className={`postmark ${className}`} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <path id={`${id}-t`} d="M20 60a40 40 0 0 1 80 0" />
        <path id={`${id}-b`} d="M16 60a44 44 0 0 0 88 0" />
      </defs>
      <g fill="none" stroke="currentColor">
        <circle cx="60" cy="60" r="52" strokeWidth="2.2" />
        <circle cx="60" cy="60" r="31" strokeWidth="1.3" />
        <path d="M2 50h14M2 60h14M2 70h14M104 50h14M104 60h14M104 70h14" strokeWidth="1.6" />
      </g>
      <g fill="currentColor" style={{ font: '500 12px "IBM Plex Mono", monospace', letterSpacing: '1.5px' }}>
        <text textAnchor="middle"><textPath href={`#${id}-t`} startOffset="50%">{top}</textPath></text>
        <text textAnchor="middle" style={{ fontSize: 10 }}><textPath href={`#${id}-b`} startOffset="50%">{bottom}</textPath></text>
        <text x="60" y="64" textAnchor="middle" style={{ fontSize: 11 }}>{date}</text>
      </g>
    </svg>
  )
}
