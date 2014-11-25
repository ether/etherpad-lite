var assert = require("assert")
 supertest = require('supertest'),
       api = supertest('http://localhost:9001');

describe('Array', function(){
  describe('#indexOf()', function(){
    it('should return -1 when the value is not present', function(){
      assert.equal(-1, [1,2,3].indexOf(5));
      assert.equal(-1, [1,2,3].indexOf(0));
    })
  })
})

describe('Connectivity', function(){
  it('errors if can not connect', function(done) {
    api.get('/api/')
    .expect(200, done)
  });
})



/*
describe('Authentication', function() {
 
  it('errors if wrong basic auth', function(done) {
    api.get('/blog')
    .set('x-api-key', '123myapikey')
    .auth('incorrect', 'credentials')
    .expect(401, done)
  });
 
  it('errors if bad x-api-key header', function(done) {
    api.get('/blog')
    .auth('correct', 'credentials')
    .expect(401)
    .expect({error:"Bad or missing app identification header"}, done);
  });
 
}); 
*/
