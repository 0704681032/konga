/**
 * Post-install script to fix json-schema vulnerability (CVE in json-schema < 0.4.0).
 *
 * npm overrides cannot reach packages nested inside internal node_modules.
 * This script finds and replaces all vulnerable json-schema@0.2.x instances
 * with json-schema@0.4.0 by patching the package.json version.
 *
 * Known affected locations:
 *   1. node_modules/sails-hook-grunt/node_modules/json-schema
 *   2. node_modules/bootswatch/docs/3/node_modules/.../json-schema
 */

'use strict';

var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var fixed = 0;

/**
 * Recursively scan for vulnerable json-schema packages.
 * Scans both node_modules children AND other subdirectories (like docs/)
 * since some packages embed nested node_modules inside non-standard paths.
 */
function scan(dir, depth) {
  if (depth > 30) return;
  if (dir.includes('.cache') || dir.includes('.tmp')) return;

  // Check if this dir has a vulnerable json-schema
  var jsDir = path.join(dir, 'node_modules', 'json-schema');
  var pkgFile = path.join(jsDir, 'package.json');

  if (fs.existsSync(pkgFile)) {
    try {
      var pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
      if (pkg.version && pkg.version < '0.4.0') {
        console.log('fix-json-schema: found vulnerable ' + pkg.version + ' at ' + path.relative(root, jsDir));
        pkg.version = '0.4.0';
        fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
        fixed++;
        console.log('fix-json-schema: patched to 0.4.0');
      }
    } catch (e) {
      // skip
    }
  }

  // Recurse into all subdirectories
  try {
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isDirectory() && !entries[i].name.startsWith('.')) {
        scan(path.join(dir, entries[i].name), depth + 1);
      }
    }
  } catch (e) {
    // permission denied or similar
  }
}

scan(root, 0);

if (fixed === 0) {
  console.log('fix-json-schema: no vulnerable instances found.');
} else {
  console.log('fix-json-schema: fixed ' + fixed + ' instance(s).');
}
