'use strict'

/**
 * Test dependencies
 */
const cwd = process.cwd()
const path = require('path')
const chai = require('chai')
const _ = require('lodash')

/**
 * Assertions
 */
chai.should()
let expect = chai.expect

/**
 * Constants
 */
const STORE_DATA_DIR = 'test/StoreData'

/**
 * Code under test
 */
const Store = require('../src/Store')

/**
 *
 */
describe('Store', () => {
  let asserted_files = [
    'data1.js',
    'data2.js',
    'data3.js',
    'data4.js'
  ]

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
      id: 'some-id'
    },
    environment: {
      time: {
        hours: 11,
        minutes: 12,
        seconds: 14
      }
    }
  }

  describe('data directory', () => {

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

    let store
    beforeEach(() => {
      store = new Store(STORE_DATA_DIR)
    })

    it('should fetch attributes given a JSON Pointer string', () => {
      expect(_.isEqual(store.getAttribute('/subject'), asserted_attributes.subject)).to.be.true
      expect(_.isEqual(store.getAttribute('/environment'), asserted_attributes.environment)).to.be.true
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
  })

})