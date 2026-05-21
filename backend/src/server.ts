import app from './app'

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`=============================================`)
  console.log(`🚀 Servidor Yoyo Track ejecutándose en:`)
  console.log(`👉 http://localhost:${PORT}`)
  console.log(`=============================================`)
})
