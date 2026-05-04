import './App.css'
import { useMemo, useState } from 'react'
import ProductList, { type DebtRecord, type Product } from './components/ProductList'

type ModuleKey = 'blacklist' | 'products'

function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('blacklist')

  const products: Product[] = [
    { name: 'Mani salado', quantity: 20, price: 1.25 },
    { name: 'Fruto seco variado', quantity: 14, price: 1.5 },
    { name: 'Gomitas', quantity: 35, price: 0.75 },
  ]

  const [debtHistory, setDebtHistory] = useState<DebtRecord[]>([
    {
      client: 'Maria',
      products: [
        { name: 'Mani salado', quantity: 2, price: 1.25 },
        { name: 'Gomitas', quantity: 1, price: 0.75 },
      ],
      payments: [{ date: '2026-05-01', amount: 1.25 }],
    },
    {
      client: 'Pedro',
      products: [{ name: 'Fruto seco variado', quantity: 1, price: 1.5 }],
      payments: [],
    },
    {
      client: 'Jose',
      products: [{ name: 'Gomitas', quantity: 3, price: 0.75 }],
      payments: [{ date: '2026-05-02', amount: 2.25 }],
    },
  ])

  // Agrega una deuda nueva o acumula productos al cliente ya existente.
  function handleAddDebt(client: string, debtProducts: { productName: string; quantity: number }[]) {
    const validLines = debtProducts
      .map((line) => {
        const selectedProduct = products.find((product) => product.name === line.productName)
        if (!selectedProduct || line.quantity <= 0) return null
        return {
          name: selectedProduct.name,
          quantity: line.quantity,
          price: selectedProduct.price,
        }
      })
      .filter((line): line is { name: string; quantity: number; price: number } => !!line)

    if (validLines.length === 0) return

    setDebtHistory((current) => {
      const normalizedClient = client.trim().toLowerCase()
      const existingIndex = current.findIndex(
        (item) => item.client.trim().toLowerCase() === normalizedClient,
      )

      if (existingIndex === -1) {
        return [
          ...current,
          {
            client: client.trim(),
            products: validLines,
            payments: [],
          },
        ]
      }

      const next = [...current]
      next[existingIndex] = {
        ...next[existingIndex],
        products: [...next[existingIndex].products, ...validLines],
      }

      return next
    })
  }

  const moduleTitle = useMemo(() => {
    return activeModule === 'blacklist' ? 'Lista negra' : 'Productos'
  }, [activeModule])

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <h1 className="sidebar__title">Yoyo Track</h1>
        <nav className="sidebar__menu" aria-label="Navegacion principal">
          <button
            className={`sidebar__item ${activeModule === 'blacklist' ? 'is-active' : ''}`}
            onClick={() => setActiveModule('blacklist')}
            type="button"
          >
            Lista negra
          </button>
          <button
            className={`sidebar__item ${activeModule === 'products' ? 'is-active' : ''}`}
            onClick={() => setActiveModule('products')}
            type="button"
          >
            Productos
          </button>
        </nav>
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
          />
        ) : (
          <ProductList products={products} debtHistory={[]} showDebtHistory={false} />
        )}
      </section>
    </main>
  )
}

export default App
