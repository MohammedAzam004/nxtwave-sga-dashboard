function StatsCard({ label, value, tone = "neutral", style }) {
  return (
    <article className={`stat-card stat-card--${tone}`} style={style}>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default StatsCard;
