import express from 'express'
import cors from 'cors'
import * as dotenv from 'dotenv'
import { authMiddleware } from './middlewares/auth.middleware'
import {
  login,
  me,
  changePassword,
  verifyRecovery,
  resetPassword,
} from './controllers/auth.controller'
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from './controllers/product.controller'
import {
  listDebts,
  createOrUpdateDebt,
  addPayment,
  payAllDebt,
} from './controllers/debt.controller'

dotenv.config()

const app = express()

// Configurar middlewares globales
app.use(cors())
app.use(express.json())

// --- RUTAS DE LA API ---

// 1. Rutas de Autenticación
app.post('/api/auth/login', login)
app.get('/api/auth/me', authMiddleware, me)
app.post('/api/auth/change-password', authMiddleware, changePassword)
app.post('/api/auth/verify-recovery', verifyRecovery)
app.post('/api/auth/reset-password', resetPassword)

// 2. Rutas de Inventario (Productos) - Todas protegidas
app.get('/api/products', authMiddleware, listProducts)
app.post('/api/products', authMiddleware, createProduct)
app.put('/api/products/:id', authMiddleware, updateProduct)
app.delete('/api/products/:id', authMiddleware, deleteProduct)

// 3. Rutas de Deudas y Lista Negra - Todas protegidas
app.get('/api/debts', authMiddleware, listDebts)
app.post('/api/debts', authMiddleware, createOrUpdateDebt)
app.post('/api/debts/:client/payments', authMiddleware, addPayment)
app.post('/api/debts/:client/pay-all', authMiddleware, payAllDebt)

// Ruta de diagnóstico simple
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

export default app
