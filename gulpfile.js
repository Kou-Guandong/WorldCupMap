require('dotenv').config({silent: true});
const path = require('path');
const del = require('del');
const gulp = require('gulp');
const gutil = require('gulp-util');
const plumber = require('gulp-plumber');
const eslint = require('gulp-eslint');
const cssnano = require('gulp-cssnano');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const minifyHtml = require('gulp-htmlmin');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const browserSync = require('browser-sync').create();
const assetsInjector = require('gulp-assets-injector')();
const sass = require('gulp-sass');

const DIST = 'dist';
const isProd = process.env.NODE_ENV === 'production';

gulp.task('clean', () => del(DIST));

gulp.task('css', () => {
  let stream = gulp.src('src/**/*.scss', {base: 'src'})
    .pipe(plumber(logError))
    .pipe(sass({importer: importModuleSass}))
    .pipe(postcss([autoprefixer()]));
if (isProd) stream = stream
  .pipe(cssnano());
stream = stream
  .pipe(assetsInjector.collect())
  .pipe(gulp.dest(DIST));
if (!isProd) stream = stream
  .pipe(browserSync.stream());
return stream;
});

gulp.task('js', () => {
  let stream = gulp.src('src/**/*.js')
    .pipe(babel({
      presets: ['es2015'],
    }));
if (isProd) stream = stream
  .pipe(uglify());
stream = stream
  .pipe(assetsInjector.collect())
  .pipe(gulp.dest(DIST));
return stream;
});

gulp.task('html', ['css', 'js'], () => {
  let stream = gulp.src('src/**/*.html', {base: 'src'})
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

gulp.task('copy', () => {
  return gulp.src([
    'src/index.html',
    'src/assets/*',
  ], {base: 'src'})
    .pipe(gulp.dest(DIST));
});

gulp.task('default', ['html', 'copy']);

gulp.task('lint', () => {
  return gulp.src('src/**/*.js')
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('watch-js', ['js'], () => {
  browserSync.reload();
});

gulp.task('watch-html', ['html'], () => {
  browserSync.reload();
});

gulp.task('watch', ['default'], () => {
  gulp.watch('src/**/*.scss', ['css']);
gulp.watch('src/**/*.js', ['watch-js']);
gulp.watch('src/**/*.html', ['watch-html']);
});

gulp.task('browser-sync', ['watch'], () => {
  browserSync.init({
  notify: false,
  server: {
    baseDir: DIST,
  },
});
});

function logError(err) {
  gutil.log(err.toString());
  return this.emit('end');
}
function importModuleSass(url, prev, done) {
  return {
    file: url.replace(/^~(\w.*)$/, (m, g) => path.resolve('node_modules', g)),
};
}

