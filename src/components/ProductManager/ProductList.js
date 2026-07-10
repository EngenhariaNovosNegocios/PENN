export default function ProductList({
  products,
  filteredProducts,
  isLoading,
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  selectedProductId,
  onSelectProduct,
  countIssues,
}) {
  return (
    <aside className="panel product-list" aria-label="Lista de produtos">
      <div className="panel-heading">
        <h2>Produtos</h2>
        <span>
          {isLoading
            ? "Carregando"
            : `${filteredProducts.length} de ${products.length}`}
        </span>
      </div>

      <div className="list-controls">
        <input
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Buscar por nome, codigo, SAP, NCM..."
          type="search"
          value={searchTerm}
        />
        <select
          onChange={(event) => onStatusFilterChange(event.target.value)}
          value={statusFilter}
        >
          <option value="todos">Todos os status</option>
          {Object.entries(statusOptions).map(([value, option]) => (
            <option key={value} value={value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="product-list-items">
        {filteredProducts.map((product) => {
          const productIssueCount = countIssues(product.id);

          return (
            <button
              className={`product-row ${
                product.id === selectedProductId ? "selected" : ""
              }`}
              key={product.id}
              onClick={() => onSelectProduct(product.id)}
              type="button"
            >
              <span>
                <strong>{product.name}</strong>
                <small>
                  {product.code} - {product.category || "Sem categoria"}
                </small>
                {product.ncm && <small>NCM {product.ncm}</small>}
              </span>
              <span className="row-badges">
                {productIssueCount > 0 && (
                  <span className="issue-count">{productIssueCount}</span>
                )}
                <span className={`status-badge ${product.status}`}>
                  {statusOptions[product.status]?.label ?? product.status}
                </span>
              </span>
            </button>
          );
        })}

        {!isLoading && filteredProducts.length === 0 && (
          <p className="empty-state">Nenhum produto encontrado.</p>
        )}
      </div>
    </aside>
  );
}
