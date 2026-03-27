import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors())

app.get('/', (c) => {
  return c.json({
    name: 'Vida Platform API',
    version: '0.0.0',
    status: 'ok',
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: Date.now() })
})

export default app
