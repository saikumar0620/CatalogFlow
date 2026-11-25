export default function Topbar({ user, onOpenAuth, onLogout }) {
  const displayName = user?.name || user?.email || user?.username || ''
  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'G'

  return (
    <header className="topbar">
      <div className="breadcrumb">
        Workspace <span>/</span> <strong>Inventory</strong>
      </div>
      <div className="topbar-right">
        <span className="topbar-date">PRODUCT CATALOG</span>
        {user ? (
          <>
            <span className="avatar" title={user.email || displayName}>{initial}</span>
            <button type="button" className="secondary-button" onClick={onLogout}>
              Sign out ({displayName})
            </button>
          </>
        ) : (
          <button type="button" className="secondary-button" onClick={onOpenAuth}>
            Sign in
          </button>
        )}
      </div>
    </header>
  )
}
