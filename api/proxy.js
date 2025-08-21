// api/proxy.js
export const config = {
  runtime: "edge",
}

const TARGET_HOST = 'https://ecsc-expat.sy:8443'

export default async function handler(req) {
  const { pathname, search } = new URL(req.url)

  const targetUrl = new URL(TARGET_HOST)
  targetUrl.pathname = pathname
  targetUrl.search = search

  // نسخ الهيدرز
  const headers = new Headers(req.headers)
  headers.set('Host', targetUrl.hostname)
  headers.set('Origin', `https://${targetUrl.hostname}`)
  headers.set('Referer', `https://${targetUrl.hostname}${pathname}`)
  headers.set('Sec-Fetch-Site', 'same-site')
  headers.set('Sec-Fetch-Mode', 'cors')
  headers.set('Sec-Fetch-Dest', 'empty')
  headers.set('Alt-Used', targetUrl.hostname)

  // معالجة OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  // إرسال الطلب للأوريجن
  const proxiedRequest = new Request(targetUrl.toString(), {
    method: req.method,
    headers,
    body: req.body,
    redirect: 'manual'
  })

  let response
  try {
    response = await fetch(proxiedRequest, { credentials: 'include' })
  } catch (err) {
    return new Response('Bad gateway: ' + err.toString(), { status: 502 })
  }

  // إضافة CORS للرد
  const newHeaders = new Headers(response.headers)
  newHeaders.set('Access-Control-Allow-Origin', '*')
  newHeaders.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  newHeaders.set('Access-Control-Allow-Headers', '*')
  newHeaders.set('Access-Control-Allow-Credentials', 'true')

  const body = await response.arrayBuffer()
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
