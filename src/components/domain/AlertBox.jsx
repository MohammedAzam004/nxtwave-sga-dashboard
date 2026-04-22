function AlertBox({
  title,
  message,
  isLoading,
  isFallback,
  note,
  riskLevel = "LOW",
  onClose,
}) {
  const riskClass = riskLevel ? riskLevel.toLowerCase() : "low";

  return (
    <section
      className={`alert-box alert-box--${riskClass}`}
      aria-live="polite"
    >
      <div className="alert-box__header">
        <div>
          <p className="alert-box__eyebrow">AI Parent Alert</p>
          <h4>{title}</h4>
        </div>

        {onClose ? (
          <button
            type="button"
            className="alert-box__close"
            onClick={onClose}
            aria-label="Close generated alert"
          >
            Close
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="alert-box__status">Generating message...</p>
      ) : null}

      {!isLoading && message ? (
        <>
          <div className="alert-box__meta">
            <span className="alert-box__tag">
              {isFallback ? "Fallback Draft" : "Gemini Draft"}
            </span>
            {note ? (
              <span className="alert-box__note">{note}</span>
            ) : null}
          </div>
          <p className="alert-box__message">{message}</p>
        </>
      ) : null}
    </section>
  );
}

export default AlertBox;

