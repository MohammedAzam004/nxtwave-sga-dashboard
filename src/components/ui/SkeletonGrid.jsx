function SkeletonGrid({ count = 6 }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-card">
          <div className="skeleton-line skeleton-line--short" />
          <div className="skeleton-line skeleton-line--large" />
          <div className="skeleton-line skeleton-line--full" />
          <div className="skeleton-line skeleton-line--medium" />
        </div>
      ))}
    </div>
  );
}

export default SkeletonGrid;
