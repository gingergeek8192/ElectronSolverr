import { app, ipcMain, session } from 'electron';
import fs from 'node:fs'
import path from 'path'

const persist = {

    cookies: new Map(),
    store: {},

    storePath: (fileName) => path.join(app.getPath("userData"), fileName),

    writeStore: (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2)),

    readStore(filePath, data) {
        if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(data))
        return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    },


    _init() {
        this.store.getSession = () => session.fromPartition(`persist:solver`)
        this.store.set = (key, val) => this.cookies.set(key, val)
        this.store.load = () => this.readStore(this.storePath('solver'), []).forEach(ent => this.cookies.set(ent.key, ent))
        this.store.clearSession = async () => await this.store.getSession.clearStorageData({ storages: ['cookies', 'shadercache', 'cachestorage', 'indexdb'] })
        this.store.setSnap = (fileName, html) => this.writeStore(this.storePath(fileName), html)
        this.store.getSnap = (fileName) => this.readStore(this.storePath(fileName), '')

        this.store.forget = async () => {
            await this.store.clearSession()
            this.store.flush()
            this.cookies.clear()
        }

        this.store.get = (key) => {
            const obj = this.cookies.get(key)
            return {
                cookie: obj?.solution?.cookies[0] ?? false,
                key: obj?.key ?? '',
                url: obj?.solution?.url ?? ''
            }
        }

        this.store.flush = () => {
            const diskStore = []
            this.cookies.entries().forEach(([key, val]) => diskStore.push({ key: key, ...val }))
            this.writeStore(this.storePath('solver'), diskStore)
        }

        this.store.load()
        return this.store

    },

    flush: app.on('before-quit', () => persist.store.flush())
}

export default persist._init()