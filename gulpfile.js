require('dotenv').config({silent: true});
const path = require('path');
const del = require('del');
const gulp = require('gulp');
const concat = require('gulp-concat');
const eslint = require('gulp-eslint');
const cssnano = require('gulp-cssnano');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const minifyHtml = require('gulp-htmlmin');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const browserSync = require('browser-sync').create();
const assetsInjector = require('gulp-assets-injector')();
const sass = require('gulp-sass');
const runSequence = require('run-sequence');
const rev = require('gulp-rev');
const streamqueue = require('streamqueue');
var revCollector = require('gulp-rev-collector');
var revReplace = require('gulp-rev-collector');

// Config Environment
const DIST = 'dist';
const isProd = process.env.NODE_ENV === 'production';

let serverPath = './src';

if (isProd) {
  serverPath = './dist'
}

// delete 'dist' directory
gulp.task('clean', () => del(DIST));

const AUTOPREFIXER_BROWSERS = [
  'Android 2.3',
  'Android >= 4',
  'Chrome >= 35',
  'Firefox >= 31',
  'Explorer >= 9',
  'iOS >= 7',
  'Opera >= 12',
  'Safari >= 7.1',
];

gulp.task('sass', () => {
  let stream = gulp.src(['src/scss/*.scss'])
    .pipe(sass({outputStyle: 'expanded'}))  // nested, expanded, compact, compressed
    .on('error', sass.logError)
    .pipe(gulp.dest('src/css'))
    .pipe(browserSync.reload({
      stream: true
    }));
  if (isProd) {
    stream = stream.pipe(sass({outputStyle: 'compressed'}))
      .on('error', sass.logError)
      .pipe(postCss([
        autoprefixer({
          browsers: AUTOPREFIXER_BROWSERS,
        }),
      ]))
      .pipe(rev())
      .pipe(gulp.dest('dist/css'))
      .pipe(rev.manifest({
        merge: true
      }))
      .pipe(gulp.dest('dist/rev/sass'));
  }
});

// inspect JS
gulp.task('jshint', () => {
  let stream = gulp.src('src/js/*.js')
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest('src/js'));
  if (isProd) {
    stream.pipe(sourcemaps.init())
      .pipe(uglify())
      .pipe(rev())
      .pipe(gulp.dest('dist/js'))
      .pipe(rev.manifest({
        merge: true
      }))
      .pipe(gulp.dest('dist/rev/js'));
  }
});

// synchronize browser
gulp.task('browserSync', () => {
  browserSync.init({
    server: {
      baseDir: serverPath
    }
  })
});

// Watch Files For Changes
gulp.task('watch', ['browserSync', 'html', 'sass', 'jshint'], function () {
  gulp.watch(['src/**/*.js']).on('change', browserSync.reload);
  gulp.watch(['src/**/*.html']).on('change', browserSync.reload);
  gulp.watch('src/scss/*.scss', ['sass']);
});

// run dev build sequence
gulp.task('dev', (callback) => {
  runSequence(
    ['watch', 'sass', 'jshint', 'browserSync'],
    callback
  )
});
gulp.task('default', () => {
  runSequence('dev');
});

gulp.task('browser-sync', ['watch'], () => {
  browserSync.init({
    notify: false,
    server: {
      baseDir: serverPath,
    },
  });
});

// copy html and common resources to dist
gulp.task('copyAssets', () => {
  return gulp.src([
    'src/**/*.html',
    'src/assets/**',
  ], {base: 'src'})
    .pipe(gulp.dest(DIST));
});

// update all file names with md5-suffixed ones
gulp.task('rev',  () => {
  let stream = streamqueue({objectMode: true},
    gulp.src(['dist/rev/**/*.json', 'dist/*.html'])
      .pipe(revCollector({replaceReved: true}))
      .pipe(gulp.dest('dist/')));
});

// optimize html (currently not in use)
gulp.task('html', () => {
  let stream = gulp.src('src/*.html', {base: 'src'})
    .pipe(assetsInjector.inject({
      link(html, asset) {
        return '/' + path.relative('src', asset);
      },
      filter(html, asset) {
        return path.basename(html, path.extname(html)) === path.basename(asset, path.extname(asset));
      },
    }));
  if (isProd) stream = stream
    .pipe(minifyHtml({
      removeComments: true,
      collapseWhitespace: true,
      conservativeCollapse: true,
      removeAttributeQuotes: true,
    }));
  return stream
    .pipe(gulp.dest(DIST));
});


gulp.task('prod', function (callback) {
  runSequence(
    'clean', ['jshint', 'sass', 'copyAssets'], 'rev', 'browserSync',
    callback
  )
});