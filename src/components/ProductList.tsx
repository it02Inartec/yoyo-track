import './ProductList.css'
import { useEffect, useRef, useState, type FocusEvent, type FormEvent } from 'react'

export type Product = {
  id?: string
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
  onAddDebtPayment?: (client: string, amount: number) => void
  onPayDebt?: (client: string, pendingAmount: number) => void
  onAddProduct?: (product: Product) => void
  onUpdateProduct?: (index: number, product: Product) => void
  onDeleteProduct?: (index: number) => void
}

type ProductFormMode = 'create' | 'edit'
type ConfirmAction =
  | { type: 'delete-product'; index: number; name: string }
  | { type: 'pay-debt'; client: string; pendingAmount: number }

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

function calculateDebtAmount(products: { name: string; quantity: number; price: number }[]) {
  return products.reduce((accumulator, product) => {
    return accumulator + product.quantity * product.price
  }, 0)
}

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
  onAddDebtPayment,
  onPayDebt,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}: ProductListProps) {
  function handleSelectOnFocus(e: FocusEvent<HTMLInputElement>) {
    e.currentTarget.select()
  }

  const confirmationTimeoutRef = useRef<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clientName, setClientName] = useState('')
  const [debtItems, setDebtItems] = useState([{ product: '', quantity: 1 }])
  const [nameTouched, setNameTouched] = useState(false)
  const [itemTouched, setItemTouched] = useState([{ product: false, quantity: false }])

  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [productModalMode, setProductModalMode] = useState<ProductFormMode>('create')
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null)
  const [productForm, setProductForm] = useState<Product>({ name: '', quantity: 1, price: 0 })
  const [productFormTouched, setProductFormTouched] = useState({
    name: false,
    quantity: false,
    price: false,
  })

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentClient, setPaymentClient] = useState('')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMaxAmount, setPaymentMaxAmount] = useState(0)
  const [paymentTouched, setPaymentTouched] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const pendingDebts = debtHistory.filter((debt) => {
    const totalDebt = calculateDebtAmount(debt.products)
    const totalPaid = calculatePaidAmount(debt.payments)
    return totalDebt - totalPaid > 0
  })

  const isNameDuplicate = products.some((product, index) => {
    const normalizedCurrentName = product.name.trim().toLowerCase()
    const normalizedFormName = productForm.name.trim().toLowerCase()
    if (!normalizedFormName) return false
    if (productModalMode === 'edit' && index === editingProductIndex) return false
    return normalizedCurrentName === normalizedFormName
  })

  useEffect(() => {
    return () => {
      if (confirmationTimeoutRef.current !== null) {
        window.clearTimeout(confirmationTimeoutRef.current)
      }
    }
  }, [])

  function showConfirmation(message: string) {
    setConfirmationMessage(message)
    if (confirmationTimeoutRef.current !== null) {
      window.clearTimeout(confirmationTimeoutRef.current)
    }
    confirmationTimeoutRef.current = window.setTimeout(() => {
      setConfirmationMessage('')
    }, 2600)
  }

  function resetProductForm() {
    setProductForm({ name: '', quantity: 1, price: 0 })
    setProductFormTouched({ name: false, quantity: false, price: false })
    setEditingProductIndex(null)
  }

  function openCreateProductModal() {
    resetProductForm()
    setProductModalMode('create')
    setIsProductModalOpen(true)
  }

  function openEditProductModal(index: number) {
    const selectedProduct = products[index]
    if (!selectedProduct) return

    setProductModalMode('edit')
    setEditingProductIndex(index)
    setProductForm({ ...selectedProduct })
    setProductFormTouched({ name: false, quantity: false, price: false })
    setIsProductModalOpen(true)
  }

  function closeProductModal() {
    setIsProductModalOpen(false)
    resetProductForm()
  }

  function handleProductDelete(index: number) {
    if (!onDeleteProduct) return
    const selectedProduct = products[index]
    if (!selectedProduct) return
    setConfirmAction({
      type: 'delete-product',
      index,
      name: selectedProduct.name,
    })
  }

  function handleProductSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!onAddProduct && !onUpdateProduct) return

    setProductFormTouched({ name: true, quantity: true, price: true })

    const trimmedName = productForm.name.trim()
    const isNameValid = trimmedName.length > 0
    const isQuantityValid = productForm.quantity > 0
    const isPriceValid = productForm.price > 0

    if (!isNameValid || !isQuantityValid || !isPriceValid || isNameDuplicate) return

    const payload: Product = {
      name: trimmedName,
      quantity: productForm.quantity,
      price: productForm.price,
    }

    if (productModalMode === 'create') {
      onAddProduct?.(payload)
      showConfirmation(`Producto "${payload.name}" guardado correctamente.`)
    } else if (editingProductIndex !== null) {
      onUpdateProduct?.(editingProductIndex, payload)
      showConfirmation(`Producto "${payload.name}" actualizado correctamente.`)
    }

    closeProductModal()
  }

  function openDebtModal() {
    setClientName('')
    setDebtItems([{ product: availableProducts[0]?.name ?? '', quantity: 1 }])
    setNameTouched(false)
    setItemTouched([{ product: false, quantity: false }])
    setIsModalOpen(true)
  }

  function closeDebtModal() {
    setIsModalOpen(false)
  }

  function openPaymentModal(client: string, pendingAmount: number) {
    setPaymentClient(client)
    setPaymentMaxAmount(pendingAmount)
    setPaymentAmount(Number(pendingAmount.toFixed(2)))
    setPaymentTouched(false)
    setIsPaymentModalOpen(true)
  }

  function closePaymentModal() {
    setIsPaymentModalOpen(false)
    setPaymentClient('')
    setPaymentAmount(0)
    setPaymentMaxAmount(0)
    setPaymentTouched(false)
  }

  function handleSavePayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!onAddDebtPayment) return

    setPaymentTouched(true)

    if (paymentAmount <= 0 || paymentAmount > paymentMaxAmount) return

    onAddDebtPayment(paymentClient, paymentAmount)
    showConfirmation(`Abono registrado para ${paymentClient}.`)
    closePaymentModal()
  }

  function handlePayDebtClick(client: string, pendingAmount: number) {
    if (!onPayDebt || pendingAmount <= 0) return
    setConfirmAction({
      type: 'pay-debt',
      client,
      pendingAmount,
    })
  }

  function handleConfirmAction() {
    if (!confirmAction) return

    if (confirmAction.type === 'delete-product') {
      onDeleteProduct?.(confirmAction.index)
      showConfirmation(`Producto "${confirmAction.name}" eliminado correctamente.`)
    }

    if (confirmAction.type === 'pay-debt') {
      onPayDebt?.(confirmAction.client, confirmAction.pendingAmount)
      showConfirmation(`Deuda de ${confirmAction.client} pagada completamente.`)
    }

    setConfirmAction(null)
  }

  function handleAddItem() {
    setDebtItems((current) => [
      ...current,
      { product: availableProducts[0]?.name ?? '', quantity: 1 },
    ])
    setItemTouched((current) => [...current, { product: false, quantity: false }])
  }

  function handleChangeItem(index: number, key: 'product' | 'quantity', value: string) {
    setDebtItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        if (key === 'quantity') return { ...item, quantity: Number(value) }
        return { ...item, product: value }
      }),
    )
  }

  function handleBlurItem(index: number, key: 'product' | 'quantity') {
    setItemTouched((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        return { ...item, [key]: true }
      }),
    )
  }

  function getAvailableQuantity(productName: string) {
    const selectedProduct = availableProducts.find((product) => product.name === productName)
    return selectedProduct?.quantity ?? 0
  }

  function handleSaveDebt(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!onAddDebt) return
    setNameTouched(true)
    setItemTouched((current) => current.map(() => ({ product: true, quantity: true })))

    const isNameValid = clientName.trim().length > 0
    const hasInvalidItems = debtItems.some((item) => {
      if (!item.product || item.quantity <= 0) return true
      return item.quantity > getAvailableQuantity(item.product)
    })
    const requiredByProduct = debtItems.reduce<Record<string, number>>((accumulator, item) => {
      const normalizedName = item.product.trim().toLowerCase()
      if (!normalizedName || item.quantity <= 0) return accumulator
      accumulator[normalizedName] = (accumulator[normalizedName] ?? 0) + item.quantity
      return accumulator
    }, {})

    const hasInsufficientAccumulatedStock = Object.entries(requiredByProduct).some(
      ([normalizedName, requiredQuantity]) => {
        const selectedProduct = availableProducts.find(
          (product) => product.name.trim().toLowerCase() === normalizedName,
        )
        return !selectedProduct || requiredQuantity > selectedProduct.quantity
      },
    )

    if (!isNameValid || hasInvalidItems || hasInsufficientAccumulatedStock) return

    const debtProducts = debtItems.map((item) => ({
      productName: item.product,
      quantity: item.quantity,
    }))

    if (debtProducts.length === 0) return

    onAddDebt(clientName, debtProducts)
    showConfirmation(`Deuda guardada para ${clientName.trim()}.`)
    closeDebtModal()
  }

  return (
    <section className="product-list">
      {confirmationMessage ? (
        <p className="product-list__confirmation" role="status">
          {confirmationMessage}
        </p>
      ) : null}
      {showProducts ? (
        <div className="product-list__container">
          <div className="product-list__actions-bar">
            <h3 className="product-list__section-title">Inventario</h3>
            <button className="product-list__add-btn" type="button" onClick={openCreateProductModal}>
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
                className="product-list__btn-icon"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Agregar</span>
            </button>
          </div>
          <article className="product-list__section">
            {products.length === 0 ? (
              <p className="product-list__empty">No hay productos en inventario.</p>
            ) : (
              <div className="product-list__table-wrap">
                <table className="product-list__table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Cantidad</th>
                      <th>Precio</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((productItem, index) => (
                      <tr key={`${productItem.name}-${index}`}>
                        <td data-label="Nombre">{productItem.name}</td>
                        <td data-label="Cantidad">{productItem.quantity}</td>
                        <td data-label="Precio">{formatCurrency(productItem.price)}</td>
                        <td data-label="Acciones">
                          <div className="product-list__row-actions">
                            <button
                              type="button"
                              className="product-list__secondary-btn"
                              onClick={() => openEditProductModal(index)}
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
                                className="product-list__btn-icon product-list__btn-icon--edit"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              className="product-list__danger-btn"
                              onClick={() => handleProductDelete(index)}
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
                                className="product-list__btn-icon product-list__btn-icon--trash"
                              >
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      ) : null}

      {showDebtHistory ? (
        <div className="product-list__container">
          <div className="product-list__actions-bar">
            <h3 className="product-list__section-title">Deudas</h3>
            <button className="product-list__add-btn" type="button" onClick={openDebtModal}>
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
                className="product-list__btn-icon"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Agregar</span>
            </button>
          </div>
          <article className="product-list__section">
            {pendingDebts.length === 0 ? (
              <p className="product-list__empty">No hay deudas registradas.</p>
            ) : (
              <div className="product-list__table-wrap product-list__table-wrap--debts">
                <table className="product-list__table product-list__table--debts">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Productos</th>
                      <th>Consumido</th>
                      <th>Abonado</th>
                      <th>Saldo pendiente</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDebts.map((debt, index) => {
                      const totalConsumed = calculateDebtAmount(debt.products)
                      const totalPaid = calculatePaidAmount(debt.payments)
                      const pendingBalance = Math.max(totalConsumed - totalPaid, 0)

                      return (
                        <tr key={`${debt.client}-${index}`}>
                          <td data-label="Cliente">{debt.client}</td>
                          <td data-label="Productos">
                            <div className="product-list__chips-container">
                              {debt.products.map((productItem, productIndex) => (
                                <span key={`${productItem.name}-${productIndex}`} className="product-list__chip">
                                  <span className="product-list__chip-quantity">{productItem.quantity}</span>
                                  <span className="product-list__chip-name">{productItem.name}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td data-label="Consumido">{formatCurrency(totalConsumed)}</td>
                          <td data-label="Abonado">{formatCurrency(totalPaid)}</td>
                          <td data-label="Saldo pendiente">{formatCurrency(pendingBalance)}</td>
                          <td data-label="Acciones">
                            <div className="product-list__row-actions">
                              <button
                                type="button"
                                className="product-list__secondary-btn"
                                onClick={() => openPaymentModal(debt.client, pendingBalance)}
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
                                  className="product-list__btn-icon product-list__btn-icon--card"
                                >
                                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                  <line x1="1" y1="10" x2="23" y2="10"></line>
                                </svg>
                                <span>Abonar</span>
                              </button>
                              <button
                                type="button"
                                className="product-list__pay-btn"
                                onClick={() => handlePayDebtClick(debt.client, pendingBalance)}
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
                                  className="product-list__btn-icon product-list__btn-icon--pay"
                                >
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                <span>Pagar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          {isModalOpen ? (
            <div className="product-list__modal-backdrop" role="dialog" aria-modal="true">
              <div className="product-list__modal">
                <h3 className="product-list__modal-title">Registrar deuda</h3>
                <form className="product-list__form" onSubmit={handleSaveDebt} noValidate>
                  <label>
                    Nombre
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      onBlur={() => setNameTouched(true)}
                    />
                    {nameTouched && !clientName.trim() ? (
                      <span className="product-list__error">El nombre no puede estar vacio.</span>
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
                              {productItem.name} (Disponibles: {productItem.quantity})
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
                          max={item.product ? getAvailableQuantity(item.product) : undefined}
                          value={item.quantity}
                          onFocus={handleSelectOnFocus}
                          onChange={(e) => handleChangeItem(index, 'quantity', e.target.value)}
                          onBlur={() => handleBlurItem(index, 'quantity')}
                        />
                        {itemTouched[index]?.quantity && item.quantity <= 0 ? (
                          <span className="product-list__error">
                            La cantidad debe ser mayor a 0.
                          </span>
                        ) : null}
                        {itemTouched[index]?.quantity &&
                        item.product &&
                        item.quantity > getAvailableQuantity(item.product) ? (
                          <span className="product-list__error">
                            No hay suficiente inventario para este producto.
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
                      className="product-list__btn-icon product-list__btn-icon--plus"
                    >
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Agregar otro producto</span>
                  </button>

                  <div className="product-list__form-actions">
                    <button type="button" onClick={closeDebtModal}>
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
                        className="product-list__btn-icon product-list__btn-icon--cancel"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                      <span>Cancelar</span>
                    </button>
                    <button type="submit">
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
                        className="product-list__btn-icon product-list__btn-icon--save"
                      >
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                      <span>Guardar</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {isPaymentModalOpen ? (
        <div className="product-list__modal-backdrop" role="dialog" aria-modal="true">
          <div className="product-list__modal">
            <h3 className="product-list__modal-title">Abonar deuda de {paymentClient}</h3>
            <form className="product-list__form" onSubmit={handleSavePayment} noValidate>
              <label>
                Monto abonado
                <input
                  type="number"
                  min={0.01}
                  max={paymentMaxAmount}
                  step={0.01}
                  value={paymentAmount}
                  onFocus={handleSelectOnFocus}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  onBlur={() => setPaymentTouched(true)}
                />
                {paymentTouched && paymentAmount <= 0 ? (
                  <span className="product-list__error">El monto debe ser mayor a 0.</span>
                ) : null}
                {paymentTouched && paymentAmount > paymentMaxAmount ? (
                  <span className="product-list__error">
                    El monto no puede superar el saldo pendiente ({formatCurrency(paymentMaxAmount)}).
                  </span>
                ) : null}
              </label>

              <div className="product-list__form-actions">
                <button type="button" onClick={closePaymentModal}>
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
                    className="product-list__btn-icon product-list__btn-icon--cancel"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Cancelar</span>
                </button>
                <button type="submit">
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
                    className="product-list__btn-icon product-list__btn-icon--save"
                  >
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  <span>Guardar abono</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isProductModalOpen ? (
        <div className="product-list__modal-backdrop" role="dialog" aria-modal="true">
          <div className="product-list__modal">
            <h3 className="product-list__modal-title">
              {productModalMode === 'create' ? 'Agregar producto' : 'Editar producto'}
            </h3>
            <form className="product-list__form" onSubmit={handleProductSubmit} noValidate>
              <label>
                Nombre
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm((current) => ({ ...current, name: e.target.value }))}
                  onBlur={() =>
                    setProductFormTouched((current) => ({ ...current, name: true }))
                  }
                />
                {productFormTouched.name && !productForm.name.trim() ? (
                  <span className="product-list__error">El nombre no puede estar vacio.</span>
                ) : null}
                {productFormTouched.name && isNameDuplicate ? (
                  <span className="product-list__error">Ya existe un producto con ese nombre.</span>
                ) : null}
              </label>

              <label>
                Cantidad
                <input
                  type="number"
                  min={1}
                  value={productForm.quantity}
                  onFocus={handleSelectOnFocus}
                  onChange={(e) =>
                    setProductForm((current) => ({ ...current, quantity: Number(e.target.value) }))
                  }
                  onBlur={() =>
                    setProductFormTouched((current) => ({ ...current, quantity: true }))
                  }
                />
                {productFormTouched.quantity && productForm.quantity <= 0 ? (
                  <span className="product-list__error">La cantidad debe ser mayor a 0.</span>
                ) : null}
              </label>

              <label>
                Precio
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={productForm.price}
                  onFocus={handleSelectOnFocus}
                  onChange={(e) =>
                    setProductForm((current) => ({ ...current, price: Number(e.target.value) }))
                  }
                  onBlur={() =>
                    setProductFormTouched((current) => ({ ...current, price: true }))
                  }
                />
                {productFormTouched.price && productForm.price <= 0 ? (
                  <span className="product-list__error">El precio debe ser mayor a 0.</span>
                ) : null}
              </label>

              <div className="product-list__form-actions">
                <button type="button" onClick={closeProductModal}>
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
                    className="product-list__btn-icon product-list__btn-icon--cancel"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                  <span>Cancelar</span>
                </button>
                <button type="submit">
                  {productModalMode === 'create' ? (
                    <>
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
                        className="product-list__btn-icon product-list__btn-icon--plus"
                      >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span>Agregar</span>
                    </>
                  ) : (
                    <>
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
                        className="product-list__btn-icon product-list__btn-icon--save"
                      >
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                      <span>Guardar cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="product-list__modal-backdrop" role="dialog" aria-modal="true">
          <div className="product-list__modal product-list__confirm-modal">
            <h3 className="product-list__modal-title">Confirmar accion</h3>
            <p className="product-list__confirm-text">
              {confirmAction.type === 'delete-product'
                ? `Vas a eliminar el producto "${confirmAction.name}". Esta accion no se puede deshacer.`
                : `Vas a pagar completamente la deuda de ${confirmAction.client} por ${formatCurrency(confirmAction.pendingAmount)}.`}
            </p>
            <div className="product-list__form-actions">
              <button type="button" onClick={() => setConfirmAction(null)}>
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
                  className="product-list__btn-icon product-list__btn-icon--cancel"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Cancelar</span>
              </button>
              <button
                type="button"
                className="product-list__confirm-danger-btn"
                onClick={handleConfirmAction}
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
                  className="product-list__btn-icon product-list__btn-icon--confirm"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Confirmar</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default ProductList
