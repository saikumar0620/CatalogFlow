import Icon from '../common/Icon'

export default function StatsGrid({
  loading,
  totalProducts,
  totalUnits,
  stockValue,
  lowStockCount,
}) {
  const cards = [
    {
      label: 'Total products',
      icon: 'box',
      tone: 'lavender',
      value: totalProducts,
      foot: 'Unique items in catalog',
    },
    {
      label: 'Units in stock',
      icon: 'layers',
      tone: 'mint',
      value: totalUnits.toLocaleString(),
      foot: 'Across all products',
    },
    {
      label: 'Stock value',
      icon: 'trend',
      tone: 'peach',
      value: `₹${stockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      foot: 'Based on unit price',
    },
    {
      label: 'Low stock',
      icon: 'refresh',
      tone: 'yellow',
      value: lowStockCount,
      foot: 'Items with 3 or fewer units',
    },
  ]

  return (
    <div className="stats-grid" aria-busy={loading}>
      {cards.map((card) => (
        <article key={card.label} className="stat-card">
          <div className="stat-top">
            <span className="stat-label">{card.label}</span>
            <span className={`stat-icon ${card.tone}`}>
              <Icon name={card.icon} />
            </span>
          </div>
          <div className="stat-number">
            {loading ? <span className="skeleton skeleton-stat" aria-hidden="true" /> : card.value}
          </div>
          <div className="stat-foot">{card.foot}</div>
        </article>
      ))}
    </div>
  )
}
