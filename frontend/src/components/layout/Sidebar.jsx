import Icon from '../common/Icon'

export default function Sidebar({ productCount, offline }) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#top" aria-label="Product Inventory Console home">
        <span className="brand-mark">
          <Icon name="box" size={20} />
        </span>
        <span>
          inventory<span className="brand-period">.</span>
        </span>
      </a>
      <div className="side-label">WORKSPACE</div>
      <button className="nav-item active">
        <span className="nav-icon">
          <Icon name="layers" />
        </span>
        Inventory
        <span className="nav-count">{productCount}</span>
      </button>
      <div className="sidebar-bottom">
        <div className="connection">
          <span className={`status-dot ${offline ? 'offline' : ''}`} />
          <span>{offline ? 'API disconnected' : 'API connection'}</span>
        </div>
        <span className="side-footnote">Inventory dashboard</span>
      </div>
    </aside>
  )
}
