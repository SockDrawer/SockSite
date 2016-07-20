'use strict';

const chai = require('chai'),
    sinon = require('sinon');

//promise library plugins
require('sinon-as-promised');
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.use(require('chai-string'));

chai.should();

const Dao = require('../../../../lib/dao');

const getSQLParams = (sql) => {
    let match = null;
    const params = [];
    do {
        match = /(\$\w+)/g.exec(sql);
        if (match) {
            params.push(match[1]);
            sql = sql.substr(match.index + match[1].length);
        }
    } while (match);
    return params;
};

describe('Dao', () => {
    describe('constructor', () => {
        let sandbox = null;
        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            sandbox.stub(Dao, 'DB');
        });
        afterEach(() => sandbox.restore());
        it('should create instance of DB for internal use', () => {
            const name = `database ${Math.random()}`,
                dao = new Dao(name);
            dao.db.should.be.an.instanceOf(Dao.DB);
            Dao.DB.should.be.calledWithNew.once;
            Dao.DB.should.be.calledWith(name).once;
        });
        it('should create local cache data', () => {
            const dao = new Dao('foo');
            dao.cache.should.eql({
                pages: {}
            });
        });
    });
    describe('activate()', () => {
        let sandbox = null,
            dao = null;
        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            dao = new Dao('foo');
            sandbox.stub(dao.db, 'exec').resolves();
        });
        afterEach(() => sandbox.restore());
        it('should resolve to self on completion', () => {
            return dao.activate().should.become(dao);
        });
        it('should resolve to self on recompletion', () => {
            return dao.activate().then(() => dao.activate()).should.become(dao);
        });
        it('should create tables', () => {
            return dao.activate().then(() => {
                const args = dao.db.exec.firstCall.args;
                args[0].should.equal(Dao.sqlCreateTables);
            });
        });
        it('should specify to create `pages` table', () => {
            Dao.sqlCreateTables.should.contain('CREATE TABLE IF NOT EXISTS pages');
        });
        it('should specify to create `checks` table', () => {
            Dao.sqlCreateTables.should.contain('CREATE TABLE IF NOT EXISTS checks');
        });
        it('should not exec sql on reactivate', () => {
            return dao.activate().then(() => {
                    dao.db.exec.reset();
                    return dao.activate();
                })
                .then(() => {
                    dao.db.exec.should.not.be.called;
                });
        });
    });
    describe('getPageId()', () => {
        let sandbox = null,
            dao = null;
        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            dao = new Dao('foo');
            sandbox.stub(dao, 'activate').resolves(dao);
            sandbox.stub(dao.db, 'run').resolves();
            sandbox.stub(dao.db, 'get').resolves();
        });
        it('should resolve from cache when available', () => {
            const page = `page ${Math.random()}`,
                id = Math.random();
            dao.cache.pages[page] = id;
            return dao.getPageId(page).should.become(id);
        });
        it('should not activate when resolving from cache', () => {
            const page = `page ${Math.random()}`,
                id = Math.random();
            dao.cache.pages[page] = id;
            return dao.getPageId(page).then(() => {
                dao.activate.should.not.be.called;
            });
        });
        it('should not sql when resolving from cache', () => {
            const page = `page ${Math.random()}`,
                id = Math.random();
            dao.cache.pages[page] = id;
            return dao.getPageId(page).then(() => {
                dao.db.get.should.not.be.called;
                dao.db.run.should.not.be.called;
            });
        });
        it('should query for saved id when not cached', () => {
            const page = `page ${Math.random()}`,
                id = Math.random();
            dao.db.get.resolves({
                id: id
            });
            return dao.getPageId(page).then(() => {
                dao.db.get.should.be.calledWith(Dao.sqlGetPage, {
                    $key: page
                });
                dao.db.run.called.should.be.false;
            });
        });
        it('should resolve from to saved id when not cached', () => {
            const page = `page ${Math.random()}`,
                id = Math.random();
            dao.db.get.resolves({
                id: id
            });
            return dao.getPageId(page).should.become(id);
        });
        it('should cache saved id when not cached', () => {
            const page = `page ${Math.random()}`,
                id = Math.random();
            dao.db.get.resolves({
                id: id
            });
            return dao.getPageId(page).then(() => {
                dao.cache.pages[page].should.equal(id);
            });
        });
        it('should insert key when not saved', () => {
            const page = `page ${Math.random()}`;
            dao.db.get.resolves(undefined);
            dao.db.run.resolves({
                lastID: 4
            });
            return dao.getPageId(page).then(() => {
                dao.db.run.should.be.calledWith(Dao.sqlInsertPage, {
                    $key: page
                });
            });
        });
        it('should resolve from to inserted id when not saved', () => {
            const page = `page ${Math.random()}`,
                id = Math.random();
            dao.db.get.resolves(undefined);
            dao.db.run.resolves({
                lastID: id
            });
            return dao.getPageId(page).should.become(id);
        });
        it('should cache inserted id when not saved', () => {
            const page = `page ${Math.random()}`,
                id = Math.random();
            dao.db.get.resolves(undefined);
            dao.db.run.resolves({
                lastID: id
            });
            return dao.getPageId(page).then(() => {
                dao.cache.pages[page].should.equal(id);
            });
        });
        it('should reject when `activate()` rejects', () => {
            const expected = 'E_NO_PARTY';
            dao.activate.rejects(expected);
            dao.db.get.resolves(undefined);
            dao.db.run.resolves({
                lastID: 4
            });
            return dao.getPageId('http://example.com').should.be.rejectedWith(expected);
        });
        it('should reject when `db.get()` rejects', () => {
            const expected = 'E_NO_PARTY';
            dao.db.get.rejects(expected);
            dao.db.run.resolves({
                lastID: 4
            });
            return dao.getPageId('http://example.com').should.be.rejectedWith(expected);
        });
        it('should reject when `db.run()` rejects', () => {
            const expected = 'E_NO_PARTY';
            dao.db.run.rejects(expected);
            return dao.getPageId('http://example.com').should.be.rejectedWith(expected);
        });
        it('should pass proper params for `sqlGetPage`', () => {
            dao.db.get.resolves({
                id: 42
            });
            return dao.getPageId('some page').then(() => {
                const args = dao.db.get.firstCall.args,
                    queryParams = getSQLParams(args[0]),
                    argParams = Object.keys(args[1]);
                argParams.should.eql(queryParams);
            });

        });
        it('should pass proper params for `sqlInsertPage`', () => {
            dao.db.get.resolves(undefined);
            dao.db.run.resolves({
                lastID: 42
            });
            return dao.getPageId('some page').then(() => {
                const args = dao.db.run.firstCall.args,
                    queryParams = getSQLParams(args[0]),
                    argParams = Object.keys(args[1]);
                argParams.should.eql(queryParams);
            });
        });
    });
    describe('addCheck()', () => {
        let sandbox = null,
            dao = null,
            pageId = null,
            now = null;
        beforeEach(() => {
            pageId = Math.random();
            sandbox = sinon.sandbox.create();
            dao = new Dao('foo');
            sandbox.stub(dao, 'getPageId').resolves(pageId);
            sandbox.stub(dao.db, 'run').resolves();
            now = Math.ceil(Math.random() * 1.57e10) + 9.46e11;
            sandbox.useFakeTimers(now);
        });
        it('should retrieve pageId via `getPageId()`', () => {
            return dao.addCheck('').then(() => {
                dao.getPageId.should.be.called.once;
            });
        });
        ['http', 'https', 'HTTP', 'HTTPS', 'hTtP', 'HtTpS'].forEach((prefix) => {
            it(`'should strip \`${prefix}\` prefix from page`, () => {
                const expected = `some url ${Math.random()}`,
                    page = `${prefix}://${expected}`;
                return dao.addCheck(page).then(() => {
                    dao.getPageId.should.be.calledWith(expected).once;
                });
            });
        });
        it('should insert check into db', () => {
            return dao.addCheck('some page').then(() => {
                dao.db.run.should.be.calledWith(Dao.sqlInsertCheck).once;
            });
        });
        it('should insert check into db with params', () => {
            const page = `page${Math.random()}`,
                status = Math.random(),
                responseTime = Math.random();
            return dao.addCheck(page, status, responseTime).then(() => {
                const params = dao.db.run.firstCall.args[1];
                params.should.eql({
                    $page: pageId,
                    $status: status,
                    $responseTime: responseTime,
                    $checkedAt: new Date(now)
                });
            });
        });
        it('should pass proper params for `sqlInsertCheck`', () => {
            return dao.addCheck('some page').then(() => {
                const args = dao.db.run.firstCall.args,
                    queryParams = getSQLParams(args[0]),
                    argParams = Object.keys(args[1]);
                argParams.should.eql(queryParams);
            });
        });
    });
    describe('getChecks()', () => {
        let sandbox = null,
            dao = null;
        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            sandbox.useFakeTimers(1e12 + Math.ceil(Math.random() * 1e11));
            dao = new Dao('bar');
            sandbox.stub(dao, 'activate').resolves();
            sandbox.stub(dao.db, 'all').resolves();
        });
        it('should default `from` to ten minutes ago when not provided', () => {
            const expected = Date.now() - 600000;
            return dao.getChecks(undefined, undefined).then(() => {
                const params = dao.db.all.firstCall.args[1];
                params.$after.should.eql(expected);
            });
        });
        it('should default `until` to now when not provided', () => {
            const expected = new Date();
            return dao.getChecks(undefined, undefined).then(() => {
                const params = dao.db.all.firstCall.args[1];
                params.$until.should.eql(expected);
            });
        });
        it('should default `from` to ten minutes ago when value is future', () => {
            const expected = Date.now() - 600000;
            return dao.getChecks(Date.now() + 60, undefined).then(() => {
                const params = dao.db.all.firstCall.args[1];
                params.$after.should.eql(expected);
            });
        });
        it('should default `until` to now when value is before `after`', () => {
            const expected = new Date();
            return dao.getChecks(Date.now() - 60, Date.now() - 80).then(() => {
                const params = dao.db.all.firstCall.args[1];
                params.$until.should.eql(expected);
            });
        });
        it('should pass provided values to sql', () => {
            const min = Math.random() * 100,
                max = min + Math.random() * 100 + 1;
            return dao.getChecks(min, max).then(() => {
                dao.db.all.should.be.calledWith(Dao.sqlGetChecks, {
                    $after: min,
                    $until: max
                }).once;
            });
        });
        it('should pass proper params for `sqlInsertCheck`', () => {
            return dao.getChecks().then(() => {
                const args = dao.db.all.firstCall.args,
                    queryParams = getSQLParams(args[0]),
                    argParams = Object.keys(args[1]);
                argParams.should.eql(queryParams);
            });
        });
        it('should activate dao', () => {
            return dao.getChecks().then(() => {
                dao.activate.should.be.called.once;
            });
        });
        it('should resolve to results of db query', () => {
            const expected = [Math.random()];
            dao.db.all.resolves(expected);
            return dao.getChecks().should.become(expected);
        });
    });
});
