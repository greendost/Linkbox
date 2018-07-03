var gulp = require('gulp');
var notify = require('gulp-notify');
var plumber = require('gulp-plumber');
var pug = require('gulp-pug');
var concat = require('gulp-concat');
var childProcess = require('child_process');

var bundle = require('bundle-js');
var replace = require('gulp-replace');
var rename = require('gulp-rename');

// var globalPkgDir = childProcess
//   .execSync('npm root -g')
//   .toString()
//   .trim();
// console.log('globalPkgDir: ' + globalPkgDir);
// const webpack = require(globalPkgDir + '/' + 'webpack');

// var browserify = require(globalPkgDir + '/' + 'browserify');
// var source = require('vinyl-source-stream');

console.log('process.cwd=' + process.cwd());

gulp.task('default', ['pug', 'sass', 'js-copy', 'test-make', 'proj-watch']);

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

  // gulp;
  // .src('js/*.js')
  // browserify('js/main.js')
  //   .bundle()
  //   .pipe(source('bundle.js'))
  //   // .pipe(concat('bundle.js'))
  //   .pipe(gulp.dest('./build/js'));
});

// take final index.html, and inject test code, and output in test directory
gulp.task('test-make', function() {
  var mochascript = `
    <script src="../node_modules/mocha/mocha.js"></script>
    <script src="../node_modules/chai/chai.js"></script>
    <script src="../tests/test1.js"></script>
    </body>
  `;
  var mochastyle = `<style>.l-gridwrap { display: none}</style></head>`;
  var mochadiv = `<body><div id="mocha"></div>`;

  gulp
    .src('build/index.html')
    .pipe(rename('testv1.html'))
    .pipe(replace('</head>', mochastyle))
    .pipe(replace('<body>', mochadiv))
    .pipe(replace('</body>', mochascript))
    .pipe(gulp.dest('build'));
});

gulp.task('proj-watch', function() {
  var pugwatch = gulp.watch('views/*.pug', ['pug']);
  var sasswatch = gulp.watch('styles/*.scss', ['sass']);
  var jswatch = gulp.watch('js/*.js', ['js-copy']);

  var testwatch = gulp.watch('tests/test1.js', ['test-make']);

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

  testwatch.on('change', function(event) {
    console.log('File ' + event.path + ' was changed');
  });
});
