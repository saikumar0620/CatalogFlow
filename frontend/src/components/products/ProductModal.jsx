import Icon from '../common/Icon'

export default function ProductModal({
  dialog,
  form,
  onFormChange,
  saving,
  error,
  onSubmit,
  onClose,
}) {
  if (!dialog) return null

  const isEdit = dialog.mode === 'edit'

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow">PRODUCT DETAILS</div>
            <h2 id="modal-title">{isEdit ? 'Edit product' : 'Add a product'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="product-form">
          <label>
            Product name
            <input
              required
              maxLength="120"
              autoFocus
              placeholder="e.g. Wireless headphones"
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
            />
          </label>
          <label>
            Description
            <input
              required
              maxLength="240"
              placeholder="Short product description"
              value={form.description}
              onChange={(event) => onFormChange({ ...form, description: event.target.value })}
            />
          </label>
          <div className="form-row">
            <label>
              Unit price
              <input
                required
                min="0"
                step="0.01"
                type="number"
                placeholder="0.00"
                value={form.price}
                onChange={(event) => onFormChange({ ...form, price: event.target.value })}
              />
            </label>
            <label>
              Quantity
              <input
                required
                min="0"
                step="1"
                type="number"
                placeholder="0"
                value={form.quantity}
                onChange={(event) => onFormChange({ ...form, quantity: event.target.value })}
              />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
