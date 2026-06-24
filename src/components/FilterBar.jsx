const filterOptions = ["ALL", "HIGH", "MEDIUM", "LOW"];

function FilterBar({ selectedFilter, onFilterChange }) {
  return (
    <div className="filter-bar" role="group" aria-label="Filter students by risk level">
      {filterOptions.map((filterOption) => {
        const isActive = selectedFilter === filterOption;

        return (
          <button
            key={filterOption}
            type="button"
            className={`filter-button ${isActive ? "active" : ""}`}
            aria-pressed={isActive}
            onClick={() => onFilterChange(filterOption)}
          >
            {filterOption === "ALL" ? "All Students" : `${filterOption} Risk`}
          </button>
        );
      })}
    </div>
  );
}

export default FilterBar;
