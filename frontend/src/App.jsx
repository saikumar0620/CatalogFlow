import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const API = import.meta.env.VITE_API_URL || '/api'
const emptyForm = { name: '', description: '', price: '', quantity: '' }

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options)
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed (${response.status})`)
  }
  const type = response.headers.get('content-type') || ''
  return type.includes('application/json') ? response.json() : response.text()
}

function Icon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9A7 7 0 0 1 18 6.5L20 12M4 12l2 5.5A7 7 0 0 0 18.4 15" /></>,
    check: <><path d="m5 12 4.5 4.5L19 7" /></>,
    alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function App() {
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)
  const toastTimersRef = useRef(new Map())

  const dismissToast = useCallback((id) => {
    const timer = toastTimersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev.slice(-3), { id, message, type }])
    const timer = setTimeout(() => {
      toastTimersRef.current.delete(id)
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3500)
    toastTimersRef.current.set(id, timer)
  }, [])

  useEffect(() => () => {
    toastTimersRef.current.forEach((timer) => clearTimeout(timer))
    toastTimersRef.current.clear()
  }, [])

  const loadProducts = useCallback(async ({ notify = false } = {}) => {
    setLoading(true)
    setError('')
    try {
      const data = await request('/products')
      setProducts(Array.isArray(data) ? data : [])
      if (notify) addToast('Inventory refreshed.', 'info')
    } catch (err) {
      setError('Could not connect to the inventory API. Make sure FastAPI is running at 127.0.0.1:8000.')
      if (notify) addToast('Failed to refresh inventory.', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { loadProducts() }, [loadProducts])

  const visibleProducts = useMemo(() => products.filter((product) =>
    `${product.name} ${product.description}`.toLowerCase().includes(query.toLowerCase()),
  ), [products, query])
  const totalUnits = products.reduce((total, product) => total + Number(product.quantity || 0), 0)
  const stockValue = products.reduce((total, product) => total + Number(product.price || 0) * Number(product.quantity || 0), 0)
  const lowStock = products.filter((product) => Number(product.quantity) <= 3).length

  function openCreate() {
    setForm(emptyForm)
    setDialog({ mode: 'create' })
  }

  function openEdit(product) {
    setForm({ name: product.name, description: product.description, price: product.price, quantity: product.quantity })
    setDialog({ mode: 'edit', product })
  }

  async function saveProduct(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const body = {
      id: dialog.mode === 'edit' ? dialog.product.id : Math.max(0, ...products.map((item) => Number(item.id))) + 1,
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
    }
    try {
      const isEdit = dialog.mode === 'edit'
      await request(isEdit ? `/product?id=${body.id}` : '/product', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setDialog(null)
      addToast(isEdit ? `Updated "${body.name}".` : `Added "${body.name}" to inventory.`, 'success')
      await loadProducts()
    } catch (err) {
      const msg = err.message || 'Could not save product. Please try again.'
      setError(msg)
      addToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete ${product.name} from inventory?`)) return
    try {
      await request(`/product/${product.id}`, { method: 'DELETE' })
      addToast(`Deleted "${product.name}" from inventory.`, 'info')
      await loadProducts()
    } catch (err) {
      const msg = err.message || 'Could not delete product. Please try again.'
      setError(msg)
      addToast(msg, 'error')
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Product Inventory Console home">
          <span className="brand-mark"><Icon name="box" size={20} /></span>
          <span>inventory<span className="brand-period">.</span></span>
        </a>
        <div className="side-label">WORKSPACE</div>
        <button className="nav-item active"><span className="nav-icon"><Icon name="layers" /></span>Inventory<span className="nav-count">{products.length}</span></button>
        <div className="sidebar-bottom">
          <div className="connection"><span className={`status-dot ${error ? 'offline' : ''}`} /><span>{error ? 'API disconnected' : 'API connection'}</span></div>
          <span className="side-footnote">Inventory dashboard</span>
        </div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>Inventory</strong></div>
          <div className="topbar-right"><span className="topbar-date">PRODUCT CATALOG</span><span className="avatar">S</span></div>
        </header>

        <section className="page-wrap">
          <div className="page-heading">
            <div><div className="eyebrow">OVERVIEW <span /></div><h1>Inventory</h1><p className="page-subtitle">Keep track of your products, stock, and value.</p></div>
            <button className="primary-button" onClick={openCreate}><Icon name="plus" size={17} /> Add product</button>
          </div>

          {error && <div className="alert"><span>{error}</span><button onClick={loadProducts}>Try again</button></div>}

          <div className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span className="stat-label">Total products</span><span className="stat-icon lavender"><Icon name="box" /></span></div><div className="stat-number">{loading ? '—' : products.length}</div><div className="stat-foot">Unique items in catalog</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-label">Units in stock</span><span className="stat-icon mint"><Icon name="layers" /></span></div><div className="stat-number">{loading ? '—' : totalUnits.toLocaleString()}</div><div className="stat-foot">Across all products</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-label">Stock value</span><span className="stat-icon peach"><Icon name="trend" /></span></div><div className="stat-number">{loading ? '—' : `$${stockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</div><div className="stat-foot">Based on unit price</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-label">Low stock</span><span className="stat-icon yellow"><Icon name="refresh" /></span></div><div className="stat-number">{loading ? '—' : lowStock}</div><div className="stat-foot">Items with 3 or fewer units</div></article>
          </div>

          <section className="catalog-card">
            <div className="catalog-header"><div><h2>Product catalog</h2><p>A complete list of the items in your inventory.</p></div><button className="icon-button refresh-button" title="Refresh inventory" onClick={() => loadProducts({ notify: true })}><Icon name="refresh" /></button></div>
            <div className="catalog-toolbar"><div className="search-box"><Icon name="search" size={17} /><input aria-label="Search products" placeholder="Search products..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></div><span className="results-count">{visibleProducts.length} {visibleProducts.length === 1 ? 'product' : 'products'}</span></div>
            <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>DESCRIPTION</th><th>UNIT PRICE</th><th>IN STOCK</th><th className="actions-heading">ACTIONS</th></tr></thead><tbody>
              {loading ? <tr><td className="empty-state" colSpan="5">Loading your inventory…</td></tr> : visibleProducts.length === 0 ? <tr><td className="empty-state" colSpan="5">{query ? 'No products match your search.' : 'No products yet. Add your first product to get started.'}</td></tr> : visibleProducts.map((product, index) => <tr key={product.id}>
                <td><div className="product-cell"><span className={`product-avatar avatar-${index % 5}`}>{product.name?.slice(0, 1).toUpperCase()}</span><div><strong>{product.name}</strong><small>SKU-{String(product.id).padStart(4, '0')}</small></div></div></td>
                <td className="description-cell">{product.description}</td>
                <td className="price-cell">${Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td><span className={`stock-pill ${Number(product.quantity) <= 3 ? 'low' : ''}`}><i />{product.quantity} units</span></td>
                <td><div className="row-actions"><button className="icon-button" title={`Edit ${product.name}`} onClick={() => openEdit(product)}><Icon name="edit" size={16} /></button><button className="icon-button delete-button" title={`Delete ${product.name}`} onClick={() => deleteProduct(product)}><Icon name="trash" size={16} /></button></div></td>
              </tr>)}
            </tbody></table></div>
            <div className="catalog-footer"><span>Showing <strong>{visibleProducts.length}</strong> of <strong>{products.length}</strong> products</span><span className="live-indicator"><i /> Live inventory</span></div>
          </section>
          <footer className="page-footer">Product Inventory Console <span>·</span> Inventory management made simple</footer>
        </section>
      </main>

      {dialog && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null) }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><div className="eyebrow">PRODUCT DETAILS</div><h2 id="modal-title">{dialog.mode === 'edit' ? 'Edit product' : 'Add a product'}</h2></div><button className="icon-button" onClick={() => setDialog(null)} aria-label="Close"><Icon name="close" /></button></div><form onSubmit={saveProduct} className="product-form"><label>Product name<input required maxLength="120" autoFocus placeholder="e.g. Wireless headphones" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Description<input required maxLength="240" placeholder="Short product description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="form-row"><label>Unit price<input required min="0" step="0.01" type="number" placeholder="0.00" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label>Quantity<input required min="0" step="1" type="number" placeholder="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label></div>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setDialog(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : dialog.mode === 'edit' ? 'Save changes' : 'Add product'}</button></div></form></section></div>}

      {toasts.length > 0 && (
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <span className="toast-badge">
                <Icon name={toast.type === 'error' ? 'alert' : toast.type === 'info' ? 'refresh' : 'check'} size={14} />
              </span>
              <span className="toast-message">{toast.message}</span>
              <button className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
