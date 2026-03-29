/**
 * grunt/pipeline.js
 *
 * The order in which your css, javascript, and template files should be
 * compiled and linked from your views and static HTML files.
 *
 * (Note that you can take advantage of Grunt-style wildcard/glob/splat expressions
 * for matching multiple files, and ! in front of an expression to ignore files.)
 *
 * For more information see:
 *   https://github.com/balderdashy/sails-docs/blob/master/anatomy/myApp/tasks/pipeline.js.md
 */


// CSS files to inject in order
//
// (if you're using LESS with the built-in default config, you'll want
//  to change `assets/styles/importer.less` instead.)
var cssFilesToInject = [
  "node_modules/angular-loading-bar/build/loading-bar.css",
  "node_modules/angular-xeditable/dist/css/xeditable.css",
  "node_modules/angular-toastr/dist/angular-toastr.min.css",
  "node_modules/bootstrap-switch/dist/css/bootstrap3/bootstrap-switch.css",
  "node_modules/angular-spinkit/build/angular-spinkit.min.css",
  "node_modules/angular-chips/dist/main.css",
  "node_modules/angular-json-human/dist/angular-json-human.css",
  "node_modules/mdi/css/materialdesignicons.css",
  "styles/**/*.css"
];


// Client-side javascript files to inject in order
// (uses Grunt-style wildcard/glob/splat expressions)
var jsFilesToInject = [

  // Load sails.io before everything else (use npm version for Sails 1.x compatibility)
  "node_modules/sails.io.js/dist/sails.io.js",

  "node_modules/jquery/dist/jquery.js",
  "node_modules/angular/angular.js",
  "node_modules/angular-animate/angular-animate.js",
  "node_modules/angular-loading-bar/build/loading-bar.js",
  "node_modules/angular-ui-router/release/angular-ui-router.js",
  "node_modules/moment/moment.js",
  "node_modules/later/later.js",
  "node_modules/prettycron/prettycron.js",
  "node_modules/angular-bootstrap-show-errors/src/showErrors.js",
  "node_modules/angular-sanitize/angular-sanitize.js",
  "node_modules/angular-xeditable/dist/js/xeditable.js",
  "node_modules/angular-toastr/dist/angular-toastr.tpls.js",
  "node_modules/bootstrap/dist/js/bootstrap.js",
  "node_modules/angular-sails/dist/angular-sails.min.js",
  "node_modules/ngstorage/ngStorage.js",
  "node_modules/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js",
  "node_modules/lodash/lodash.js",
  "node_modules/bootstrap-switch/dist/js/bootstrap-switch.js",
  "node_modules/angular-spinkit/build/angular-spinkit.js",
  "node_modules/angular-chips/dist/angular-chips.js",
  "node_modules/ng-file-upload/dist/ng-file-upload.js",
  "node_modules/angular-messages/angular-messages.js",
  "node_modules/angular-utils-pagination/dirPagination.js",
  "node_modules/chart.js/dist/Chart.js",
  "node_modules/angular-resource/angular-resource.js",
  "node_modules/angular-moment/angular-moment.js",
  "node_modules/bootbox/bootbox.js",
  "node_modules/ngBootbox/dist/ngBootbox.js",
  "node_modules/angular-json-human/dist/angular-json-human.js",
  "node_modules/angular-bootstrap-switch/dist/angular-bootstrap-switch.js",
  "node_modules/angular-chart.js/dist/angular-chart.js",
  "node_modules/angular-base64/angular-base64.js",

  // All of the rest of your client-side js files
  // will be injected here in no particular order.
  'js/app/**/*.js'
];


// Client-side HTML templates are injected using the sources below
// The ordering of these templates shouldn't matter.
// (uses Grunt-style wildcard/glob/splat expressions)
//
// By default, Sails uses JST templates and precompiles them into
// functions for you.  If you want to use jade, handlebars, dust, etc.,
// with the linker, no problem-- you'll just want to make sure the precompiled
// templates get spit out to the same file.  Be sure and check out `tasks/README.md`
// for information on customizing and installing new tasks.
var templateFilesToInject = [
  'templates/**/*.html'
];


// Default path for public folder (see documentation for more information)
var tmpPath = '.tmp/public/';

// Prefix relative paths to source files so they point to the proper locations
// (i.e. where the other Grunt tasks spit them out, or in some cases, where
// they reside in the first place)
module.exports.cssFilesToInject = cssFilesToInject.map(function (cssPath) {
  // If we're ignoring the file, make sure the ! is at the beginning of the path
  if (cssPath[0] === '!') {
    return require('path').join('!.tmp/public/', cssPath.substr(1));
  }
  return require('path').join('.tmp/public/', cssPath);
});
module.exports.jsFilesToInject = jsFilesToInject.map(function (jsPath) {
  // If we're ignoring the file, make sure the ! is at the beginning of the path
  if (jsPath[0] === '!') {
    return require('path').join('!.tmp/public/', jsPath.substr(1));
  }
  return require('path').join('.tmp/public/', jsPath);
});
// node_modules files that need to be copied to .tmp/public/node_modules
// Extracted from cssFilesToInject and jsFilesToInject
// Copy entire directories for each package, not just single files
var nodeModulesToCopy = [];
var seenPackages = {};
cssFilesToInject.concat(jsFilesToInject).forEach(function(p) {
  if (p.startsWith('node_modules/')) {
    var parts = p.replace('node_modules/', '').split('/');
    var packageName = parts[0];
    // Handle scoped packages like @scope/package
    if (packageName.startsWith('@') && parts.length > 1) {
      packageName = parts[0] + '/' + parts[1];
    }
    if (!seenPackages[packageName]) {
      seenPackages[packageName] = true;
      nodeModulesToCopy.push(packageName + '/**/*');
    }
  }
});
module.exports.nodeModulesToCopy = nodeModulesToCopy;

module.exports.templateFilesToInject = templateFilesToInject.map(function (tplPath) {
  // If we're ignoring the file, make sure the ! is at the beginning of the path
  if (tplPath[0] === '!') {
    return require('path').join('!assets/', tplPath.substr(1));
  }
  return require('path').join('assets/', tplPath);
});


