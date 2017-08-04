import chalk from 'chalk'
import createDatabase from './database'
import { Router } from 'express'

const fs = require('fs')
const { join } = require('path')
const { parse } = require('querystring')

export default function createRouter (options) {
  const router = Router()
  Object.keys(options.content).forEach(dirName => {
    const sendContent = curryResponseHandler(dirName, options)
    router.use(dirName, new Router().get('*', sendContent))
  })
  return router
}

function curryResponseHandler (endpoint, options) {
  const { sitePath, srcDir, api, content } = options

  const contentPath = join(sitePath, srcDir)

  const db = createDatabase(contentPath, endpoint, options)

  return function sendContent (req, res) {
    const send = response(res)
    const permalink = req.params['0']
    const [_, query] = req.url.match(/\?(.*)/) || []
    const { only, between, ...params } = parse(query)

    logRequest(permalink, api.serverPrefix, api.baseURL)

    if (permalink === '/') { // request multiple pages from directory
      if (between) send.json(db.findBetween(between, params))
      else if (only) send.json(db.findOnly(only, params))
      else send.json(db.findAll(params))
    } else { // request single page
      if (db.exists(permalink)) send.json(db.find(permalink, params))
      else send.notFound()
    }
  }
}

export const response = (res) => ({
  json(data) {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data), 'utf-8')
    console.log(`   Response sent successfully.`)
  },
  error(err) {
    console.log(`   Failed to send response.`, error)
    res.statusCode = 500
    res.statusMessage = 'Internal Server Error'
    res.end(err.stack || String(err))
  },
  notFound() {
    console.log(`   Page not found.`)
    res.statusCode = 404
    res.statusMessage = 'Not Found'
    res.end()
  }
})

function logRequest (permalink, apiPrefix, baseURL) {
  console.log(`${chalk.blue(apiPrefix)} ${chalk.green('GET')} ${baseURL + permalink}`)
  return permalink
}