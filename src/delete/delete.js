const hg = require('mercury')
const toHTML = require('vdom-to-html')
const h = hg.h
const css = require('./build-css')
const log = require('../main/shared/log')


const body = h('body', [
  h('div.line', [
    h('span.path', '~/P/t/deployments '),
    h('span.path-sep', '⮀'),
    h('span.branch', ' ⭠ master '),
    h('span.branch-sep', '⮀ '),
    h('span.command', 'ls')
  ]),
  h('div.output', [
    h('div.output-line', [
      h('span', 'mongod.conf'),
      h('span', 'nginx.conf'),
      h('span.exec', 'ngrok.sh '),
      h('span.exec', 'ssh'),
    ]),
    h('div.output-line', [
      h('span.dir', 'namecheap'),
      h('span', 'ngrok-viewer.sh'),
      h('span.dir', 'scripts'),
      h('span.dir', 'ssl'),
    ])
  ]),
  h('div.line', [
    h('span.path', '~/P/t/deployments '),
    h('span.path-sep', '⮀'),
    h('span.branch', ' ⭠ master '),
    h('span.branch-sep', '⮀ '),
    h('span.cursor', '█'),
  ])
])


const render = () => {
  return h('html', [
    h('head', [
      h('link', {
        rel: 'stylesheet',
        type: 'text/css',
        href: '/ui-test.css'
      })
    ]),
    body
  ])
}

module.exports = {
  dom: toHTML(render()),
  css: (req, res) => {
    res.contentType('text/css')
    css().then((css) => {
      res.send(css.toString())
    }).catch(err => {
      log.error(err)
      res.sendStatus(500)
    })
  }
}
