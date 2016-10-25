'use strict'

/**
 * Test dependencies
 */
const cwd = process.cwd()
const path = require('path')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const _ = require('lodash')

/**
 * Assertions
 */
chai.should()
let expect = chai.expect
chai.use(sinonChai)

/**
 * Constants
 */
const STORE_DATA_DIR = 'test/StoreData'
const CONFIG_DATA_DIR = 'test/ConfigStoreData'

/**
 * Code under test
 */
const Store = require('../src/Store')

/**
 *
 */
describe('Store', () => {

  describe('data directory', () => {
    let asserted_files = [
      'data1.js',
      'data2.js',
      'data3.js',
      'data4.js',
      'data5.js'
    ]

    let store
    beforeEach(() => {
      store = new Store(STORE_DATA_DIR)
    })

    it('should glob all files in the data store directory', () => {
      let files = store.files.map(val => { return path.basename(val) })
      expect(_.isEqual(files.sort(), asserted_files.sort())).to.be.true
    })

    it('should load and assign attributes and generators to the cache', () => {
      expect(typeof store.attributes.object.id).to.equal('function')
      expect(typeof store.attributes.object.fail).to.equal('function')
      expect(typeof store.attributes.subject.staff).to.equal('boolean')
      expect(typeof store.attributes.subject.department).to.equal('string')
      expect(typeof store.attributes.environment.time.hours).to.equal('number')
    })

  })
  describe('getAttribute', () => {
    let asserted_attributes_preeval = {
      subject: {
        staff: true,
        department: 'Computer Science'
      },
      environment: {
        time: {
          hours: 11,
          minutes: 12,
          seconds: 14
        }
      }
    }

    let asserted_attributes = {
      subject: {
        staff: true,
        department: 'Computer Science'
      },
      object: {
        id: 'some-id',
        fail: null
      },
      environment: {
        time: {
          hours: 11,
          minutes: 12,
          seconds: 14
        }
      }
    }

    let store
    beforeEach(() => {
      store = new Store(STORE_DATA_DIR)
    })

    it('should fetch attributes given a JSON Pointer string', () => {
      expect(_.isEqual(store.getAttribute('/subject'), asserted_attributes.subject)).to.be.true
      expect(_.isEqual(store.getAttribute('/environment'), asserted_attributes.environment)).to.be.true
    })

    it('should fetch attributes given an array of JSON Pointer strings', () => {
      expect(_.isEqual(store.getAttribute(['/subject', '/environment', '/object']), asserted_attributes)).to.be.true
      expect(_.isEqual(store.getAttribute(['/subject/staff', '/subject/department']), { subject: asserted_attributes.subject })).to.be.true
    })

    it('should evaluate attributes defined in terms of a function', () => {
      expect(_.isEqual(store.getAttribute('/object/id'), asserted_attributes.object.id)).to.be.true
    })

    it('should ignore parameters for attributes defined in terms of a function', () => {
      expect(store.getAttribute('/object/fail')).to.be.null
    })

    it('should return null for invalid JSON Pointer strings', () => {
      expect(store.getAttribute('/')).to.be.null
    })

    it('should return null if requested attribute is not present', () => {
      expect(store.getAttribute('/subject/name')).to.be.null
    })

    describe('alias (get)', () => {
      it('should fetch attributes given a JSON Pointer string', () => {
        expect(_.isEqual(store.get('/subject'), asserted_attributes.subject)).to.be.true
        expect(_.isEqual(store.get('/environment'), asserted_attributes.environment)).to.be.true
      })

      it('should fetch attributes given an array of JSON Pointer strings', () => {
        expect(_.isEqual(store.get(['/subject', '/environment', '/object']), asserted_attributes)).to.be.true
        expect(_.isEqual(store.get(['/subject/staff', '/subject/department']), { subject: asserted_attributes.subject })).to.be.true
      })

      it('should evaluate attributes defined in terms of a function', () => {
        expect(_.isEqual(store.get('/object/id'), asserted_attributes.object.id)).to.be.true
      })

      it('should ignore parameters for attributes defined in terms of a function', () => {
        expect(store.get('/object/fail')).to.be.null
      })

      it('should return null for invalid JSON Pointer strings', () => {
        expect(store.get('/')).to.be.null
      })

      it('should return null if requested attribute is not present', () => {
        expect(store.get('/subject/name')).to.be.null
      })
    })
  })

  describe('config', () => {
    const DEFAULT_CONFIG = require('./ConfigStoreData/config1').config
    const SECOND_CONFIG = require('./ConfigStoreData/config2').config2.specialConfig

    let store
    beforeEach(() => {
      store = new Store(CONFIG_DATA_DIR)
    })
    
    describe('without specifying a JSON Pointer to the config', () => {
      it('should fetch the default config', () => {
        store.config().should.deep.equal(DEFAULT_CONFIG)
      })
    })

    describe('specifying a JSON Pointer to the config', () => {
      it('should fetch the specified config', () => {
        store.config('/config2/specialConfig').should.deep.equal(SECOND_CONFIG)
      })
    })

    describe('specifying a JSON Pointer to an invalid config', () => {
      it ('should return null', () => {
        expect(store.config('/config3/invalidPointer')).to.be.null
      })
    })

  })

  describe('rule', () => {
    const MYRULE = require('./StoreData/data5').rules.myrule

    let store
    beforeEach(() => {
      store = new Store(STORE_DATA_DIR)
      sinon.spy(store, 'get')
    })

    afterEach(() => {
      store.get.restore()
    })

    it('should throw if no rule name is supplied', () => {
      expect(store.rule).to.throw('Rule name required')
      store.get.should.not.have.been.called
    })

    it('should return null if the rule does not exist', () => {
      expect(store.rule('nonexistentrule')).to.be.null
      store.get.should.have.been.called
    })

    it('should return the rule object descriptor if it exists', () => {
      store.rule('myrule').should.equal(MYRULE)
      store.get.should.have.been.called
    })
  })

})