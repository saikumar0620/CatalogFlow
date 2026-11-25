export default function Topbar({ user, onOpenAuth, onLogout }) {
  const initial = user?.username ? user.username.charAt(0).toUpperCase() : 'G'

  return (
    <header className="topbar">
      <div className="breadcrumb">
        Workspace <span>/</span> <strong>Inventory</strong>
      </div>
      <div className="topbar-right">
        <span className="topbar-date">PRODUCT CATALOG</span>
        {user ? (
          <>
            <span className="avatar" title={user.username}>{initial}</span>
            <button type="button" className="secondary-button" onClick={onLogout}>
              Sign out ({user.username})
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
