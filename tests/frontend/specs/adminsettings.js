describe('All the alphabet works n stuff', function () {

  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newAdmin("settings", cb);
    this.timeout(60000);
  });

  it('Show Menu Items', function (done) {
    let $menu = helper.admin$('.menu');
    let menuChildren = $menu.find("li");
    helper.waitFor(() => menuChildren.length >= 2, 2000).done(done);
  });

});
