'use strict';

import gulp from 'gulp';
import plugins from 'gulp-load-plugins';
import panini from 'panini';
import yargs from 'yargs';
import fs from 'fs';
import yaml from 'js-yaml';
import browser from 'browser-sync';
import rimraf from 'rimraf';

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

function server(done) {
  browser.init({
        server: {
            baseDir: "./dist"
        },
        port: PORT,
        open: false
    });  
  
  done();
}

function clean(done) {
  rimraf(PATHS.dist, done);
}

function html() {
  return gulp.src('src/html/pages/**/*.html')
    .pipe(panini({
      root: 'src/html/pages/',
      layouts: 'src/html/layouts/',
      partials: 'src/html/partials/',
      helpers: 'src/html/helpers/',
      data: 'src/html/data/'
    }))
    .pipe(gulp.dest(PATHS.dist));
}

function scss() {
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
    .pipe(browser.stream()); 
}

function js() {
  let uglify = $.uglify().on('error', $.notify.onError({
      message: "<%= error.message %>",
      title: "Uglify JS Error"
    }));

  return gulp.src(PATHS.js)
    .pipe($.eslint())
    .pipe($.eslint.format())
    .pipe($.eslint.failAfterError())
    .pipe($.sourcemaps.init())
    .pipe($.babel())
    .pipe($.concat('app.js', {
      newLine:'\n;'
    }))
    .pipe($.if(isProduction, uglify))
    .pipe($.if(!isProduction, $.sourcemaps.write()))
    .pipe(gulp.dest('dist/assets/js'))
    .pipe(browser.stream());

}

function copy() {
  return gulp.src(PATHS.assets).pipe(gulp.dest('dist/assets'));
}

function resetPages(done) {
  panini.refresh();
  done();
}

function watch() {
  gulp.watch(PATHS.assets, copy);
  gulp.watch('src/html/pages/**/*.html').on('all', gulp.series(html, browser.reload));
  gulp.watch('src/html/{layouts,partials}/**/*.html').on('all', gulp.series(resetPages, html, browser.reload));
  gulp.watch('src/assets/scss/**/*.scss').on('all', scss);
  gulp.watch('src/assets/js/**/*.js').on('all', gulp.series(js, browser.reload));  
}

gulp.task('build', gulp.series(clean, gulp.parallel(html, scss, js, copy) ));

gulp.task('default',  gulp.series('build', server, watch));