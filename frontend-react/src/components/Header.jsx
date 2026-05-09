import './Header.css'

function Header({ user, onLogout }) {
  return (
    <div className="header">
      <div className="header-left">
        <h1>🤖 AI Voice Agent</h1>
        <p>Intelligent Voice Assistant Dashboard</p>
      </div>
      {user && (
        <div className="header-right">
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">{user.full_name || user.email}</span>
              {user.company_name && <span className="company-name">{user.company_name}</span>}
            </div>
            <span className="wallet-balance">Wallet: ₹{user.wallet_balance?.toFixed(2) || '0.00'}</span>
          </div>
          <button onClick={onLogout} className="btn btn-secondary btn-sm">
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default Header
