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
                queryParams.should.eql(argParams);
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
                queryParams.should.eql(argParams);
            });
        });
    });
});
