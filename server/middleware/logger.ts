export default defineEventHandler((event) => {
  const start = Date.now()
  const method = event.method
  const url = event.path

  event.node.res.on('finish', () => {
    const duration = Date.now() - start
    const status = event.node.res.statusCode
    const ip = getRequestIP(event, { xForwardedFor: true }) || '-'
    const now = new Date()
    const timestamp = now.getFullYear()
      + '-' + String(now.getMonth() + 1).padStart(2, '0')
      + '-' + String(now.getDate()).padStart(2, '0')
      + ' ' + String(now.getHours()).padStart(2, '0')
      + ':' + String(now.getMinutes()).padStart(2, '0')
      + ':' + String(now.getSeconds()).padStart(2, '0')

    console.log(`[${timestamp}] ${method} ${url} ${status} ${duration}ms ${ip}`)
  })
})
