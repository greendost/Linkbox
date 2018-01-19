var gulp = require('gulp');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var pug = require('gulp-pug');

console.log('process.cwd='+process.cwd());

gulp.task('default', function() {
  gulp.src('*.pug')
      .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
      .pipe(pug({
        data: {
          require:require
        },
        pretty: true
      }))
      .pipe(gulp.dest('build'));

  gulp.src('js/*.js')
      .pipe(gulp.dest('build/js'));

  gulp.src('css/*.css')
      .pipe(gulp.dest('build/css'));

  // gulp.src('./imgs/**/*', {base: '.'})
  //   .pipe(gulp.dest('build'));
})

// what to watch, and what not to
var watcher = gulp.watch(['./**/*',  '!./build/**/*', '!./playground/**/*', '!./node_modules/**/*'], ['default']);

watcher.on('change', function(event) {
  console.log('event.type = ' + event.type);
  console.log('File ' + event.path + ' was changed');
});
