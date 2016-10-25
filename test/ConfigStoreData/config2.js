
module.exports = {
  config2: {
    specialConfig: {
      access: 'rule',
      provider: {
        issuer: 'https://some.other.provider.com',
        redirect_uris: ['https://mydomain.com/callback'],
        client_id: 'abc',
        client_secret: '123'
      }
    }
  }
}