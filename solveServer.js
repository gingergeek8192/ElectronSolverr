import { ipcMain, session } from 'electron';
import express from 'express'
import solverManager from './solverManager.js'
import solverConfig from "./solverConfig.js";
import beforeSolve from './beforeSolve.js';
import afterSolve from './afterSolve.js';
import store from './solverPersist.js'

const solverServer = {

  server: express(),
  listen: null,

  setStoreSaveSnap: (params, key, result) => {
    store.set(key, result)
    new afterSolve.After({ params, cookie: result.solution.cookies[0] })
  },

  params: ( p, proxy, id=false, key=false, url=false) => ({
    id: id, key: key, url: url, proxy: p ? {
      protocol: p?.protocol.replace(':', ''), hostname: p?.hostname, port: p?.port, auth: { u: proxy?.username, p: proxy?.password }
    } : {},
    isProxy: !!p
  }),

  async solverrListen() {
    if (this.listen) return
    this.server.use(express.json()),
      this.server.post('/v1',
        async ({ body: { cmd, url, proxy } }, res) => {
          let result;
          const id = `.${new URL(url).hostname}`
          const p = proxy?.url ? new URL(proxy.url) : false
          const key = `${url}:` + `${p?.hostname ?? '0'}:` + `${p?.port ?? '0'}`
          const params = this.params(p, proxy, id, key, url)
          result = await beforeSolve.checkSessionCookies(params)
          if (!result) {
            if (!solverManager.isSolverWindow()) await solverManager.buildSolverWindow(p ? { isProxy: !!p, ...params.proxy } : { isProxy: false })
            const solver = await solverManager.createSolver(id)
            result = await solver.loadPage(url)
            this.setStoreSaveSnap(params, key, result)
          }
          return res.json(result)
        })
    this.listen = this.server.listen(8191)
  },


  async newProxy() {
    solverManager.closeBaseWindow()
    await store.clearSession()
  },


}

export default solverServer