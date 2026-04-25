export default function TrendArrow({ trend }) {
  if (trend === '↑') {
    return (
      <svg width="24" height="24" viewBox="0 0 100 100" className="shrink-0">
        <path
          d="M 50 15 L 70 50 L 55 50 L 55 85 L 45 85 L 45 50 L 30 50 Z"
          fill="#22c55e"
          stroke="#000"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (trend === '↓') {
    return (
      <svg width="24" height="24" viewBox="0 0 100 100" className="shrink-0">
        <path
          d="M 50 85 L 30 50 L 45 50 L 45 15 L 55 15 L 55 50 L 70 50 Z"
          fill="#ef4444"
          stroke="#000"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 100 100" className="shrink-0">
      <path
        d="M 85 50 L 50 30 L 50 45 L 15 45 L 15 55 L 50 55 L 50 70 Z"
        fill="#6b7280"
        stroke="#000"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}