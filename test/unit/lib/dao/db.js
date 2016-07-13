'use strict';

const chai = require('chai'),
    sinon = require('sinon');

//promise library plugins
require('sinon-as-promised');
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

chai.should();

const sqlite = require('sqlite3');
const DB = require('../../../../lib/dao/db');

describe('DB', () => {
    let db = null;
    beforeEach(() => {
        db = new DB(':memory:');
        return db.activate();
    });
    it('should export a function', () => {
        DB.should.be.a('function');
    });
    it('should be a constructor', () => {
        const obj = new DB();
        obj.should.be.an.instanceOf(DB);
    });
    describe('constructor', () => {
        it('should store connection string', () => {
            const name = `connection${Math.random()}`;
            const obj = new DB(name);
            obj.dbName.should.equal(name);
        });
        it('should store null db object', () => {
            const obj = new DB('foo');
            chai.expect(obj.db).to.be.null;
        });
    });
    describe('activate', () => {
        let sandbox = null,
            db = null;
        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            sandbox.stub(sqlite, 'Database').yields();
            db = new DB(':memory:');
        });
        afterEach(() => sandbox.restore());
        it('should create instance of sqlite.Database', () => {
            return db.activate().then(() => {
                sqlite.Database.should.be.calledWithNew.once;
            });
        });
        it('should store instance of sqlite.Database in object', () => {
            const expected = {
                a: `oogy boogy boo ${Math.random()}`
            };
            sqlite.Database.returns(expected);
            return db.activate().then(() => {
                db.db.should.equal(expected);
            });
        });
        it('should resolve on success', () => {
            return db.activate().should.be.resolved;
        });
        it('should reject on failure', () => {
            const error = new Error('hi there!');
            sqlite.Database.yields(error);
            return db.activate().should.be.rejectedWith(error);
        });
        it('should noop activate() on success', () => {
            const original = db.activate;
            return db.activate().then(() => {
                db.activate.should.not.equal(original);
                sqlite.Database.reset();
                return db.activate();
            }).then(() => {
                sqlite.Database.should.not.be.called;
            });
        });
        it('should not noop activate() on failure', () => {
            const original = db.activate,
                error = new Error('foo!');
            sqlite.Database.yields(error);
            return db.activate().then(() => {
                chai.assert(false, 'Function should not have resolved');
            }, (err) => {
                db.activate.should.equal(original);
                err.should.equal(error);
            });
        });
    });
    describe('_exec()', () => {
        let sandbox = null,
            db = null;
        beforeEach(() => {
            db = new DB(':memory:');
            sandbox = sinon.sandbox.create();
            return db.activate().then(() => {
                sandbox.stub(db.db, 'run').yields();
                sandbox.stub(db.db, 'all').yields();
                sandbox.stub(db.db, 'get').yields();
                sandbox.stub(db.db, 'exec').yields();
                sandbox.stub(db, 'activate').resolves();
            });
        });
        afterEach(() => {
            sandbox.restore();
        });
        it('should activate the db instance', () => {
            return db._exec('run', 'foo', [4]).then(() => {
                db.activate.should.be.calledOnce;
            });
        });
        ['run', 'all', 'get'].forEach((func) => {
            it(`should proxy ${func}`, () => {
                const query = `query${Math.random()}query`,
                    params = [`params${Math.random()}params`];
                return db._exec(func, query, params).then(() => {
                    db.db[func].should.be.calledWith(query, params);
                });
            });
            it('should resolve to results on success', () => {
                const context = {
                        key: Math.random()
                    },
                    expected = Math.random();
                db.db[func].yieldsOn(context, null, expected);
                return db._exec(func).should.become(expected);
            });
            it('should reject with error on failure', () => {
                const context = {
                        key: Math.random()
                    },
                    error = new Error(`oh no! it's a raygun! ${Math.random()}`);
                db.db[func].yieldsOn(context, error);
                return db._exec(func).should.be.rejectedWith(error);
            });
        });
        it(`should proxy exec`, () => {
            const query = `query${Math.random()}query`;
            return db._exec('exec', query).then(() => {
                db.db.exec.should.be.calledWith(query);
            });
        });
        it('should resolve to results on success for proxied exec', () => {
            const context = {
                    key: Math.random()
                },
                expected = Math.random();
            db.db.exec.yieldsOn(context, null, expected);
            return db._exec('exec').should.become(expected);
        });
        it('should reject with error on failure for proxied exec', () => {
            const context = {
                    key: Math.random()
                },
                error = new Error(`oh no! it's a raygun! ${Math.random()}`);
            db.db.exec.yieldsOn(context, error);
            return db._exec('exec').should.be.rejectedWith(error);
        });
        it('db.run: should resolve to \`this\` when result is undefined', () => {
            const context = {
                key: Math.random()
            };
            db.db.run.yieldsOn(context);
            return db._exec('run').then((res) => {
                res.should.equal(context);
            });
        });
        ['all', 'get'].forEach((func) => {
            it(`db.${func}: should resolve to \`undefined\` when result is undefined`, () => {
                const context = {
                    key: Math.random()
                };
                db.db[func].yieldsOn(context);
                return db._exec(func).then((res) => {
                    chai.expect(res).to.be.undefined;
                });
            });
        });
    });
    ['run', 'all', 'get'].forEach((func) => {
        describe(func, () => {
            let sandbox = null,
                db = null;
            beforeEach(() => {
                db = new DB(':memory:');
                sandbox = sinon.sandbox.create();
                sandbox.stub(db, '_exec').resolves();
            });
            afterEach(() => sandbox.restore());
            it('should proxy reqest to `_exec`', () => {
                const query = `query${Math.random()}query`,
                    args = [`args${Math.random()}args`];
                return db[func](query, args).then(() => {
                    db._exec.should.be.calledWith(func, query, args).once;
                });
            });
            it('should resolve to results of `_exec()` on success', () => {
                const expected = Math.random();
                db._exec.resolves(expected);
                return db[func]().should.become(expected);
            });
            it('should reject to readon from `_exec()` on failure', () => {
                const reason = new Error(`oopsies? ${Math.random()}`);
                db._exec.rejects(reason);
                return db[func]().should.be.rejectedWith(reason);
            });
        });
    });
    describe('exec', () => {
            let sandbox = null,
                db = null;
            beforeEach(() => {
                db = new DB(':memory:');
                sandbox = sinon.sandbox.create();
                sandbox.stub(db, '_exec').resolves();
            });
            afterEach(() => sandbox.restore());
        it('should proxy reqest to `_exec`', () => {
            const query = `query${Math.random()}query`;
            return db.exec(query).then(() => {
                db._exec.should.be.calledWith('exec', query).once;
            });
        });
        it('should resolve to results of `_exec()` on success', () => {
            const expected = Math.random();
            db._exec.resolves(expected);
            return db.exec().should.become(expected);
        });
        it('should reject to readon from `_exec()` on failure', () => {
            const reason = new Error(`oopsies? ${Math.random()}`);
            db._exec.rejects(reason);
            return db.exec().should.be.rejectedWith(reason);
        });
    });
});