/*
Gulp file to automoatically compile CSS.

Usage:

Install plugins:
npm install gulp gulp-ruby-sass gulp-autoprefixer gulp-minify-css gulp-jshint gulp-concat gulp-uglify gulp-rename --save-dev

Run the wathcer to auto compile css:
    gulp watch

*/ 

var CSS_PATH = 'server/static/survey/assets/css/';

var gulp = require('gulp'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss = require('gulp-minify-css'),
    rename = require('gulp-rename')
    concat = require('gulp-concat')
    uglify = require('gulp-uglify');


gulp.task('default', function(){
    console.log('default gulp');
});


// Stream to build .css and .min.css
gulp.task('process-style', function() {
  return gulp.src(CSS_PATH+'ost-dash-base.scss')
    .pipe(sass({style:'expanded', includePaths: [CSS_PATH] }))
    .pipe(autoprefixer('last 2 version'))
    .pipe(rename('ost-dash.css'))
    .pipe(gulp.dest(CSS_PATH))
    // .pipe(minifycss())
    // .pipe(gulp.dest('dest/styles/'))
});

// gulp.task('process-scripts', function() {
//     return gulp.src('src/scripts/*.js')
//         .pipe(concat('main.js'))
//         .pipe(gulp.dest('dest/scripts/'))
//         .pipe(rename({suffix:'.min'}))
//         .pipe(uglify())
//         .pipe(gulp.dest('dest/scripts/'))

// });


// Automatically process files on save.
gulp.task('watch', function(){
    // gulp.watch('src/scripts/*.js', ['process-scripts'])
    gulp.watch(CSS_PATH+'*.scss', ['process-style'])
});
