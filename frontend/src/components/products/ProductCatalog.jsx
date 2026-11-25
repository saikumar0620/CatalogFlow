import Icon from '../common/Icon'

export default function ProductCatalog({
  products,
  visibleProducts,
  query,
  onQueryChange,
  loading,
  onRefresh,
  onEdit,
  onDelete,
}) {
  return (
    <section className="catalog-card">
      <div className="catalog-header">
        <div>
          <h2>Product catalog</h2>
          <p>A complete list of the items in your inventory.</p>
        </div>
        <button
          className="icon-button refresh-button"
          title="Refresh inventory"
          onClick={onRefresh}
        >
          <Icon name="refresh" />
        </button>
      </div>

      <div className="catalog-toolbar">
        <div className="search-box">
          <Icon name="search" size={17} />
          <input
            aria-label="Search products"
            placeholder="Search products..."
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <kbd>⌘ K</kbd>
        </div>
        <span className="results-count">
          {visibleProducts.length} {visibleProducts.length === 1 ? 'product' : 'products'}
        </span>
      </div>

      <div className="table-scroll" aria-busy={loading}>
        <table>
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th>DESCRIPTION</th>
              <th>UNIT PRICE</th>
              <th>IN STOCK</th>
              <th className="actions-heading">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, index) => (
                <tr key={index} className="skeleton-row" aria-hidden="true">
                  <td>
                    <div className="product-cell">
                      <span className="skeleton skeleton-avatar" />
                      <div className="skeleton-stack">
                        <span className="skeleton skeleton-line skeleton-name" />
                        <span className="skeleton skeleton-line skeleton-sku" />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="skeleton skeleton-line skeleton-desc" />
                  </td>
                  <td>
                    <span className="skeleton skeleton-line skeleton-price" />
                  </td>
                  <td>
                    <span className="skeleton skeleton-pill" />
                  </td>
                  <td>
                    <div className="row-actions">
                      <span className="skeleton skeleton-action" />
                      <span className="skeleton skeleton-action" />
                    </div>
                  </td>
                </tr>
              ))
            ) : visibleProducts.length === 0 ? (
              <tr>
                <td className="empty-state" colSpan="5">
                  {query
                    ? 'No products match your search.'
                    : 'No products yet. Add your first product to get started.'}
                </td>
              </tr>
            ) : (
              visibleProducts.map((product, index) => (
                <tr key={product.id}>
                  <td>
                    <div className="product-cell">
                      <span className={`product-avatar avatar-${index % 5}`}>
                        {product.name?.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{product.name}</strong>
                        <small>SKU-{String(product.id).padStart(4, '0')}</small>
                      </div>
                    </div>
                  </td>
                  <td className="description-cell">{product.description}</td>
                  <td className="price-cell">
                    ₹{Number(product.price).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <span className={`stock-pill ${Number(product.quantity) <= 3 ? 'low' : ''}`}>
                      <i />
                      {product.quantity} units
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        title={`Edit ${product.name}`}
                        onClick={() => onEdit(product)}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        className="icon-button delete-button"
                        title={`Delete ${product.name}`}
                        onClick={() => onDelete(product)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="catalog-footer">
        <span>
          Showing <strong>{visibleProducts.length}</strong> of <strong>{products.length}</strong> products
        </span>
        <span className="live-indicator">
          <i /> Live inventory
        </span>
      </div>
    </section>
  )
}
