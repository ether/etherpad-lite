function run(cb) {

    var builder = require('./acebuilder');
    builder();
//var gulp = global.gulp  = require('gulp');
    var gulp = require('gulp');
    require('./gulpfile.js');
//interaction
    gulp.start('default', function(){
        console.log('MINIFY-NG DONE');
        cb && cb();
    });
}

module.exports = run;

//if directly called
if (require.main === module) {
    run();
} 