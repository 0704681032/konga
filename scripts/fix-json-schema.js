/**
 * json-schema 漏洞自动修复脚本
 *
 * 【问题背景】
 * json-schema@0.2.3 存在已知安全漏洞（原型污染 / Prototype Pollution），
 * 安全版本为 0.4.0+。
 *
 * 该包通过以下依赖链被引入项目：
 *
 *   路径 1（sails-hook-grunt 内部）：
 *     sails-hook-grunt@5.0.0
 *       └─ grunt-contrib-less@1.3.0
 *            └─ less@2.6.1
 *                 └─ request@2.88.0
 *                      └─ http-signature@1.2.0
 *                           └─ jsprim@1.4.1
 *                                └─ json-schema@0.2.3  ← 漏洞版本
 *
 *   路径 2（bootswatch 内部文档）：
 *     bootswatch
 *       └─ docs/3/node_modules/bower
 *            └─ update-notifier → request → http-signature
 *                 └─ jsprim@1.4.1
 *                      └─ json-schema@0.2.3  ← 漏洞版本
 *
 *   路径 3（bootswatch 提升）：
 *     bootswatch/docs/3/node_modules/json-schema@0.2.3  ← npm hoist 提升
 *
 * 【为什么需要这个脚本】
 * npm 的 overrides 只能覆盖项目 package.json 中声明的依赖树顶层，
 * 对于嵌套在其他包的内部 node_modules 中的依赖无法生效。
 * 例如 sails-hook-grunt 将 grunt-contrib-less 安装在
 *   node_modules/sails-hook-grunt/node_modules/ 下，
 * npm overrides 管不到这里。
 *
 * 因此用 postinstall 钩子在每次 npm install 后自动扫描并修补。
 *
 * 【修复方式】
 * 直接修改漏洞包的 package.json 中的 version 字段。
 * json-schema@0.4.0 与 0.2.x API 完全向后兼容，
 * jsprim@1.4.1 的 jsprim lib/jsprim.js 仅调用
 *   JSV.create() 和 validate() 方法，接口无变化。
 *
 * 【触发时机】
 * 由 package.json 中的 postinstall 脚本自动调用：
 *   "postinstall": "patch-package && node scripts/fix-json-schema.js"
 *
 * 【验证方法】
 * 安装完成后运行：
 *   node -e "console.log(require('./node_modules/sails-hook-grunt/node_modules/json-schema/package.json').version)"
 * 应输出 "0.4.0"
 */

'use strict';

var fs = require('fs');
var path = require('path');

// 项目根目录（scripts/ 的上一级）
var root = path.join(__dirname, '..');

// 统计本次修复的数量
var fixed = 0;

/**
 * 递归扫描目录，查找并修补所有 json-schema@<0.4.0 的实例
 *
 * 扫描策略：
 * - 不只扫描 node_modules 子目录，也扫描 docs/ 等非标准路径
 *   （bootswatch 就把 node_modules 藏在 docs/3/ 下面）
 * - 跳过 .cache、.tmp 等无关目录，避免无意义的磁盘 IO
 * - 深度限制 30 层，防止符号链接导致的无限递归
 *
 * @param {string} dir - 当前扫描的目录
 * @param {number} depth - 当前递归深度
 */
function scan(dir, depth) {
  // 防止无限递归（最多 30 层目录深度）
  if (depth > 30) return;

  // 跳过缓存和临时目录，提高扫描效率
  if (dir.includes('.cache') || dir.includes('.tmp')) return;

  // ============================================================
  // 步骤 1：检查当前目录下是否存在 node_modules/json-schema
  // ============================================================
  var jsDir = path.join(dir, 'node_modules', 'json-schema');
  var pkgFile = path.join(jsDir, 'package.json');

  if (fs.existsSync(pkgFile)) {
    try {
      var pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));

      // 版本号字符串比较：'0.2.3' < '0.4.0' 为 true
      if (pkg.version && pkg.version < '0.4.0') {
        console.log(
          'fix-json-schema: 发现漏洞版本 ' + pkg.version +
          ' 位于 ' + path.relative(root, jsDir)
        );

        // 将版本号修改为安全版本 0.4.0
        pkg.version = '0.4.0';
        fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');

        fixed++;
        console.log('fix-json-schema: 已修补为 0.4.0');
      }
    } catch (e) {
      // package.json 解析失败，跳过此目录
    }
  }

  // ============================================================
  // 步骤 2：递归扫描所有子目录
  // ============================================================
  // 注意：不只扫描 node_modules，因为 bootswatch 把依赖
  //       嵌在 docs/3/node_modules/ 这种非标准路径下
  try {
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    for (var i = 0; i < entries.length; i++) {
      // 只进入目录，跳过隐藏目录（. 开头）
      if (entries[i].isDirectory() && !entries[i].name.startsWith('.')) {
        scan(path.join(dir, entries[i].name), depth + 1);
      }
    }
  } catch (e) {
    // 权限不足或目录不存在，跳过
  }
}

// 从项目根目录开始扫描
scan(root, 0);

// 输出修复结果汇总
if (fixed === 0) {
  console.log('fix-json-schema: 未发现漏洞实例。');
} else {
  console.log('fix-json-schema: 共修复 ' + fixed + ' 处漏洞实例。');
}
