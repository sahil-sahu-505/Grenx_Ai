import { useState, useEffect } from 'react'
import './Billing.css'

function Billing() {
  const [billingData, setBillingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState(1000)

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/billing/usage')
      const data = await response.json()
      setBillingData(data)
    } catch (error) {
      console.error('Failed to load billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTopUp = async () => {
    if (topUpAmount < 100) {
      alert('Minimum top-up amount is ₹100')
      return
    }

    try {
      const response = await fetch('/api/billing/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: topUpAmount })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Payment gateway integration coming soon!\n\nAmount: ₹${topUpAmount}\nOrder ID: ${data.order_id}`)
        setShowTopUpModal(false)
        loadBillingData()
      } else {
        alert('Failed to initiate payment')
      }
    } catch (error) {
      console.error('Failed to top up:', error)
      alert('Failed to initiate payment')
    }
  }

  if (loading) {
    return <div className="loading-state">Loading billing information...</div>
  }

  const usagePercentage = billingData ? (billingData.minutes_used / billingData.plan_minutes) * 100 : 0
  const isLowBalance = billingData && billingData.wallet_balance < 500

  return (
    <div className="billing">
      <div className="page-header">
        <h2>Billing & Usage</h2>
        <button className="btn btn-primary" onClick={() => setShowTopUpModal(true)}>
          💰 Top Up Wallet
        </button>
      </div>

      {/* Wallet Balance Card */}
      <div className={`wallet-card ${isLowBalance ? 'low-balance' : ''}`}>
        <div className="wallet-header">
          <div className="wallet-icon">💳</div>
          <div className="wallet-info">
            <h3>Wallet Balance</h3>
            <div className="wallet-balance">₹{billingData?.wallet_balance?.toFixed(2) || '0.00'}</div>
          </div>
        </div>
        {isLowBalance && (
          <div className="low-balance-alert">
            ⚠️ Low balance! Top up to continue using services without interruption.
          </div>
        )}
        <button className="btn btn-success btn-block" onClick={() => setShowTopUpModal(true)}>
          Add Money to Wallet
        </button>
      </div>

      {/* Usage Overview */}
      <div className="usage-section">
        <h3>This Month's Usage</h3>
        <div className="usage-grid">
          <div className="usage-card">
            <div className="usage-icon">�</div>
            <div className="usage-details">
              <div className="usage-label">Total Calls</div>
              <div className="usage-value">{billingData?.total_calls || 0}</div>
            </div>
          </div>

          <div className="usage-card">
            <div className="usage-icon">⏱️</div>
            <div className="usage-details">
              <div className="usage-label">Minutes Used</div>
              <div className="usage-value">{billingData?.minutes_used || 0} min</div>
            </div>
          </div>

          <div className="usage-card">
            <div className="usage-icon">💵</div>
            <div className="usage-details">
              <div className="usage-label">Total Cost</div>
              <div className="usage-value">₹{billingData?.total_cost?.toFixed(2) || '0.00'}</div>
            </div>
          </div>

          <div className="usage-card">
            <div className="usage-icon">📊</div>
            <div className="usage-details">
              <div className="usage-label">Avg Cost/Call</div>
              <div className="usage-value">₹{billingData?.avg_cost_per_call?.toFixed(2) || '0.00'}</div>
            </div>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="usage-bar-section">
          <div className="usage-bar-header">
            <span>Usage Progress</span>
            <span>{billingData?.minutes_used || 0} / {billingData?.plan_minutes || 1000} minutes</span>
          </div>
          <div className="usage-bar">
            <div 
              className="usage-bar-fill" 
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            ></div>
          </div>
          <div className="usage-bar-footer">
            <span>{usagePercentage.toFixed(1)}% used</span>
            <span>{(billingData?.plan_minutes || 1000) - (billingData?.minutes_used || 0)} minutes remaining</span>
          </div>
        </div>
      </div>

      {/* Pricing Info */}
      <div className="pricing-info">
        <h3>Current Pricing</h3>
        <div className="pricing-grid">
          <div className="pricing-item">
            <span className="pricing-label">Per Minute Rate</span>
            <span className="pricing-value">₹4.25</span>
          </div>
          <div className="pricing-item">
            <span className="pricing-label">Setup Fee</span>
            <span className="pricing-value">₹40,000 (One-time)</span>
          </div>
          <div className="pricing-item">
            <span className="pricing-label">Trigger Cost</span>
            <span className="pricing-value">₹0.01 each</span>
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="invoice-section">
        <h3>Invoice History</h3>
        <div className="invoice-table">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {billingData?.invoices && billingData.invoices.length > 0 ? (
                billingData.invoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td>#{invoice.id}</td>
                    <td>{new Date(invoice.date).toLocaleDateString()}</td>
                    <td>{invoice.description}</td>
                    <td>₹{invoice.amount.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${invoice.status}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-link">📥 Download</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-row">No invoices yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Up Modal */}
      {showTopUpModal && (
        <div className="modal-overlay" onClick={() => setShowTopUpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Top Up Wallet</h3>
              <button className="close-btn" onClick={() => setShowTopUpModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <label>Select Amount</label>
              <div className="amount-options">
                {[500, 1000, 2000, 5000, 10000].map(amount => (
                  <button
                    key={amount}
                    className={`amount-btn ${topUpAmount === amount ? 'active' : ''}`}
                    onClick={() => setTopUpAmount(amount)}
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>
              <label>Or Enter Custom Amount</label>
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(Number(e.target.value))}
                min="100"
                className="amount-input"
                placeholder="Enter amount"
              />
              <p className="modal-hint">Minimum amount: ₹100</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTopUpModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleTopUp}>
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Billing
