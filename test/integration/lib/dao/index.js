'use strict';

const chai = require('chai'),
    sinon = require('sinon');

//promise library plugins
require('sinon-as-promised');
chai.use(require('chai-as-promised'));

chai.should();

const sqlite = require('sqlite3');
const Dao = require('../../../../lib/dao');

describe('Dao', () => {
    let dao = null;
    beforeEach(() => {
        dao = new Dao(':memory:');
        return dao.activate();
    });
    it('should create expected tables', () => {
        const tables = 'SELECT name FROM sqlite_master WHERE type=\'table\';';
        return dao.db.all(tables).then((res) => {
            res.should.eql([{
                name: 'pages'
            }, {
                name: 'checks'
            }]);
        });
    });
    describe('getPageId()', () => {
        it('should insert page into `pages` table', () => {
            const page = `page${Math.random()}`;
            return dao.getPageId(page)
                .then((id) => dao.db.get('SELECT key FROM pages WHERE id = ?', [id]))
                .then((result) => {
                    result.should.eql({
                        key: page
                    });
                });
        });
    });
    describe('addCheck()', () => {
        let page = `page${Math.random()}`,
            sandbox = null,
            pageId = null;
        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            sandbox.useFakeTimers(Date.now());
            return dao.getPageId(page)
                .then((id) => pageId = id);
        });
        it('should insert data into checks', () => {
            const responseTime = Math.ceil(Math.random() * 60 * 1000),
                status = Math.ceil(Math.random() * 598);
            return dao.addCheck(page, status, responseTime)
                .then((result) => dao.db.get('SELECT * FROM checks WHERE oid = ?', [result.lastID]))
                .then((result) => {
                    result.should.eql({
                        page: pageId,
                        status: status,
                        responseTime: responseTime,
                        checkedAt: Date.now()
                    });
                });
        });
        it('should become a Statement', () => {
            return dao.addCheck(page, 4, 40).then((result) => {
                result.should.be.instanceOf(sqlite.Statement);
            });
        });
    });
    describe('getChecks()', () => {
        let page = `page${Math.random()}`,
            sandbox = null;
        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            sandbox.useFakeTimers(Date.now());
            return dao.addCheck(page, 200, 1000);
        });
        it('should return empty array when no results found', () => {
            sandbox.clock.tick(100 * 60 * 1000);
            return dao.getChecks(Date.now() - 1000).should.become([]);
        });
        it('should return expected objects', () => {
            const expected = {
                checkedAt: Date.now(),
                httpStatus: 200,
                page: page,
                responseTime: 1000
            };
            sandbox.clock.tick(60 * 1000);
            return dao.getChecks().should.become([expected]);
        });
        it(`should returm maximum of ${6 * 60 * 60} records`, () => {
            this.timeout(5000); // this test takes a couple of seconds to add all those records
            let count = 0;
            const sixHours = 6 * 60 * 60,
                next = () => {
                    if (count >= sixHours) {
                        return Promise.resolve();
                    }
                    const promises = [];
                    for (let i = 0; i < 500; i++) {
                        count++;
                        promises.push(dao.addCheck(page, 200, count));
                    }
                    return Promise.all(promises).then(next);
                };
            return next()
                .then(() => dao.getChecks(Date.now() - 10))
                .then((results) => {
                    results.should.have.length(sixHours);
                });
        });
    });
});