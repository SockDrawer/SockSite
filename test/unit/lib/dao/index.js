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
            sandbox.stub(dao.db, 'run').resolves();
        });
        afterEach(() => sandbox.restore());
        it('should resolve to self on completion', () => {
            return dao.activate().should.become(dao);
        });
        it('should resolve to self on recompletion', () => {
            return dao.activate().then(() => dao.activate()).should.become(dao);
        });
        it('should create `pages` table', () => {
            return dao.activate().then(() => {
                const args = dao.db.run.firstCall.args;
                args[0].should.startWith('CREATE TABLE IF NOT EXISTS pages');
            });
        });
        it('should create `checks` table', () => {
            return dao.activate().then(() => {
                const args = dao.db.run.firstCall.args;
                args[0].should.contain('CREATE TABLE IF NOT EXISTS checks');
            });
        });
    });
});
