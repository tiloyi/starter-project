import { src, dest, watch, series, parallel } from "gulp";

import twig from "gulp-twig";
import gulpif from "gulp-if";
import yargs from "yargs";
import sourcemaps from "gulp-sourcemaps";
import sass from "gulp-sass";
import postcss from "gulp-postcss";
import autoprefixer from "autoprefixer";
import pxtorem from "postcss-pxtorem";
import cleanCSS from "gulp-clean-css";
import named from "vinyl-named";
import webpack from "webpack-stream";
import del from "del";
import browserSync from "browser-sync";

const PRODUCTION = yargs.argv.prod;
const OUTPUT_FOLDER = "dist";
const server = browserSync.create();

export const html = () => {
  return src("src/templates/*.html.twig")
    .pipe(
      twig({
        extname: false,
      })
    )
    .pipe(dest(`${OUTPUT_FOLDER}`));
};

export const css = () => {
  return src("src/scss/*.scss")
    .pipe(gulpif(!PRODUCTION, sourcemaps.init()))
    .pipe(sass().on("error", sass.logError))
    .pipe(
      gulpif(
        PRODUCTION,
        postcss([
          autoprefixer(),
          pxtorem({
            propList: [
              "font-size",
              "*height",
              "left",
              "margin*",
              "padding*",
              "top",
              "*width*",
            ],
          }),
        ])
      )
    )
    .pipe(gulpif(PRODUCTION, cleanCSS({ compatibility: "ie8" })))
    .pipe(gulpif(!PRODUCTION, sourcemaps.write()))
    .pipe(dest(`${OUTPUT_FOLDER}/css`))
    .pipe(server.stream());
};

export const javascript = () => {
  return src("src/js/*.js")
    .pipe(named())
    .pipe(
      webpack({
        module: {
          rules: [
            {
              test: /\.js$/,
              use: {
                loader: "babel-loader",
                options: {
                  presets: ["@babel/preset-env"],
                },
              },
            },
          ],
        },
        mode: PRODUCTION ? "production" : "development",
        devtool: !PRODUCTION ? "inline-source-map" : false,
        output: {
          filename: "[name].js",
        },
      })
    )
    .pipe(dest(`${OUTPUT_FOLDER}/js`));
};

export const images = () => {
  return (
    src("src/images/**/*.{jpg,jpeg,png,svg,gif}")
      // .pipe(gulpif(PRODUCTION, imagemin()))
      .pipe(dest(`${OUTPUT_FOLDER}/images`))
  );
};

export const copy = () => {
  return src([
    "src/**/*",
    "!src/{images,js,scss,templates,favicon}",
    "!src/{images,js,scss,templates,favicon}/**/*",
    "src/favicon/**/*",
  ]).pipe(dest(`${OUTPUT_FOLDER}`));
};

export const clean = () => {
  return del([`${OUTPUT_FOLDER}`]);
};

// BrowserSync
export const serve = (done) => {
  server.init({
    server: {
      baseDir: `./${OUTPUT_FOLDER}/`,
    },
  });
  done();
};

export const reload = (done) => {
  server.reload();
  done();
};

// WATCH
export const watchForChanges = () => {
  watch("src/templates/**/*.twig", series(html, reload));
  watch("src/scss/**/*.scss", css);
  watch("src/js/**/*.js", series(javascript, reload));
  watch("src/images/**/*.{jpg,jpeg,png,svg,gif}", series(images, reload));
  watch(
    [
      "src/**/*",
      "!src/{images,js,scss,templates,favicon}",
      "!src/{images,js,scss,templates,favicon}/**/*",
      "src/favicon/**/*",
    ],
    series(copy, reload)
  );
};

// Main tasks
export const dev = series(
  clean,
  parallel(html, css, javascript, images, copy),
  serve,
  watchForChanges
);

export const build = series(
  html,
  clean,
  parallel(html, css, javascript, images, copy)
);

export default dev;
