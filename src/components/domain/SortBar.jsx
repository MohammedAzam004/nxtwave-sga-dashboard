function SortBar({ options, value, onChange }) {
  return (
    <div className="sort-bar">
      <label className="sort-bar__label" htmlFor="student-sort">
        Sort Students
      </label>
      <div className="sort-bar__field">
        <select
          id="student-sort"
          className="sort-bar__select"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <span className="sort-bar__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M6.7 9.3a1 1 0 0 1 1.4 0L12 13.18l3.9-3.88a1 1 0 1 1 1.4 1.42l-4.6 4.58a1 1 0 0 1-1.4 0L6.7 10.72a1 1 0 0 1 0-1.42Z"
              fill="currentColor"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

export default SortBar;
