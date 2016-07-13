'use strict';
const sqlite = require('sqlite3');

class DB {
    constructor(dbName) {
        this.dbName = dbName;
        this.db = null;
    }
    activate() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite.Database(this.dbName, (err) => {
                if (err) {
                    return reject(err);
                }
                this.activate = () => Promise.resolve();
                resolve();
            });
        });
    }
    _exec(func, query, params) {
        return this.activate().then(() => {
            return new Promise((resolve, reject) => {
                const after = function (err, res) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(res || func !== 'run' ? res : this);
                };
                if (func === 'exec') {
                    this.db.exec(query, after);
                } else {
                    this.db[func](query, params, after);
                }
            });
        });
    }
    run(query, params) {
        return this._exec('run', query, params);
    }
    exec(query) {
        return this._exec('exec', query);
    }
    all(query, params) {
        return this._exec('all', query, params);
    }
    get(query, params) {
        return this._exec('get', query, params);
    }
}
module.exports = DB;
