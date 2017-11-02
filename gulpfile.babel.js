'use strict';

import gulp from 'gulp';
import $ from 'gulp-load-plugins';
import panini from 'panini';

gulp.task('html', function() {  
  gulp.src('src/html/pages/**/*.html')
    .pipe(panini({
      root: 'src/html/pages/',
      layouts: 'src/html/layouts/',
      partials: 'src/html/partials/',
      helpers: 'src/html/helpers/',
      data: 'src/html/data/'
    }))
    .pipe(gulp.dest('dist'));
});