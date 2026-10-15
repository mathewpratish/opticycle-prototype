import { app } from '../src/server.js'

export default function handler(req, res) {
  const requestUrl = req.url || '/'
  const queryIndex = requestUrl.indexOf('?')
  const pathname = queryIndex === -1 ? requestUrl : requestUrl.slice(0, queryIndex)

  if (pathname !== '/api' && !pathname.startsWith('/api/') && pathname !== '/health') {
    req.url = `/api${requestUrl}`
  }

  return app(req, res)
}
