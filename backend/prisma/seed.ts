import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando el sembrado de base de datos (seeding)...')

  // 1. Limpiar base de datos
  await prisma.payment.deleteMany()
  await prisma.debtProduct.deleteMany()
  await prisma.debt.deleteMany()
  await prisma.product.deleteMany()
  await prisma.user.deleteMany()

  // 2. Crear usuario administrador por defecto
  // admin / admin123
  const passwordHash = await bcrypt.hash('admin123', 10)
  // Generar código de recuperación maestro inicial
  const recoveryToken = 'REC-1234-5678-YOYO'

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash,
      recoveryToken,
      role: 'admin',
    },
  })
  console.log(`Usuario administrador creado: ${admin.username}`)
  console.log(`CÓDIGO DE RECUPERACIÓN MAESTRO: ${recoveryToken}`)

  // 3. Crear productos iniciales
  const prodMani = await prisma.product.create({
    data: { name: 'Mani salado', quantity: 20, price: 1.25 },
  })
  const prodSeco = await prisma.product.create({
    data: { name: 'Fruto seco variado', quantity: 14, price: 1.5 },
  })
  const prodGomitas = await prisma.product.create({
    data: { name: 'Gomitas', quantity: 35, price: 0.75 },
  })
  console.log('Productos iniciales creados.')

  // 4. Crear deudas iniciales
  // Maria: Mani salado (2), Gomitas (1). Abono (1.25)
  const debtMaria = await prisma.debt.create({
    data: {
      client: 'Maria',
      products: {
        create: [
          { name: 'Mani salado', quantity: 2, price: 1.25 },
          { name: 'Gomitas', quantity: 1, price: 0.75 },
        ],
      },
      payments: {
        create: [{ amount: 1.25, date: '2026-05-01' }],
      },
    },
  })

  // Pedro: Fruto seco variado (1). Sin abonos
  await prisma.debt.create({
    data: {
      client: 'Pedro',
      products: {
        create: [{ name: 'Fruto seco variado', quantity: 1, price: 1.5 }],
      },
    },
  })

  // Jose: Gomitas (3). Abono (2.25)
  await prisma.debt.create({
    data: {
      client: 'Jose',
      products: {
        create: [{ name: 'Gomitas', quantity: 3, price: 0.75 }],
      },
      payments: {
        create: [{ amount: 2.25, date: '2026-05-02' }],
      },
    },
  })

  console.log('Deudas iniciales creadas con sus respectivos productos y abonos.')
  console.log('¡Proceso de sembrado completado con éxito!')
}

main()
  .catch((e) => {
    console.error('Error durante el sembrado:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
