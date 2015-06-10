'use strict';

var gulp = require('gulp');
var browserify = require('browserify');
var transform = require('vinyl-transform');
var uglify = require('gulp-uglify');
// @see https://www.npmjs.com/package/aliasify
var aliasify = require('aliasify');
var path = require('path');

var SRC_ROOT = path.normalize(__dirname + '/../../../static');
var PACKAGE_ROOT = path.normalize(__dirname + '/../../../');

console.log('SRC_ROOT', SRC_ROOT);
console.log('PACKAGE_ROOT', PACKAGE_ROOT);


var aliasifyConfig = {
  configDir: PACKAGE_ROOT,
  aliases: {
    "underscore": "./src/a_subst.js",
    "./static/js/pad.js": "./src/a_subst.js",
    "pad": "./src/a_subst.js",
    "ep_etherpad-lite/static/js/pad": __dirname + "/src/a_subst.js",
  },
  verbose: true
}

gulp.task('browserify', function() {

  // use `vinyl-transform` to wrap around the regular ReadableStream returned by b.bundle();
  // so that we can use it down a vinyl pipeline as a vinyl file object.
  // `vinyl-transform` takes care of creating both streaming and buffered vinyl file objects.
  var browserified = transform(function(filename) {
    var b = browserify(filename);
    b.transform(aliasify, aliasifyConfig);
    return b.bundle();
  });

  // return gulp.src(['./src/main.js'])
  return gulp.src([SRC_ROOT + '/js/boot.js'])
    .pipe(browserified)
    // .pipe(uglify())
    .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['browserify']);