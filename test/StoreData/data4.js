
module.exports = {
  object: {
    id: () => {
      return 'some-id'
    },
    fail: (param) => {
      return param + 1
    }
  }
}