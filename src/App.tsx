import './App.css'
import { useEffect, useMemo, useState } from 'react'
import ProductList, { type DebtRecord, type Product } from './components/ProductList'
import Login from './components/Login'
import UserProfile from './components/UserProfile'

type ModuleKey = 'blacklist' | 'products'

function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('blacklist')
  const [products, setProducts] = useState<Product[]>([])
  const [debtHistory, setDebtHistory] = useState<DebtRecord[]>([])

  // Estado de sesión y perfil
  const [token, setToken] = useState<string | null>(localStorage.getItem('yoyo_token'))
  const [username, setUsername] = useState<string | null>(localStorage.getItem('yoyo_username'))
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const API_URL = `http://${globalThis.location.hostname}:3001/api`

  // Cargar deudas y productos si hay token
  useEffect(() => {
    if (token) {
      fetchProducts()
      fetchDebts()
    }
  }, [token])

  async function fetchProducts() {
    try {
      const res = await fetch(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        handleLogout()
        return
      }
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Error al obtener productos:', error)
    }
  }

  async function fetchDebts() {
    try {
      const res = await fetch(`${API_URL}/debts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        handleLogout()
        return
      }
      if (res.ok) {
        const data = await res.json()
        setDebtHistory(data)
      }
    } catch (error) {
      console.error('Error al obtener deudas:', error)
    }
  }

  function handleLoginSuccess(newToken: string, newUsername: string) {
    setToken(newToken)
    setUsername(newUsername)
  }

  function handleLogout() {
    localStorage.removeItem('yoyo_token')
    localStorage.removeItem('yoyo_username')
    setToken(null)
    setUsername(null)
    setIsProfileOpen(false)
  }

  async function handleAddProduct(product: Product) {
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(product),
      })
      if (res.ok) {
        fetchProducts()
      } else {
        const err = await res.json()
        alert(err.message || 'Error al guardar el producto.')
      }
    } catch (error) {
      console.error('Error de red al guardar producto:', error)
    }
  }

  async function handleUpdateProduct(index: number, product: Product) {
    const target = products[index]
    if (!target?.id) return

    try {
      const res = await fetch(`${API_URL}/products/${target.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(product),
      })
      if (res.ok) {
        fetchProducts()
      } else {
        const err = await res.json()
        alert(err.message || 'Error al actualizar el producto.')
      }
    } catch (error) {
      console.error('Error de red al actualizar producto:', error)
    }
  }

  async function handleDeleteProduct(index: number) {
    const target = products[index]
    if (!target?.id) return

    try {
      const res = await fetch(`${API_URL}/products/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        fetchProducts()
      } else {
        const err = await res.json()
        alert(err.message || 'Error al eliminar el producto.')
      }
    } catch (error) {
      console.error('Error de red al eliminar producto:', error)
    }
  }

  async function handleAddDebt(client: string, debtProducts: { productName: string; quantity: number }[]) {
    try {
      const res = await fetch(`${API_URL}/debts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ client, debtProducts }),
      })
      if (res.ok) {
        fetchDebts()
        fetchProducts() // Recargar stock actualizado
      } else {
        const err = await res.json()
        alert(err.message || 'Error al registrar la deuda.')
      }
    } catch (error) {
      console.error('Error de red al registrar deuda:', error)
    }
  }

  async function handleAddDebtPayment(client: string, amount: number) {
    try {
      const res = await fetch(`${API_URL}/debts/${encodeURIComponent(client)}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      })
      if (res.ok) {
        fetchDebts()
      } else {
        const err = await res.json()
        alert(err.message || 'Error al registrar el abono.')
      }
    } catch (error) {
      console.error('Error de red al registrar abono:', error)
    }
  }

  async function handlePayDebt(client: string, _: number) {
    try {
      const res = await fetch(`${API_URL}/debts/${encodeURIComponent(client)}/pay-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        fetchDebts()
      } else {
        const err = await res.json()
        alert(err.message || 'Error al liquidar la deuda.')
      }
    } catch (error) {
      console.error('Error de red al liquidar deuda:', error)
    }
  }

  const moduleTitle = useMemo(() => {
    return activeModule === 'blacklist' ? 'Lista negra' : 'Productos'
  }, [activeModule])

  // Si no está logueado, mostrar pantalla de login
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <h1 className="sidebar__title">Yoyo Track</h1>
        <nav className="sidebar__menu" aria-label="Navegación principal">
          <button
            className={`sidebar__item ${activeModule === 'blacklist' ? 'is-active' : ''}`}
            onClick={() => setActiveModule('blacklist')}
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="sidebar__btn-icon sidebar__btn-icon--ledger"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <span>Lista negra</span>
          </button>
          <button
            className={`sidebar__item ${activeModule === 'products' ? 'is-active' : ''}`}
            onClick={() => setActiveModule('products')}
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="sidebar__btn-icon sidebar__btn-icon--package"
            >
              <polyline points="21 8 21 21 3 21 3 8"></polyline>
              <rect x="1" y="3" width="22" height="5"></rect>
              <line x1="10" y1="12" x2="14" y2="12"></line>
            </svg>
            <span>Productos</span>
          </button>
        </nav>

        {/* Panel de usuario al final del sidebar */}
        <div className="sidebar__user">
          <span className="sidebar__user-name" title={username || ''}>
            👤 {username}
          </span>
          <button
            className="sidebar__user-btn"
            type="button"
            onClick={() => setIsProfileOpen(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="sidebar__btn-icon sidebar__btn-icon--shield"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Seguridad</span>
          </button>
          <button className="sidebar__logout-btn" type="button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <section className="content">
        <header className="content__header">
          <h2>{moduleTitle}</h2>
        </header>

        {activeModule === 'blacklist' ? (
          <ProductList
            products={[]}
            debtHistory={debtHistory}
            showProducts={false}
            availableProducts={products}
            onAddDebt={handleAddDebt}
            onAddDebtPayment={handleAddDebtPayment}
            onPayDebt={handlePayDebt}
          />
        ) : (
          <ProductList
            products={products}
            debtHistory={[]}
            showDebtHistory={false}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}
      </section>

      {/* Modal de perfil de usuario */}
      {isProfileOpen && username && (
        <UserProfile
          username={username}
          onClose={() => setIsProfileOpen(false)}
          onLogout={handleLogout}
        />
      )}
    </main>
  )
}

export default App
