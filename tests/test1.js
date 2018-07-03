mocha.ui('bdd');
mocha.reporter('html');
var expect = chai.expect;

describe('test suite 1', function() {
  it('test1', function() {
    expect(1).to.be.equal(1);
  });

  it('make sure spaces in id name converted to hyphens', function() {
    expect(makeIdname('hi there')).equals('hi-there');
  });
});

mocha.run();
