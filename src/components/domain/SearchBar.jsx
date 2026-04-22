function SearchBar({ value, onChange }) {
  return (
    <div className="search-bar">
      <label className="search-bar__label" htmlFor="student-search">
        Search Students
      </label>
      <div className="search-bar__field">
        <span className="search-bar__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M10.5 4.75a5.75 5.75 0 1 0 0 11.5a5.75 5.75 0 0 0 0-11.5Zm0-1.5a7.25 7.25 0 1 1 0 14.5a7.25 7.25 0 0 1 0-14.5Zm10.03 15.72-3.56-3.56 1.06-1.06 3.56 3.56-1.06 1.06Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <input
          id="student-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search by student name..."
          className="search-bar__input"
        />
      </div>
    </div>
  );
}

export default SearchBar;
