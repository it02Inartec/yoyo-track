import { Response } from 'express'
import prisma from '../db'
import { AuthenticatedRequest } from '../middlewares/auth.middleware'

export async function listDebts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const debts = await prisma.debt.findMany({
      include: {
        products: true,
        payments: true,
      },
      orderBy: { client: 'asc' },
    })

    // Mapear al formato que espera el frontend
    const formatted = debts.map((d) => ({
      client: d.client,
      products: d.products.map((p) => ({
        name: p.name,
        quantity: p.quantity,
        price: p.price,
      })),
      payments: d.payments.map((pay) => ({
        date: pay.date,
        amount: pay.amount,
      })),
    }))

    res.json(formatted)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las deudas.' })
  }
}

export async function createOrUpdateDebt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { client, debtProducts } = req.body

  if (!client || client.trim() === '') {
    res.status(400).json({ message: 'El nombre del cliente es obligatorio.' })
    return
  }

  if (!Array.isArray(debtProducts) || debtProducts.length === 0) {
    res.status(400).json({ message: 'Se debe proporcionar al menos un producto para registrar la deuda.' })
    return
  }

  try {
    const trimmedClient = client.trim()

    // Ejecutamos todo dentro de una transacción para asegurar consistencia
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validar stock de cada producto y descontar
      const productsToUpdate = []

      for (const item of debtProducts) {
        const { productName, quantity } = item
        const numQty = Number(quantity)

        if (isNaN(numQty) || numQty <= 0) {
          throw new Error(`Cantidad inválida para el producto: ${productName}`)
        }

        const product = await tx.product.findUnique({
          where: { name: productName },
        })

        if (!product) {
          throw new Error(`El producto "${productName}" no existe en el inventario.`)
        }

        if (product.quantity < numQty) {
          throw new Error(`Stock insuficiente para "${productName}". Disponibles: ${product.quantity}, solicitados: ${numQty}`)
        }

        // Registrar cambios de stock
        productsToUpdate.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantityToSubtract: numQty,
          currentQuantity: product.quantity,
        })
      }

      // Descontar del inventario
      for (const item of productsToUpdate) {
        await tx.product.update({
          where: { id: item.id },
          data: { quantity: item.currentQuantity - item.quantityToSubtract },
        })
      }

      // 2. Buscar o crear la deuda del cliente
      let debt = await tx.debt.findUnique({
        where: { client: trimmedClient },
      })

      if (!debt) {
        debt = await tx.debt.create({
          data: { client: trimmedClient },
        })
      }

      // 3. Crear los DebtProduct asociados
      for (const item of productsToUpdate) {
        await tx.debtProduct.create({
          data: {
            debtId: debt.id,
            name: item.name,
            quantity: item.quantityToSubtract,
            price: item.price, // Guardamos instantánea del precio actual
          },
        })
      }

      // Devolver la deuda completa
      return await tx.debt.findUnique({
        where: { id: debt.id },
        include: {
          products: true,
          payments: true,
        },
      })
    })

    res.status(201).json({
      message: 'Deuda registrada y stock actualizado con éxito.',
      debt: result,
    })
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Error al procesar la deuda.' })
  }
}

export async function addPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { client } = req.params
  const { amount } = req.body
  const numAmount = Number(amount)

  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400).json({ message: 'El monto del abono debe ser un número mayor a 0.' })
    return
  }

  try {
    const trimmedClient = client.trim()

    const debt = await prisma.debt.findUnique({
      where: { client: trimmedClient },
      include: {
        products: true,
        payments: true,
      },
    })

    if (!debt) {
      res.status(404).json({ message: `No se encontró ninguna deuda para el cliente "${client}".` })
      return
    }

    const totalConsumed = debt.products.reduce((sum, p) => sum + p.quantity * p.price, 0)
    const totalPaid = debt.payments.reduce((sum, pay) => sum + pay.amount, 0)
    const pendingBalance = Math.max(totalConsumed - totalPaid, 0)

    if (numAmount > pendingBalance) {
      res.status(400).json({
        message: `El monto del abono ($${numAmount}) supera el saldo pendiente ($${pendingBalance.toFixed(2)}).`,
      })
      return
    }

    const todayStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    const payment = await prisma.payment.create({
      data: {
        debtId: debt.id,
        amount: numAmount,
        date: todayStr,
      },
    })

    res.json({
      message: `Abono de $${numAmount} registrado correctamente para ${trimmedClient}.`,
      payment,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error interno al registrar el abono.' })
  }
}

export async function payAllDebt(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { client } = req.params

  try {
    const trimmedClient = client.trim()

    const debt = await prisma.debt.findUnique({
      where: { client: trimmedClient },
      include: {
        products: true,
        payments: true,
      },
    })

    if (!debt) {
      res.status(404).json({ message: `No se encontró ninguna deuda para el cliente "${client}".` })
      return
    }

    const totalConsumed = debt.products.reduce((sum, p) => sum + p.quantity * p.price, 0)
    const totalPaid = debt.payments.reduce((sum, pay) => sum + pay.amount, 0)
    const pendingBalance = Math.max(totalConsumed - totalPaid, 0)

    if (pendingBalance <= 0) {
      res.status(400).json({ message: 'El cliente no tiene saldo pendiente por pagar.' })
      return
    }

    const todayStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    const payment = await prisma.payment.create({
      data: {
        debtId: debt.id,
        amount: pendingBalance,
        date: todayStr,
      },
    })

    res.json({
      message: `Deuda de ${trimmedClient} liquidada por completo con un pago final de $${pendingBalance.toFixed(2)}.`,
      payment,
    })
  } catch (error) {
    res.status(500).json({ message: 'Error interno al liquidar la deuda.' })
  }
}
