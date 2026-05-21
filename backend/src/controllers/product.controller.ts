import { Response } from 'express'
import prisma from '../db'
import { AuthenticatedRequest } from '../middlewares/auth.middleware'

export async function listProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
    })
    res.json(products)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los productos del inventario.' })
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { name, quantity, price } = req.body

  if (!name || name.trim() === '') {
    res.status(400).json({ message: 'El nombre del producto es obligatorio.' })
    return
  }

  const numQuantity = Number(quantity)
  const numPrice = Number(price)

  if (isNaN(numQuantity) || numQuantity <= 0) {
    res.status(400).json({ message: 'La cantidad debe ser un número mayor a 0.' })
    return
  }

  if (isNaN(numPrice) || numPrice <= 0) {
    res.status(400).json({ message: 'El precio debe ser un número mayor a 0.' })
    return
  }

  try {
    const trimmedName = name.trim()
    const existing = await prisma.product.findUnique({
      where: { name: trimmedName },
    })

    if (existing) {
      res.status(400).json({ message: 'Ya existe un producto con este nombre.' })
      return
    }

    const newProduct = await prisma.product.create({
      data: {
        name: trimmedName,
        quantity: numQuantity,
        price: numPrice,
      },
    })

    res.status(201).json(newProduct)
  } catch (error) {
    res.status(500).json({ message: 'Error interno al crear el producto.' })
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params
  const { name, quantity, price } = req.body

  if (!name || name.trim() === '') {
    res.status(400).json({ message: 'El nombre del producto es obligatorio.' })
    return
  }

  const numQuantity = Number(quantity)
  const numPrice = Number(price)

  if (isNaN(numQuantity) || numQuantity <= 0) {
    res.status(400).json({ message: 'La cantidad debe ser un número mayor a 0.' })
    return
  }

  if (isNaN(numPrice) || numPrice <= 0) {
    res.status(400).json({ message: 'El precio debe ser un número mayor a 0.' })
    return
  }

  try {
    const trimmedName = name.trim()
    const existing = await prisma.product.findFirst({
      where: {
        name: trimmedName,
        NOT: { id },
      },
    })

    if (existing) {
      res.status(400).json({ message: 'Ya existe otro producto con este nombre.' })
      return
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: trimmedName,
        quantity: numQuantity,
        price: numPrice,
      },
    })

    res.json(updated)
  } catch (error) {
    res.status(500).json({ message: 'Error interno al actualizar el producto.' })
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params

  try {
    await prisma.product.delete({
      where: { id },
    })

    res.json({ message: 'Producto eliminado correctamente.' })
  } catch (error) {
    res.status(500).json({ message: 'Error interno al eliminar el producto.' })
  }
}
