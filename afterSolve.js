import beforeAfter from './beforeAfter.js'
import store from './solverPersist.js'

const afterSolve = {
    After: class {
        constructor(data) {
            Object.assign(this, data)
            beforeAfter.goToURL(this.params, this.cookie)
                .then((resp) => store.setSnap(this.params.id.split('.').join('-'), resp.data))
                .catch(() => console.log(`failed to save snap for ${this.params.url}`))
        }
    }
}


export default afterSolve