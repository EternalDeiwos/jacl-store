'use strict'

/**
 * Dependencies
 * @ignore
 */
const {JSONPointer} = require('json-document')
const path = require('path')
const glob = require('glob')
const cwd = process.cwd()

/**
 * Module Dependencies
 * @ignore
 */

/**
 * Constants
 * @ignore
 */
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

/**
 * isObject
 *
 * @todo
 * Neaten these up.
 */
function isObject (data) {
  return data &&
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data)
}

/**
 * Extender
 *
 * @todo
 * Neaten these up.
 * 
 * @param  {Object} target
 * @param  {Object} source
 * @return {Object}
 */
function extender (target, source) {
  let result = Object.assign({}, target)
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(result, { [key]: source[key] })
        } else {
          result[key] = extender(target[key], source[key])
        }
      } else if (typeof source[key] === 'function') {
        let funcResult = evalFunc(source[key])
        funcResult !== null 
          ? Object.assign(result, { [key]: funcResult }) 
          : console.error(`${key} is an invalid function.`)
      } else {
        Object.assign(result, { [key]: source[key] })
      }
    })
  } else if (typeof source === 'function') {
    return evalFunc(source)
  }
  return result
}

/**
 * Evaluate Function
 *
 * @todo
 * Neaten these up.
 * 
 * @param  {Function} func input function.
 * @return {any} returns the result of the function or null if input is incorrect.
 */
function evalFunc (func) {
  let fnStr = func.toString().replace(STRIP_COMMENTS, '')
  let result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')'))
    .match(ARGUMENT_NAMES)
  if(result === null)
     result = []
  if (result.length > 0) {
    return null
  } else {
    return func()
  }
}

/**
 * Evaluate Generators
 *
 * @description
 * Evaluates generator functions defined in the store behaviour.
 *
 * @todo
 * Neaten these up.
 * 
 * @param  {Any} source
 * @return {Any}
 */
function evaluateGenerators (source) {
  if (isObject(source)) {
    let result = Object.assign({}, source)
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        result[key] = evaluateGenerators(source[key])
      } else if (typeof source[key] === 'function') {
        result[key] = evalFunc(source[key])
      } else {
        result[key] = source[key]
      }
    })
    return result
  } else if (typeof source === 'function') {
    return evalFunc(source)
  } else {
    return source
  }
}
  

/**
 * Store
 * 
 * @class
 * This class is currently a mockup of the API that will be used to present the
 * attributes required for use by the JACL Barrier library.
 */
class Store {

  /**
   * Constructor
   * 
   * @param  {string|array} path - Path(s) of the store directory.
   *
   * @example
   * let store = new Store('./StoreData')
   *
   * @example
   * let store = new Store(['./StoreData1', './StoreData2'])
   */
  constructor (path) {
    this.paths = []
    this.files = []
    this.attributes = {}
    this.build(path)
  }

  /**
   * Build
   *
   * @description 
   * Glob and assign individual directors to the attribute cache.
   * 
   * @param  {string|array} dirs - path(s) to store directories.
   * @return {Store}
   */
  build (dirs) {
    if (dirs) {
      if (Array.isArray(dirs)) {
        dirs.forEach(dir => {
          let files = this.glob(dir)
          files.forEach(filename => {
            let file = require(filename)
            this.assign(file)
          })
        })
        this.paths = this.paths.concat(dirs)
      } else {
        let files = this.glob(dirs)
        files.forEach(filename => {
          let file = require(filename)
          this.assign(file)
        })
        this.paths.push(dirs)
      }
    } else {
      throw new Error('Invalid store directory')
    }
    
    return this
  }

  /**
   * Glob
   *
   * @description
   * Scans over a director for store data files.
   *
   * @param {string} dir - path to a store directory
   * @return {array} an array of files containing store attributes
   */
  glob (dir) {
    let pattern
    if (path.isAbsolute(dir)) {
      pattern = path.join(dir, '*.js')
    } else {
      pattern = path.join(cwd, dir, '*.js')
    }

    let files = glob.sync(path.resolve(pattern))
    this.files = this.files.concat(files)
    return files
  }

  /**
   * Assign
   * 
   * @param  {object} source - merge in the attributes from the source object.
   * @return {Store}
   */
  assign (source) {
    this.attributes = extender(this.attributes, source)
    return this
  }

  /**
   * @description
   * Fetches an attribute given a JSON Pointer request.
   * 
   * @param  {string} expr - A JSON Pointer string denoting the path of the
   * attribute that needs to be fetched.
   * @return {Object} The requested attribute or null if not present.
   */
  getAttribute (expr) {
    let attribute
    try {
      let pointer = JSONPointer.parse(expr)
      attribute = pointer.get(this.attributes)
    } catch (e) {
      return null
    }

    return evaluateGenerators(attribute)
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = Store