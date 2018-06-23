var gulp = require('gulp');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var pug = require('gulp-pug');
var exec = require('child_process').exec;

console.log('process.cwd=' + process.cwd());

gulp.task('default', ['pug', 'sass', 'js-copy', 'proj-watch']);

gulp.task('pug', function() {
  gulp
    .src('index.pug')
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
  exec('sass styles/basepage.scss build/styles/style.css', function(
    err,
    stdout,
    stderr
  ) {
    if (err !== null) {
      console.log('err: ' + err);
    }
    // console.log('stdout: ' + stdout);
    // console.log('stderr: ' + stderr);
    return 0;
  });
});

gulp.task('js-copy', function() {
  gulp.src('js/*.js').pipe(gulp.dest('build'));
});

gulp.task('proj-watch', function() {
  var pugwatch = gulp.watch('index.pug', ['pug']);
  var sasswatch = gulp.watch('styles/*.scss', ['sass']);
  var jswatch = gulp.watch('js/*', ['js-copy']);

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

// gulp.task('default', function() {
//   gulp.src('*.pug')
//       .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
//       .pipe(pug({
//         data: {
//           require:require
//         },
//         pretty: true
//       }))
//       .pipe(gulp.dest('build'));
//
//   gulp.src('js/*.js')
//       .pipe(gulp.dest('build/js'));
//
//   gulp.src('css/*.css')
//       .pipe(gulp.dest('build/css'));
//
//   // gulp.src('./imgs/**/*', {base: '.'})
//   //   .pipe(gulp.dest('build'));
// })

// what to watch, and what not to
// var watcher = gulp.watch(['./**/*',  '!./build/**/*', '!./playground/**/*', '!./node_modules/**/*'], ['default']);
//
// watcher.on('change', function(event) {
//   console.log('event.type = ' + event.type);
//   console.log('File ' + event.path + ' was changed');
// });
