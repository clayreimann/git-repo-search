/**
 * Clay Reimann, 2015
 * See LICENSE.txt for details
 */
'use strict';

import gulp from 'gulp';
import watch from 'gulp-watch';
import webpack from 'webpack-stream';

import del from 'del';
import sequence from 'run-sequence';

const VENDOR_ASSETS = [
  'bower_components/bootstrap/dist/css/bootstrap.min.css',
  'bower_components/jquery/dist/jquery.min.js',
  'bower_components/bootstrap/dist/js/bootstrap.min.js'
]

const PLATFORMS = [
  'chrome'
];

gulp.task('watch', function(done) {
  watch(['platform/**', 'lib/**'], function() {
    gulp.start('build');
  });
});

gulp.task('build', PLATFORMS.map((p) => `build:${p}`));

PLATFORMS.forEach((platform) => {
  gulp.task(`build:${platform}`, function(done) {
    sequence(
      `${platform}:clean`,
      `${platform}:move-assets`,
      `${platform}:move-vendor`,
      `${platform}:compile`,
      `${platform}:zip-extension`,
    done);
  });
});

////////////////////////////
// Build Chrome extension //
////////////////////////////
gulp.task('chrome:clean', function(done) {
  del('build/chrome/**').then(() => {
    done()
  });
});

gulp.task('chrome:move-assets', function() {
  return gulp.src([
      'platform/chrome/manifest.json',
      'platform/chrome/options/options.html',
      'assets/**'
    ])
    .pipe(gulp.dest('build/chrome'))
    ;
});

gulp.task('chrome:move-vendor', function() {
  return gulp.src(VENDOR_ASSETS)
    .pipe(gulp.dest('build/chrome/vendor'))
})

var WEBPACK_CONFIG = {
  entry: {
    chrome: './platform/chrome/chrome.js',
    options: './platform/chrome/options/options.js'
  },
  output: {
    filename: '[name].min.js'
  },
  resolve: {
    extensions: ['', '.js']
  },
  externals: {
    chrome: 'chrome'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel',
        query: {
          presets: ['es2015']
        }
      }
    ]
  },
  plugins: [
    // new webpack.webpack.optimize.UglifyJsPlugin()
  ],
  devtool: 'source-map',
  stats: {
    colors: 'true'
  }
};
gulp.task('chrome:compile', function(done) {
  return gulp.src(['platform/chrome/chrome.js', 'platform/chrome/options/options.html'])
    .pipe(webpack(WEBPACK_CONFIG))
    .on('error', function(e) {done()})
    .pipe(gulp.dest('build/chrome'))
    ;
});

gulp.task('chrome:zip-extension', function(done) {
  // do stuff
  done();
})
