import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCurrentUser, getToken, request, setToken } from './api/products'
import AuthModal from './components/auth/AuthModal'
import Icon from './components/common/Icon'
import ToastStack from './components/common/ToastStack'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import ProductCatalog from './components/products/ProductCatalog'
import ProductModal from './components/products/ProductModal'
import StatsGrid from './components/products/StatsGrid'
import { useToasts } from './hooks/useToasts'

const emptyForm = { name: '', description: '', price: '', quantity: '' }

function App() {
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const { toasts, addToast, dismissToast } = useToasts()

  useEffect(() => {
    if (!getToken()) return
    fetchCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .catch(() => {
        setToken('')
        setUser(null)
      })
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
  const lowStockCount = products.filter((product) => Number(product.quantity) <= 3).length

  function requireAuth() {
    if (user) return true
    setAuthOpen(true)
    addToast('Please sign in to modify products.', 'info')
    return false
  }

  function openCreate() {
    if (!requireAuth()) return
    setForm(emptyForm)
    setDialog({ mode: 'create' })
  }

  function openEdit(product) {
    if (!requireAuth()) return
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
    })
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
    if (!requireAuth()) return
    if (!window.confirm(`Delete ${product.name} from inventory?`)) return
    try {
      await request(`/product/${product.id}`, { method: 'DELETE' })
      addToast(`Deleted "${product.name}" from inventory.`, 'info')
      await loadProducts()
    } catch (err) {
      if (err.status === 401) {
        setToken('')
        setUser(null)
        setAuthOpen(true)
      }
      const msg = err.message || 'Could not delete product. Please try again.'
      setError(msg)
      addToast(msg, 'error')
    }
  }

  function handleLogout() {
    setToken('')
    setUser(null)
    addToast('Signed out.', 'info')
  }

  return (
    <div className="app-shell">
      <Sidebar productCount={products.length} offline={Boolean(error)} />

      <main className="main-content" id="top">
        <Topbar user={user} onOpenAuth={() => setAuthOpen(true)} onLogout={handleLogout} />

        <section className="page-wrap">
          <div className="page-heading">
            <div>
              <div className="eyebrow">OVERVIEW <span /></div>
              <h1>Inventory</h1>
              <p className="page-subtitle">Keep track of your products, stock, and value.</p>
            </div>
            <button className="primary-button" onClick={openCreate}>
              <Icon name="plus" size={17} /> Add product
            </button>
          </div>

          {error && (
            <div className="alert">
              <span>{error}</span>
              <button onClick={() => loadProducts()}>Try again</button>
            </div>
          )}

          <StatsGrid
            loading={loading}
            totalProducts={products.length}
            totalUnits={totalUnits}
            stockValue={stockValue}
            lowStockCount={lowStockCount}
          />

          <ProductCatalog
            products={products}
            visibleProducts={visibleProducts}
            query={query}
            onQueryChange={setQuery}
            loading={loading}
            onRefresh={() => loadProducts({ notify: true })}
            onEdit={openEdit}
            onDelete={deleteProduct}
          />

          <footer className="page-footer">
            Product Inventory Console <span>·</span> Inventory management made simple
          </footer>
        </section>
      </main>

      <ProductModal
        dialog={dialog}
        form={form}
        onFormChange={setForm}
        saving={saving}
        error={error}
        onSubmit={saveProduct}
        onClose={() => setDialog(null)}
      />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(signedInUser, message) => {
          setUser(signedInUser)
          addToast(message, 'success')
        }}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

export default App
