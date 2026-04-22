function StatsCard({ label, value, tone = "neutral" }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default StatsCard;

