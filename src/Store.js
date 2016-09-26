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
   * @param  {string} path - Path of the store directory relative to the cwd.
   *
   * @example
   * let store = new Store('./StoreData')
   */
  constructor (path) {
    this.path = path
    this.attributes = {}
    this.glob()
  }

  /**
   * Glob
   *
   * @description
   * Populates attributes from a flat-file given the store directory
   * iteratively.
   */
  glob () {
    let pattern = path.join(cwd, this.path, '*.js')
    let files = glob.sync(path.resolve(pattern))
    this.files = files

    files.forEach(filename => {
      let file = require(filename)
      this.assign(file)
    })
  }

  assign (source) {
    this.attributes = extender(this.attributes, source)
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