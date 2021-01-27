"use strict";

const
  gulp          = require("gulp"),
  plumber       = require("gulp-plumber"),
  sourcemap     = require("gulp-sourcemaps"),
  rename        = require("gulp-rename"),
  sass          = require("gulp-sass"),
  postcss       = require("gulp-postcss"),
  autoprefixer  = require("autoprefixer"),
  server        = require("browser-sync").create(),
  csso          = require("gulp-csso"),
  imagemin      = require("gulp-imagemin"),
  webp          = require("gulp-webp"),
  del           = require("del"),
  webpack       = require('webpack'),
  webpackStream = require('webpack-stream'),
  argv          = require('yargs').argv,
  svgSprite     = require('gulp-svg-sprite'),
  svgmin        = require('gulp-svgmin'),
  cheerio       = require('gulp-cheerio'),
  replace       = require('gulp-replace'),
  nunjucks      = require('gulp-nunjucks-render');

const PRODUCTION = !!(argv.production);

gulp.task("clean", function () {
  return del("build");
});

gulp.task("copy", function () {
  return gulp.src([
    "source/fonts/**/*.{woff,woff2}",
    "source/img/**",
    "source/js/**",
    "source/*.ico"
  ], {
    base: "source"
  })
    .pipe(gulp.dest("build"));
});

gulp.task("html", function () {
  return gulp.src("source/pages/**/*.+(html|njk)")
    .pipe(nunjucks({
      path: ['source/templates/']
    }))
    .pipe(gulp.dest("build"));
});

gulp.task('js', function () {
  return gulp.src('./source/js/script.js')
    .pipe(webpackStream({
      mode: (PRODUCTION ? 'production' : 'development'),
      output: {
        filename: 'script.js',
      },
      devtool: (PRODUCTION ? false : 'source-map'),
      module: {
        rules: [
          {
            test: /\.(js)$/,
            exclude: /(node_modules)/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', {
                    "useBuiltIns": "entry",
                    "corejs": {"version": 3},
                    "targets": { "ie": 11 }
                  }],
                ],
              }
            }
          }
        ]
      },
      plugins: [
        new webpack.ProvidePlugin({
          $: 'jquery',
          jQuery: 'jquery'
        }),
      ]
    }))
    .pipe(gulp.dest('./build/js/'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest('./build/js/'));
});

gulp.task('svgSpriteBuild', function () {
  return gulp.src('source/img/svg/*.svg')
  // minify svg
    .pipe(svgmin({
      js2svg: {
        pretty: true
      }
    }))
    // remove all fill, style and stroke declarations in out shapes
    .pipe(cheerio({
      run: function ($) {
        $('[style]').removeAttr('style');
      },
      parserOptions: {xmlMode: true}
    }))
    // cheerio plugin create unnecessary string '&gt;', so replace it.
    .pipe(replace('&gt;', '>'))
    // build svg sprite
    .pipe(svgSprite({
      mode: {
        symbol: {
          sprite: "../sprite.svg",
        }
      }
    }))
    .pipe(gulp.dest('build/img/'));
});

gulp.task("webp", function () {
  return gulp.src("build/img/**/*.{png,jpg}")
    .pipe(webp({quality: 90}))
    .pipe(gulp.dest("build/img"));
});

gulp.task("images", function () {
  return gulp.src("build/img/**/*.{png,jpg,svg}")
    .pipe(imagemin([
      imagemin.optipng({optimizationLevel: 3}),
      imagemin.mozjpeg({progressive: true}),
      imagemin.svgo()
    ]))
    .pipe(gulp.dest("build/img"));
});

gulp.task("css", function () {
  return gulp.src("source/sass/style.scss")
    .pipe(plumber())
    .pipe(sourcemap.init())
    .pipe(sass())
    .pipe(postcss([
      autoprefixer(),
    ]))
    .pipe(csso())
    .pipe(rename("style.min.css"))
    .pipe(sourcemap.write("."))
    .pipe(gulp.dest("build/css"))
    .pipe(server.stream());
});

gulp.task("server", function () {
  server.init({
    server: "build/",
    notify: false,
    open: true,
    cors: true,
    ui: false
  });

  gulp.watch("source/sass/**/*.scss", gulp.series("css", "refresh"));
  gulp.watch("source/pages/**/*.+(html|njk)", gulp.series("html", "refresh"));
  gulp.watch("source/js/**/*.js", gulp.series("js", "refresh"));
});

gulp.task("refresh", function (done) {
  server.reload();
  done();
});

gulp.task("build", gulp.series("clean", "copy", "images", "webp", "js", "svgSpriteBuild", "css", "html"));
gulp.task("start", gulp.series("build", "server"));
