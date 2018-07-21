var gulp = require('gulp');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var pug = require('gulp-pug');
var concat = require('gulp-concat');
var childProcess = require('child_process');

var bundle = require('bundle-js');
var replace = require('gulp-replace');
var rename = require('gulp-rename');

console.log('process.cwd=' + process.cwd());

gulp.task('default', ['pug', 'sass', 'js-copy', 'proj-watch']);

gulp.task('pug', function() {
  gulp
    .src('views/*.pug')
    .pipe(
      plumber({ errorHandler: notify.onError('Error: <%= error.message %>') })
    )
    .pipe(
      pug({
        data: {
          require: require
        },
        pretty: true
      })
    )
    .pipe(gulp.dest('build'));
});

gulp.task('sass', function() {
  childProcess.exec(
    'sass styles/basepage.scss build/styles/style.css',
    function(err, stdout, stderr) {
      if (err !== null) {
        console.log('err: ' + err);
      }
      // console.log('stdout: ' + stdout);
      // console.log('stderr: ' + stderr);
      return 0;
    }
  );
});

gulp.task('js-copy', function() {
  bundle({
    entry: 'js/main.js',
    dest: './build/js/bundle.js',
    print: false,
    disablebeautify: true
  });
});

gulp.task('proj-watch', function() {
  var pugwatch = gulp.watch('views/*.pug', ['pug']);
  var sasswatch = gulp.watch('styles/*.scss', ['sass']);
  var jswatch = gulp.watch('js/*.js', ['js-copy']);

  pugwatch.on('change', function(event) {
    console.log('pugwatch event.type = ' + event.type);
    console.log('File ' + event.path + ' was changed');
  });
  sasswatch.on('change', function(event) {
    console.log('sasswatch event.type = ' + event.type);
    console.log('File ' + event.path + ' was changed');
  });
  jswatch.on('change', function(event) {
    console.log('jswatch event.type = ' + event.type);
    console.log('File ' + event.path + ' was changed');
  });
});
