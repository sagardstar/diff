const { test } = require('node:test');
const assert = require('node:assert/strict');
const Diff = require('../vendor/diff-9.0.0.min.js');
const Diff2Html = require('../vendor/diff2html-3.4.56.min.js');

function compare(original, modified, options = {}) {
  return new Promise((resolve) => Diff.structuredPatch(
    'Original', 'Modified', original, modified, '', '',
    { context: 4, stripTrailingCr: true, timeout: 3000, ...options, callback: resolve },
  ));
}

for (const [name, original, modified, added, removed] of [
  ['Markdown', '# Notes\n\n- Old\n', '# Notes\n\n- New\n', 1, 1],
  ['Python', 'def total():\n    return total\n', 'def total():\n    return total + tax\n', 1, 1],
  ['JSON', '{\n  "enabled": false\n}\n', '{\n  "enabled": true\n}\n', 1, 1],
  ['empty original', '', 'one\ntwo\n', 2, 0],
  ['empty modified', 'one\ntwo\n', '', 0, 2],
  ['final newline', 'value', 'value\n', 1, 1],
  ['whitespace with default options', 'a\n', '  a  \n', 1, 1],
  ['Unicode', 'Hello 🌱\n你好\n', 'Hello 🌿\n你好\n', 1, 1],
]) {
  test(name, async () => {
    const patch = await compare(original, modified);
    assert.ok(patch);
    assert.equal(Diff.applyPatch(original, patch), modified);
    const files = Diff2Html.parse(Diff.formatPatch(patch));
    assert.equal(files[0].addedLines, added);
    assert.equal(files[0].deletedLines, removed);
    for (const outputFormat of ['side-by-side', 'line-by-line']) {
      const html = Diff2Html.html(files, { outputFormat, drawFileList: false, matching: 'lines' });
      assert.match(html, /d2h-diff-table/);
      assert.match(html, /linenumber/);
    }
  });
}

test('identical and empty inputs produce no hunks', async () => {
  assert.equal((await compare('same\n', 'same\n')).hunks.length, 0);
  assert.equal((await compare('', '')).hunks.length, 0);
});

test('whitespace option ignores line edges but preserves meaningful internal spaces', async () => {
  assert.equal((await compare('value\n', '\tvalue  \n', { ignoreWhitespace: true })).hunks.length, 0);
  assert.ok((await compare('a b\n', 'ab\n', { ignoreWhitespace: true })).hunks.length);
});

test('Windows and Unix line endings compare equally', async () => {
  assert.equal((await compare('one\r\ntwo\r\n', 'one\ntwo\n')).hunks.length, 0);
});

test('HTML and script content stay escaped', async () => {
  const patch = await compare('safe\n', '<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n');
  const html = Diff2Html.html(Diff.formatPatch(patch), { drawFileList: false });
  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.match(html, /&lt;script&gt;/);
});

test('5,000 lines retain correct line numbers and compact context', async () => {
  const original = Array.from({ length: 5000 }, (_, index) => `line ${index + 1}\n`).join('');
  const modified = original.replace('line 2500\n', 'line 2500 changed\n');
  const patch = await compare(original, modified);
  assert.equal(Diff.applyPatch(original, patch), modified);
  const file = Diff2Html.parse(Diff.formatPatch(patch))[0];
  assert.equal(file.addedLines, 1);
  assert.equal(file.deletedLines, 1);
  assert.ok(file.blocks[0].lines.some((line) => line.newNumber === 2500));
  assert.ok(file.blocks[0].lines.length < 20);
});

test('long lines render intact without expensive inline matching', async () => {
  const line = 'a'.repeat(12000);
  const patch = await compare(`${line}\n`, `${line}changed\n`);
  const html = Diff2Html.html(Diff.formatPatch(patch), { maxLineLengthHighlight: 2000 });
  assert.ok(html.includes(`${line}changed`));
});
