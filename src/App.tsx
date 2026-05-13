import './App.css'
import { useMemo, useState } from 'react'
import ProductList, { type DebtRecord, type Product } from './components/ProductList'

type ModuleKey = 'blacklist' | 'products'

function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('blacklist')

  const [products, setProducts] = useState<Product[]>([
    { name: 'Mani salado', quantity: 20, price: 1.25 },
    { name: 'Fruto seco variado', quantity: 14, price: 1.5 },
    { name: 'Gomitas', quantity: 35, price: 0.75 },
  ])

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

  function handleAddProduct(product: Product) {
    setProducts((current) => [...current, product])
  }

  function handleUpdateProduct(index: number, product: Product) {
    setProducts((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? product : item)),
    )
  }

  function handleDeleteProduct(index: number) {
    setProducts((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  // Agrega una deuda nueva o acumula productos al cliente ya existente.
  function handleAddDebt(client: string, debtProducts: { productName: string; quantity: number }[]) {
    const requiredByProduct = debtProducts.reduce<Record<string, number>>((accumulator, line) => {
      const normalizedName = line.productName.trim().toLowerCase()
      if (!normalizedName || line.quantity <= 0) return accumulator
      accumulator[normalizedName] = (accumulator[normalizedName] ?? 0) + line.quantity
      return accumulator
    }, {})

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

    const hasInsufficientStock = Object.entries(requiredByProduct).some(([normalizedName, amount]) => {
      const selectedProduct = products.find(
        (product) => product.name.trim().toLowerCase() === normalizedName,
      )
      return !selectedProduct || amount > selectedProduct.quantity
    })

    if (hasInsufficientStock) return

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

    setProducts((currentProducts) =>
      currentProducts.map((product) => {
        const normalizedName = product.name.trim().toLowerCase()
        const consumed = requiredByProduct[normalizedName] ?? 0
        if (consumed === 0) return product
        return {
          ...product,
          quantity: product.quantity - consumed,
        }
      }),
    )
  }

  function handleAddDebtPayment(client: string, amount: number) {
    if (amount <= 0) return

    setDebtHistory((current) =>
      current.map((record) => {
        if (record.client.trim().toLowerCase() !== client.trim().toLowerCase()) return record

        return {
          ...record,
          payments: [...record.payments, { date: new Date().toISOString().slice(0, 10), amount }],
        }
      }),
    )
  }

  function handlePayDebt(client: string, pendingAmount: number) {
    if (pendingAmount <= 0) return
    handleAddDebtPayment(client, pendingAmount)
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
    </main>
  )
}

export default App
