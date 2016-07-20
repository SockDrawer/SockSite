'use strict';

const DB = require('./db');

class Dao {
    constructor(dbName) {
        this.db = new Dao.DB(dbName);
        this.cache = {
            pages: {}
        };
    }
    static get sqlCreateTables() {
        return 'CREATE TABLE IF NOT EXISTS pages (' +
            '    id INTEGER PRIMARY KEY' +
            '    key VARCHAR(255) NOT NULL' +
            '); CREATE TABLE IF NOT EXISTS checks (' +
            '    page INT NOT NULL,' +
            '    status INT NOT NULL,' +
            '    responseTime INT NOT NULL,' +
            '    checkedAt DATETIME NOT NULL,' +
            '    FOREIGN KEY (page) REFERENCES pages(id)' +
            ')';
    }
    static get sqlGetPage() {
        return 'SELECT id FROM pages WHERE key = $key';
    }
    static get sqlInsertPage() {
        return 'INSERT INTO pages (key) VALUES ($key)';
    }
    static get sqlInsertCheck() {
        return 'INSERT INTO checks (page, status, responseTime, checkedAt) ' +
            'VALUES ($page, $status, $responseTime, $checkedAt)';
    }
    static get sqlGetChecks() {
        return 'SELECT ' +
            '  p.key AS page, ' +
            '  c.status AS httpStatus, ' +
            '  c.responseTime AS responseTime, ' +
            '  c.checkedAt AS checkedAt ' +
            'FROM checks c ' +
            'JOIN pages p ' +
            '   ON c.page = p.OID ' +
            'WHERE checkedAt > $after AND checkedAt <= $until ' +
            'ORDER BY checkedAt DESC ' +
            'LIMIT 21600';
    }
    activate() {
        return this.db.exec(Dao.sqlCreateTables)
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
            .then(() => this.db.get(Dao.sqlGetPage, {
                $key: page
            }))
            .then((key) => {
                if (key) {
                    this.cache.pages[page] = key.id;
                    return key.id;
                }
                return this.db.run(Dao.sqlInsertPage, {
                        $key: page
                    })
                    .then((statement) => {
                        this.cache.pages[page] = statement.lastID;
                        return statement.lastID;
                    });
            });
    }
    addCheck(page, status, responseTime) {
        page = page.replace(/^https?:\/\//i, '');
        const now = new Date();
        return this.getPageId(page)
            .then((pageId) => this.db.run(Dao.sqlInsertCheck, {
                $page: pageId,
                $status: status,
                $responseTime: responseTime,
                $checkedAt: now
            }));
    }
    getChecks(from, until) {
        const now = new Date();
        if (!from || from > now) {
            from = now - 10 * 60 * 1000;
        }
        if (!until || until < from) {
            until = now;
        }
        return this.activate()
            .then(() => this.db.all(Dao.sqlGetChecks, {
                $after: from,
                $until: until
            }));
    }
}
Dao.DB = DB;
module.exports = Dao;
