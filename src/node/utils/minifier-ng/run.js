function run() {

    var builder = require('./acebuilder');
    builder();
//var gulp = global.gulp  = require('gulp');
    var gulp = require('gulp');
    require('./gulpfile.js');
//interaction
    gulp.start('default');
}

module.exports = run;

//if directly called
if (require.main === module) {
    run();
} 