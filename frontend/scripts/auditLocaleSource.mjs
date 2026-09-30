import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = fileURLToPath(new URL('../', import.meta.url)), source = path.join(root, 'src');
const messages = JSON.parse(readFileSync(path.join(source, 'locales/catalog/en.json'))).messages;
const seen = new Set(), failures = [];
function inspect(file) {
  if (seen.has(file) || file.includes(`${path.sep}research${path.sep}`)) return;
  seen.add(file);
  const content = readFileSync(file, 'utf8');
  const syntax = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, /tsx?$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.JSX);
  const fail = (node, reason) => failures.push(`${path.relative(root, file)}:${syntax.getLineAndCharacterOfPosition(node.getStart(syntax)).line + 1}: ${reason}`);
  function walk(node) {
    if (ts.isCallExpression(node) && ['translate', 'getDictionary'].includes(node.expression.getText(syntax))) {
      let parent = node.parent;
      while (parent && !ts.isFunctionLike(parent)) parent = parent.parent;
      if (!parent) fail(node, 'Resolve translations inside render/functions after the locale is ready');
    }
    let dependency;
    if (ts.isImportDeclaration(node)) dependency = node.moduleSpecifier.text;
    else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) dependency = node.arguments[0]?.text;
    if (dependency?.startsWith('.')) {
      const target = path.resolve(path.dirname(file), dependency);
      const resolved = [target, ...['.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.ts'].map(suffix => target + suffix), ...(/\.jsx?$/.test(target) ? ['.ts', '.tsx'].map(suffix => target.replace(/\.jsx?$/, suffix)) : [])].find(value => /\.(jsx?|tsx?)$/.test(value) && existsSync(value));
      if (resolved) inspect(resolved);
    }
    if (ts.isJsxText(node) && /[A-Za-zÀ-ỹĐđ]/.test(node.text.trim())) fail(node, 'UI text must use a catalog key');
    if ((ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /[À-ỹĐđ]/.test(node.text)) fail(node, 'Vietnamese template copy must live in the catalog');
    if (ts.isStringLiteral(node)) {
      if (/^(?:core|ui|assistant|api|enum|email|notification|calendar|profile)\./.test(node.text) && !node.text.endsWith('.') && !messages[node.text]) fail(node, `Unknown catalog key ${node.text}`);
      if (/[À-ỹĐđ]/.test(node.text)) fail(node, 'Vietnamese UI copy must live in the catalog');
      if (ts.isJsxAttribute(node.parent) && ['title', 'aria-label', 'placeholder', 'alt'].includes(node.parent.name.getText(syntax)) && /[A-Za-z]/.test(node.text)) fail(node, 'Accessible labels must use a catalog key');
    }
    ts.forEachChild(node, walk);
  }
  walk(syntax);
}
inspect(path.join(source, 'main.jsx'));
assert.deepEqual(failures, [], failures.join('\n'));
console.log(`${seen.size} active-source modules audited for literal UI copy and missing keys; retired research surfaces remain isolated`);
