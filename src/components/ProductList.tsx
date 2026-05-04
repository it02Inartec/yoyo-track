import './ProductList.css'
import { useState, type FormEvent } from 'react'

export type Product = {
  name: string
  quantity: number
  price: number
}

export type DebtRecord = {
  client: string
  products: {
    name: string
    quantity: number
    price: number
  }[]
  payments: {
    date: string
    amount: number
  }[]
}

type ProductListProps = {
  products: Product[]
  debtHistory: DebtRecord[]
  showProducts?: boolean
  showDebtHistory?: boolean
  availableProducts?: Product[]
  onAddDebt?: (client: string, debtProducts: { productName: string; quantity: number }[]) => void
}

// Formatea números en moneda para mostrar montos de deuda y pagos.
function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

// Calcula el total consumido a partir de la lista de productos.
function calculateDebtAmount(products: { name: string; quantity: number; price: number }[]) {
  return products.reduce((accumulator, product) => {
    return accumulator + product.quantity * product.price
  }, 0)
}

// Suma todos los pagos abonados por un cliente.
function calculatePaidAmount(payments: { date: string; amount: number }[]) {
  return payments.reduce((accumulator, payment) => accumulator + payment.amount, 0)
}

export function ProductList({
  products,
  debtHistory,
  showProducts = true,
  showDebtHistory = true,
  availableProducts = [],
  onAddDebt,
}: ProductListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clientName, setClientName] = useState('')
  const [debtItems, setDebtItems] = useState([{ product: '', quantity: 1 }])
  const [nameTouched, setNameTouched] = useState(false)
  const [itemTouched, setItemTouched] = useState([{ product: false, quantity: false }])

  const pendingDebts = debtHistory.filter((debt) => {
    const totalDebt = calculateDebtAmount(debt.products)
    const totalPaid = calculatePaidAmount(debt.payments)
    return totalDebt - totalPaid > 0
  })

  // Abre el modal y reinicia el formulario con valores iniciales.
  function openModal() {
    setClientName('')
    setDebtItems([{ product: availableProducts[0]?.name ?? '', quantity: 1 }])
    setNameTouched(false)
    setItemTouched([{ product: false, quantity: false }])
    setIsModalOpen(true)
  }

  // Cierra el modal sin persistir cambios del formulario.
  function closeModal() {
    setIsModalOpen(false)
  }

  // Agrega una nueva fila para seleccionar otro producto en la misma deuda.
  function handleAddItem() {
    setDebtItems((current) => [
      ...current,
      { product: availableProducts[0]?.name ?? '', quantity: 1 },
    ])
    setItemTouched((current) => [...current, { product: false, quantity: false }])
  }

  // Actualiza una fila específica del formulario dinámico.
  function handleChangeItem(index: number, key: 'product' | 'quantity', value: string) {
    setDebtItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        if (key === 'quantity') return { ...item, quantity: Number(value) }
        return { ...item, product: value }
      }),
    )
  }

  // Marca un campo como tocado para habilitar su mensaje de error.
  function handleBlurItem(index: number, key: 'product' | 'quantity') {
    setItemTouched((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        return { ...item, [key]: true }
      }),
    )
  }

  // Valida y envía la deuda para agregarla o acumularla al cliente.
  function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!onAddDebt) return
    setNameTouched(true)
    setItemTouched((current) => current.map(() => ({ product: true, quantity: true })))

    const isNameValid = clientName.trim().length > 0
    const hasInvalidItems = debtItems.some((item) => !item.product || item.quantity <= 0)
    if (!isNameValid || hasInvalidItems) return

    const debtProducts = debtItems.map((item) => ({
      productName: item.product,
      quantity: item.quantity,
    }))

    if (debtProducts.length === 0) return

    onAddDebt(clientName, debtProducts)
    closeModal()
  }

  return (
    <section className="product-list">
      {showProducts ? (
        <article className="product-list__section">
          <h2 className="product-list__title">Inventario</h2>
          {products.length === 0 ? (
            <p className="product-list__empty">No hay productos en inventario.</p>
          ) : (
            <table className="product-list__table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                {products.map((productItem, index) => (
                  <tr key={`${productItem.name}-${index}`}>
                    <td>{productItem.name}</td>
                    <td>{productItem.quantity}</td>
                    <td>{formatCurrency(productItem.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      ) : null}

      {showDebtHistory ? (
        <article className="product-list__section">
          <div className="product-list__header">
            <h2 className="product-list__title">Deudas</h2>
            <button className="product-list__add-btn" type="button" onClick={openModal}>
              Agregar deuda
            </button>
          </div>
          {pendingDebts.length === 0 ? (
            <p className="product-list__empty">No hay deudas registradas.</p>
          ) : (
            <table className="product-list__table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Consumido</th>
                  <th>Abonado</th>
                  <th>Saldo pendiente</th>
                </tr>
              </thead>
              <tbody>
                {pendingDebts.map((debt, index) => {
                  const totalConsumed = calculateDebtAmount(debt.products)
                  const totalPaid = calculatePaidAmount(debt.payments)
                  const pendingBalance = Math.max(totalConsumed - totalPaid, 0)

                  return (
                    <tr key={`${debt.client}-${index}`}>
                      <td>{debt.client}</td>
                      <td>
                        <ul className="product-list__items">
                          {debt.products.map((productItem, productIndex) => (
                            <li key={`${productItem.name}-${productIndex}`}>
                              {productItem.quantity} x {productItem.name} (
                              {formatCurrency(productItem.price)})
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td>{formatCurrency(totalConsumed)}</td>
                      <td>{formatCurrency(totalPaid)}</td>
                      <td>{formatCurrency(pendingBalance)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {isModalOpen ? (
            <div className="product-list__modal-backdrop" role="dialog" aria-modal="true">
              <div className="product-list__modal">
                <h3 className="product-list__modal-title">Registrar deuda</h3>
                <form className="product-list__form" onSubmit={handleSave} noValidate>
                  <label>
                    Nombre
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      onBlur={() => setNameTouched(true)}
                    />
                    {nameTouched && !clientName.trim() ? (
                      <span className="product-list__error">El nombre no puede estar vacío.</span>
                    ) : null}
                  </label>

                  {debtItems.map((item, index) => (
                    <div className="product-list__item-row" key={`item-${index}`}>
                      <label>
                        Producto
                        <select
                          value={item.product}
                          onChange={(e) => handleChangeItem(index, 'product', e.target.value)}
                          onBlur={() => handleBlurItem(index, 'product')}
                        >
                          <option value="" disabled>
                            Selecciona un producto
                          </option>
                          {availableProducts.map((productItem) => (
                            <option key={`${productItem.name}-${index}`} value={productItem.name}>
                              {productItem.name}
                            </option>
                          ))}
                        </select>
                        {itemTouched[index]?.product && !item.product ? (
                          <span className="product-list__error">Selecciona un producto.</span>
                        ) : null}
                      </label>

                      <label>
                        Cantidad
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleChangeItem(index, 'quantity', e.target.value)}
                          onBlur={() => handleBlurItem(index, 'quantity')}
                        />
                        {itemTouched[index]?.quantity && item.quantity <= 0 ? (
                          <span className="product-list__error">
                            La cantidad debe ser mayor a 0.
                          </span>
                        ) : null}
                      </label>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="product-list__secondary-btn"
                    onClick={handleAddItem}
                  >
                    Agregar otro producto
                  </button>

                  <div className="product-list__form-actions">
                    <button type="button" onClick={closeModal}>
                      Cancelar
                    </button>
                    <button type="submit">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </article>
      ) : null}
    </section>
  )
}

export default ProductList
