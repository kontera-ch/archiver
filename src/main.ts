import { bootstrap } from './server'

async function startServer() {
  const { app } = await bootstrap()
  app.listen(4343, '0.0.0.0')
}

startServer()
