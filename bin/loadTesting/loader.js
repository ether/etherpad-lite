var page = new WebPage(),
    t, address;

if (phantom.args.length === 0) {
    console.log('Usage: loader.js <some URL>');
    phantom.exit();
} else {
    t = Date.now();
    address = phantom.args[0];

    var page = new WebPage();
    page.onResourceRequested = function (request) {
        console.log('Request ' + JSON.stringify(request, undefined, 4));
    };
    page.onResourceReceived = function (response) {
        console.log('Receive ' + JSON.stringify(response, undefined, 4));
    };
    page.open(address);

}
