'use strict';

var gulp = require('gulp');
var browserify = require('browserify');
var transform = require('vinyl-transform');
var uglify = require('gulp-uglify');
var aliasify = require('aliasify');


var aliasifyConfig = {
    aliases: {
        "underscore": "./src/a_subst.js"
    },
    verbose: true
}

gulp.task('browserify', function () {

  // use `vinyl-transform` to wrap around the regular ReadableStream returned by b.bundle();
  // so that we can use it down a vinyl pipeline as a vinyl file object.
  // `vinyl-transform` takes care of creating both streaming and buffered vinyl file objects.
  var browserified = transform(function(filename) {
    var b = browserify(filename);
    b.transform(aliasify, aliasifyConfig);
    return b.bundle();
  });

  return gulp.src(['./src/*.js'])
    .pipe(browserified)
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['browserify']);
