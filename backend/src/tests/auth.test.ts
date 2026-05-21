import request from 'supertest'
import app from '../app'
import prisma from '../db'
import * as bcrypt from 'bcryptjs'

describe('Pruebas de Autenticación de la API', () => {
  let adminToken: string
  const testUser = {
    username: 'testadmin',
    password: 'password123',
    recoveryToken: 'REC-TEST-9999-YOYO',
  }

  beforeAll(async () => {
    // Limpiar tabla e insertar usuario de prueba
    await prisma.user.deleteMany({ where: { username: testUser.username } })

    const hash = await bcrypt.hash(testUser.password, 10)
    await prisma.user.create({
      data: {
        username: testUser.username,
        passwordHash: hash,
        recoveryToken: testUser.recoveryToken,
        role: 'admin',
      },
    })
  })

  afterAll(async () => {
    // Limpiar usuario de prueba y cerrar conexión
    await prisma.user.deleteMany({ where: { username: testUser.username } })
    await prisma.$disconnect()
  })

  it('Debería denegar el acceso a rutas protegidas sin token', async () => {
    const res = await request(app).get('/api/products')
    expect(res.status).toBe(401)
    expect(res.body.message).toContain('No se proporcionó token')
  })

  it('Debería iniciar sesión correctamente con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUser.username,
        password: testUser.password,
      })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user.username).toBe(testUser.username)
    adminToken = res.body.token
  })

  it('Debería rechazar credenciales inválidas en el login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUser.username,
        password: 'wrongpassword',
      })

    expect(res.status).toBe(401)
    expect(res.body.message).toContain('incorrectos')
  })

  it('Debería obtener los detalles del usuario actual con un token válido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.username).toBe(testUser.username)
    expect(res.body.role).toBe('admin')
  })

  it('Debería verificar correctamente el código de recuperación maestro', async () => {
    const res = await request(app)
      .post('/api/auth/verify-recovery')
      .send({
        username: testUser.username,
        recoveryToken: testUser.recoveryToken,
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('Debería fallar al verificar un código de recuperación incorrecto', async () => {
    const res = await request(app)
      .post('/api/auth/verify-recovery')
      .send({
        username: testUser.username,
        recoveryToken: 'REC-INCORRECTO-0000',
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('incorrecto')
  })
})
