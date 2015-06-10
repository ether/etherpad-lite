'use strict';

var gulp = require('gulp');
var rename = require('gulp-rename');
var browserify = require('browserify');
var transform = require('vinyl-transform');
var uglify = require('gulp-uglify');
// @see https://www.npmjs.com/package/aliasify
// @see https://github.com/benbria/aliasify/issues/25
var aliasify = require('aliasify');
var path = require('path');

var PACKAGE_ROOT = path.dirname(require.resolve('ep_etherpad-lite/ep.json'));
var SRC_ROOT = path.normalize(PACKAGE_ROOT + '/static');
// var REL_PATH = path.relative(SRC_ROOT + '/build', __dirname);

console.log('SRC_ROOT', SRC_ROOT);
// console.log('REL_PATH', REL_PATH);
console.log('PACKAGE_ROOT', PACKAGE_ROOT + '\n\n\n');


var aliasifyConfig = {
  //this is important for relative paths
  configDir: SRC_ROOT,
  aliases: {
    // demo, works by module name
    // "underscore": REL_PATH + "/src/a_subst.js",
    "ep_etherpad-lite/static/js/ace": "ep_etherpad-lite/static/js/__ace_build.js",
  //does not work
  // "./ace": REL_PATH + "/src/a_subst.js",
  },
  verbose: true,
  global: true
}

gulp.task('browserify', function() {

  // use `vinyl-transform` to wrap around the regular ReadableStream returned by b.bundle();
  // so that we can use it down a vinyl pipeline as a vinyl file object.
  // `vinyl-transform` takes care of creating both streaming and buffered vinyl file objects.
  var browserified = transform(function(filename) {
    console.log(filename);
    var b = browserify(filename, {
      //debug: true
    });
    b.transform(aliasify, aliasifyConfig);
    return b.bundle();
  });

  // return gulp.src(['./src/main.js'])
  return gulp.src([SRC_ROOT + '/js/boot.js'])
  // return gulp.src([SRC_ROOT + '/js/ace2_inner.js'])
    .pipe(browserified)
    // .pipe(uglify())
    .pipe(rename('__build.js'))
    .pipe(gulp.dest(SRC_ROOT + '/js'));
});

gulp.task('default', ['browserify']);