/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
var gulp = require("gulp");
var rename = require("gulp-rename");
var uglify = require("gulp-uglify");
var concat = require("gulp-concat");

gulp.task("js", function () {

    gulp.src([
            "./src/GoogleMaps.js",
            "./src/GoogleMap.js",
            "./src/GoogleMapHTMLOverlay.js"
        ])
        .pipe(concat("googlemap.build.js"))
        .pipe(
            gulp.dest("./")
        )
        .pipe(uglify())
        .pipe(rename(function (path) {
            path.basename = "googlemap.build.min";
        }))
        .pipe(
            gulp.dest("./")
        );

    gulp.src([
            "./src/GoogleMaps.js",
            "./src/GoogleMap.js",
            "./src/GoogleMapHTMLOverlay.js",
            "./src/GoogleMapFeature.js",
            "./src/GoogleMapElement.js",
            "./src/GoogleMapStyler.js",
            "./src/GoogleMapStyleOption.js",
            "./src/GoogleMapStyle.js"
        ])
        .pipe(concat("googlemap-style.build.js"))
        .pipe(
            gulp.dest("./")
        )
        .pipe(uglify())
        .pipe(rename(function (path) {
            path.basename = "googlemap-style.build.min";
        }))
        .pipe(
            gulp.dest("./")
        );

    gulp.src([
            "./src/GoogleMaps.js",
            "./src/GoogleMap.js",
            "./src/GoogleMapHTMLOverlay.js",
            "./src/GoogleMapFeature.js",
            "./src/GoogleMapElement.js",
            "./src/GoogleMapStyler.js",
            "./src/GoogleMapStyleOption.js",
            "./src/GoogleMapStyle.js",
            "./src/styles/*.js"
        ])
        .pipe(concat("googlemap-styles.build.js"))
        .pipe(
            gulp.dest("./")
        )
        .pipe(uglify())
        .pipe(rename(function (path) {
            path.basename = "googlemap-styles.build.min";
        }))
        .pipe(
            gulp.dest("./")
        );
});

gulp.task("watch", function () {

    gulp.watch(["src/**/*.js", "src/*.js"], ["js"]);
});
