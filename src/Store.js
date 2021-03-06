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
   *
   * @example
   * let store = new Store().build('./StoreData1').build('./StoreData2')
   * 
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
   * Get Attribute
   * 
   * @description
   * Fetches an attribute given a JSON Pointer request.
   * 
   * @param  {string|array} expr - A JSON Pointer string denoting the path of
   * the attribute that needs to be fetched.
   * @return {Object} The requested attribute or null if not present.
   */
  getAttribute (exprs) {
    if (exprs) {
      let attribute = {}

      if (Array.isArray(exprs)) {
        exprs.forEach(expr => {
          try {
            let pointer = JSONPointer.parse(expr)
            let value = pointer.get(this.attributes)
            pointer.replace(attribute, value)
          } catch (e) {
            return null
          }
        })

      } else {
        try {
          let pointer = JSONPointer.parse(exprs)
          attribute = pointer.get(this.attributes)
        } catch (e) {
          return null
        }
      }
      // console.log(attribute)

      return evaluateGenerators(attribute)
    }
    return null
  }

  /**
   * Get
   *
   * @description 
   * Alias for getAttribute
   */
  get (exprs) {
    return this.getAttribute(exprs)
  }

  /**
   * Config
   * 
   * @description
   * Get barrier configuration from store
   * 
   * @param  {string} [exprs] - JSON Pointer string for config
   * @return {object} Config descriptor object
   */
  config (exprs='/config') {
    return this.get(exprs)
  }

  /**
   * Rule
   * 
   * @description
   * Get rule by name from the store
   *
   * @throws {Error} If [name is undefined]
   * @param  {string} name - Name of rule
   * @return {object|null} Rule descriptor object or null of rule doesn't exist.
   */
  rule (name) {
    if (name && typeof name === 'string') {
      let rule = this.get(`/rules/${name}`)
      if (rule) {
        return rule
      }
      return null
    } else {
      throw new Error('Rule name required')
    }
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = Store