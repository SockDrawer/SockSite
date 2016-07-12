'use strict';

const DB = require('./db');

class Dao {
    constructor(dbName) {
        this.db = new Dao.DB(dbName);
        this.cache = {
            pages: {}
        };
    }
    activate() {
        return this.db.run('CREATE TABLE IF NOT EXISTS pages (' +
                '    id INTEGER PRIMARY KEY' +
                '    key VARCHAR(255) NOT NULL' +
                '); CREATE TABLE IF NOT EXISTS checks (' +
                '    page INT NOT NULL,' +
                '    status INT NOT NULL,' +
                '    responseTime INT NOT NULL,' +
                '    checkedAt DATETIME NOT NULL,' +
                '    FOREIGN KEY (page) REFERENCES pages(id)' +
                ')')
            .then(() => {
                this.activate = () => Promise.resolve(this);
                return this;
            });
    }
    getPageId(page) {
        if (this.cache.pages[page]) {
            return Promise.resolve(this.cache.pages[page]);
        }
        return this.activate()
            .then(() => this.db.get('SELECT id FROM pages WHERE key = ?', [page]))
            .then((key) => {
                if (key) {
                    this.cache.pages[page] = key;
                    return key;
                }
                return this.db.run('INSERT INTO pages (key) VALUES (?)', [page])
                    .then((statement) => statement.lastId);
            });
    }
}
Dao.DB = DB;
module.exports = Dao;
