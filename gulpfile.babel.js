'use strict';

import gulp from 'gulp';
import plugins from 'gulp-load-plugins';
import panini from 'panini';
import yargs from 'yargs';
import fs from 'fs';
import yaml from 'js-yaml';
import browserSync from 'browser-sync';
import runseq from 'run-sequence';
import del from 'del';

const $ = plugins();
const isProduction = !!(yargs.argv.production);

const {    
    PORT,
    COMPATIBILITY,
    PATHS
} = loadConfig();

function loadConfig() {
    let ymlFile = fs.readFileSync('config.yml', 'utf8');
    return yaml.load(ymlFile);
}

gulp.task('browser-sync', ['build'], function() {

    browserSync.init({
        server: {
            baseDir: "./dist"
        },
        port: PORT,
        open: false
    });

});

gulp.task('build', ['clean'], function(done) {
    runseq('copy', ['html', 'scss', 'js'], done);
});

gulp.task('copy', function() {
  return gulp.src(PATHS.assets).pipe(gulp.dest('dist/assets'));
});

gulp.task('html', function() {  
  panini.refresh();
  gulp.src('src/html/pages/**/*.html')
    .pipe(panini({
      root: 'src/html/pages/',
      layouts: 'src/html/layouts/',
      partials: 'src/html/partials/',
      helpers: 'src/html/helpers/',
      data: 'src/html/data/'
    }))
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream());
});

gulp.task('lint', function() {
   return gulp.src(PATHS.js)
        .pipe($.eslint())
        .pipe($.eslint.format())
        .pipe($.eslint.failAfterError());
});

gulp.task('js', ['lint'], function() {
  var uglify = $.uglify().on('error', $.notify.onError({
      message: "<%= error.message %>",
      title: "Uglify JS Error"
    }));

  return gulp.src(PATHS.js)
    .pipe($.sourcemaps.init())
    .pipe($.babel())
    .pipe($.concat('app.js', {
      newLine:'\n;'
    }))
    .pipe($.if(isProduction, uglify))
    .pipe($.if(!isProduction, $.sourcemaps.write()))
    .pipe(gulp.dest('dist/assets/js'))
    .pipe(browserSync.stream());
});
gulp.task('clean:js', function() {
  return del([
      'dist/assets/js/app.js',
    ]);
});

gulp.task('scss', function() {
  return gulp.src('src/assets/scss/app.scss')
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      includePaths: PATHS.scss
    }))
    .on('error', $.notify.onError({
        message: "<%= error.message %>",
        title: "Sass Error"
    }))
    .pipe($.autoprefixer({
      browsers: COMPATIBILITY
    }))
    // Minify CSS if run with --production flag
    .pipe($.if(isProduction, $.cleanCss({
            compatibility: 'ie9'
    })))
    .pipe($.if(!isProduction, $.sourcemaps.write('.')))
    .pipe(gulp.dest('dist/assets/css'))
    .pipe(browserSync.stream());    
});
gulp.task('clean:css', function() {
  return del([
      'dist/assets/css/app.css',
      'dist/assets/css/app.css.map',
    ]);
});

gulp.task('clean', function(done) {
  runseq(['clean:js', 'clean:css'], done);
});


gulp.task('default', ['build', 'browser-sync'], function() {
  // Log file changes to console
  function logFileChange(event) {
    var fileName = require('path').relative(__dirname, event.path);
    console.log('[' + 'WATCH'.green + '] ' + fileName.magenta + ' was ' + event.type + ', running tasks...');
  }

  // SCSS Watch
  gulp.watch(['src/assets/scss/**/*.scss'], ['clean:css', 'scss'])
    .on('change', function(event) {
      logFileChange(event);
    });

  // JS Watch
  gulp.watch(['assets/js/**/*.js'], ['clean:js', 'js'])
    .on('change', function(event) {
      logFileChange(event);
    });

  // HTML Watch
    gulp.watch(PATHS.html, ['html']).on('change', function(event) {
        logFileChange(event);
        browserSync.reload;
    });
  
    gulp.watch(PATHS.assets, ['copy']);  
});