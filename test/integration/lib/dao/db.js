'use strict';

const chai = require('chai');

//promise library plugins
require('sinon-as-promised');
chai.use(require('chai-as-promised'));

chai.should();

const sqlite = require('sqlite3');
const DB = require('../../../../lib/dao/db');

describe('DB', () => {
    let db = null;
    beforeEach(() => {
        db = new DB(':memory:');
        return db.activate();
    });
    it('should resolve to statement with run', () => {
        const sql = 'CREATE TABLE test (' +
            '    id INTEGER PRIMARY KEY' +
            ');';
        return db.run(sql).then((res) => {
            res.should.be.instanceOf(sqlite.Statement);
            res.changes.should.equal(0);
            res.sql.should.equal(sql);
        });
    });
    it('should create table with run', (done) => {
        const sql = 'CREATE TABLE test (' +
            '    id INTEGER PRIMARY KEY' +
            ');';
        db.run(sql).then((res) => {
            const testTable = 'SELECT 1 AS "exists" FROM sqlite_master WHERE type=\'table\' AND name=\'test\';';
            db.db.get(testTable, (err, res) => {
                chai.expect(err).to.be.null;
                res.should.eql({
                    exists: 1
                });
                done();
            });
        });
    });
    it('should create multitables with exec', (done) => {
        const sql = 'CREATE TABLE test (' +
            '    id INTEGER PRIMARY KEY' +
            '); CREATE TABLE test2 (' +
            '    id2 INTEGER PRIMARY KEY' +
            ');';
        db.exec(sql).then(() => {
            const tables = 'SELECT name FROM sqlite_master WHERE type=\'table\';';
            db.db.all(tables, (err, res) => {
                chai.expect(err).to.be.null;
                res.should.eql([{
                    name: 'test'
                }, {
                    name: 'test2'
                }]);
                done();
            });
        }).catch((err) => {
            console.log(err);
            chai.assert.fail(err);
            done();
        });
    });
    it('should create table with run', (done) => {
        const sql = 'CREATE TABLE test (' +
            '    id INTEGER PRIMARY KEY' +
            ');';
        db.run(sql).then((res) => {
            const testTable = 'SELECT 1 AS "exists" FROM sqlite_master WHERE type=\'table\' AND name=\'test\';';
            db.db.get(testTable, (err, res) => {
                chai.expect(err).to.be.null;
                res.should.eql({
                    exists: 1
                });
                done();
            });
        });
    });
    it('should populate lastId on insert', () => {
        const sql = 'CREATE TABLE test (' +
            '    id INTEGER PRIMARY KEY' +
            ');',
            id = Math.ceil(Math.random() * 10000),
            insert = `INSERT INTO test(id) VALUES(${id})`;
        return db.run(sql)
            .then(() => db.run(insert))
            .then((res) => {
                res.lastID.should.equal(id);
            });
    });
    it('should create table and fill with run', (done) => {
        const sql = 'CREATE TABLE test AS ' +
            'SELECT 0 AS id ' +
            'UNION SELECT 1 AS id ' +
            'UNION SELECT 2 AS id ' +
            'UNION SELECT 3 AS id ' +
            'UNION SELECT 4 AS id ' +
            'UNION SELECT 5 AS id ' +
            'UNION SELECT 6 AS id ' +
            'UNION SELECT 7 AS id ' +
            'UNION SELECT 8 AS id ' +
            'UNION SELECT 9 AS id ';
        db.run(sql).then((res) => {
            res.should.be.instanceOf(sqlite.Statement);
            res.changes.should.equal(0);
            res.sql.should.equal(sql);
            db.db.get('SELECT COUNT(*) AS rows FROM test', (err, res) => {
                chai.expect(err).to.be.null;
                res.rows.should.equal(10);
                done();
            });
        });
    });
    describe('selecting', () => {
        beforeEach(() => {
            const sql = 'CREATE TABLE test AS ' +
                'SELECT 0 AS id ' +
                'UNION SELECT 1 AS id ' +
                'UNION SELECT 2 AS id ' +
                'UNION SELECT 3 AS id ' +
                'UNION SELECT 4 AS id ' +
                'UNION SELECT 5 AS id ' +
                'UNION SELECT 6 AS id ' +
                'UNION SELECT 7 AS id ' +
                'UNION SELECT 8 AS id ' +
                'UNION SELECT 9 AS id ';
            return db.run(sql);
        });
        it('should select a single record via `get()`', () => {
            return db.get('SELECT id FROM test').should.become({
                id: 0
            });
        });
        it('should select all records via `all()`', () => {
            return db.all('SELECT id FROM test').should.become([{
                id: 0
            }, {
                id: 1
            }, {
                id: 2
            }, {
                id: 3
            }, {
                id: 4
            }, {
                id: 5
            }, {
                id: 6
            }, {
                id: 7
            }, {
                id: 8
            }, {
                id: 9
            }]);
        });
        it('should have `get()` resolve to nothing when no rows match', () => {
            const id = Math.ceil(Math.random() * 10000) + 1000,
                fetch = `SELECT id FROM test WHERE id = ${id}`;
            return db.get(fetch).should.become(undefined);
        });
        it('should have `all()` resolve to nothing when no rows match', () => {
            const id = Math.ceil(Math.random() * 10000) + 1000,
                fetch = `SELECT id FROM test WHERE id = ${id}`;
            return db.all(fetch).should.become([]);
        });
    });
});