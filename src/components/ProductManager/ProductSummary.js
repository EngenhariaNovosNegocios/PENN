export default function ProductSummary({
  statusOptions,
  statusTotals,
  statusFilter,
  onStatusFilterChange,
  openIssueTotal,
}) {
  return (
    <section className="summary-grid" aria-label="Resumo operacional">
      {Object.entries(statusOptions).map(([status, option]) => (
        <button
          className={`summary-item ${
            statusFilter === status ? "selected" : ""
          }`}
          key={status}
          onClick={() =>
            onStatusFilterChange(statusFilter === status ? "todos" : status)
          }
          type="button"
        >
          <span className={`status-dot ${status}`} />
          <strong>{statusTotals[status] ?? 0}</strong>
          <span>{option.label}</span>
        </button>
      ))}
      <div className="summary-item issue-summary">
        <span className="status-dot issue" />
        <strong>{openIssueTotal}</strong>
        <span>Problemas abertos</span>
      </div>
    </section>
  );
}
