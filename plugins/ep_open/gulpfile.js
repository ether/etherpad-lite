'use strict';

const fs = require('fs');
const gulp = require('gulp');
const gutil = require('gulp-util');
const plugins = require('gulp-load-plugins')();
const watchify = require('watchify');
const browserify = require('browserify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');

const env = gutil.env.production ? 'production' : 'development';
const paths = {
	styles: 'static/sass/style.scss',
	libs: {
		styles: [
			'./node_modules/react-select/dist/react-select.min.css',
		]
	},
	scripts: [
		'static/js/**/*.js',
		'!static/js/bundle.js'
	]
};
const b = watchify(browserify(Object.assign({}, watchify.args, {
	entries: ['static/js/app.js'],
	debug: env === 'development',
	ignoreMissing: true
})));

b.transform(babelify);

if (env === 'production') {
	b.transform({
		global: true,
		ignore: [ '**/node_modules/v-sdk/*' ],
		mangle: {
			toplevel: true,
			screw_ie8: true
		},
		compress: {
			screw_ie8: true,
			sequences: true,
			properties: true,
			unsafe: true,
			dead_code: true,
			drop_debugger: true,
			comparisons: true,
			conditionals: true,
			evaluate: true,
			booleans: true,
			loops: true,
			unused: true,
			hoist_funs: true,
			if_return: true,
			join_vars: true,
			cascade: true,
			negate_iife: true,
			drop_console: true
		}
	}, 'uglifyify');
}

const bundle = () => {
	return b.bundle()
		.on('error', gutil.log.bind(gutil, 'Browserify Error'))
		.pipe(source('bundle.js'))
		.pipe(gulp.dest('static/js'));
};

gulp.task('scripts', ['config'], bundle);

gulp.task('check', function() {
    gulp
	    .src(paths.scripts)
        .pipe(plugins.eslint())
        .pipe(plugins.jscs())
		.pipe(plugins.eslint.format());
});

gulp.task('config', function() {
	var config = require('./config/env.json')[env];

	plugins
		.file('index.js', 'export default ' + JSON.stringify(config) + ';')
		.pipe(gulp.dest('static/js/config'));
});

gulp.task('styles', () => {
	gulp
		.src(paths.styles)
		.pipe(plugins.sass().on('error', plugins.sass.logError))
		.pipe(plugins.cssImageDimensions(__dirname + '/static/images'))
		.pipe(plugins.base64({
			extensions: ['png'],
			maxImageSize: 16 * 1024
		}))
		.pipe(plugins.autoprefixer({
			browsers: ['last 2 versions']
		}))
		.pipe(plugins.addSrc.prepend(paths.libs.styles))
		.pipe(plugins.concat('style.css'))
		.pipe(env === 'production' ? plugins.minifyCss({ keepSpecialComments: 0 }) : gutil.noop())
		.pipe(gulp.dest('static/css'));
});

gulp.task('watch', () => {
	gulp.watch('static/sass/**/*', ['styles']);
	gulp.watch(['gulpfile.js'], ['build']);
	b.on('update', bundle);
	b.on('log', gutil.log);
});

gulp.task('_build', ['styles', 'check', 'config', 'scripts']);
gulp.task('build', ['_build'], () => b.close());
gulp.task('deploy', ['_build', 'publish']);
gulp.task('default', ['_build', 'watch']);
