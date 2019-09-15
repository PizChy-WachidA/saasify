'use strict'

const findFreePort = require('find-free-port')
const Koa = require('koa')
const open = require('open')
const url = require('url')
const qs = require('qs')

module.exports = async (client) => {
  let _resolve
  let _reject

  const serverP = new Promise((resolve, reject) => {
    _resolve = resolve
    _reject = reject
  })

  const [port] = await findFreePort(6013)
  const app = new Koa()
  app.use(async (ctx) => {
    const { searchParams } = new url.URL(`${ctx.request.origin}${ctx.request.url}`)
    const code = searchParams.get('code')

    if (!code) {
      _reject(code)
      ctx.body = 'Error authenticated Saasify with GitHub.'
    }

    _resolve(code)
    ctx.body = 'Saasify authenticated with GitHub successfully. You may now close this window.'
  })

  let server
  await new Promise((resolve, reject) => {
    server = app.listen(port, (err) => {
      if (err) return reject(err)
      else return resolve()
    })
  })

  const redirectUri = `http://localhost:${port}/auth/github`
  const config = client.baseUrl.indexOf('localhost') >= 0
    ? ({
      client_id: '86d73532d0105da51a4d',
      redirect_uri: redirectUri
    }) : ({
      client_id: '6525c812c9b4430147c3',
      redirect_uri: `https://auth.saasify.sh/?${qs.stringify({ uri: redirectUri })}`
    })

  const opts = (new url.URLSearchParams(config)).toString()
  open(`https://github.com/login/oauth/authorize?${opts}`)
  const code = await serverP

  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) return reject(err)
      else return resolve()
    })
  })

  return client.authWithGitHub({
    ...config,
    code
  })
}
