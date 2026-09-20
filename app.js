(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const sides = ['original', 'modified'].map((id) => ({
    id, editor: $(id), panel: $(`${id}-panel`), file: $(`${id}-file`),
    name: '', readVersion: 0,
  }));
  let generation = 0;
  let hasCompared = false;
  let cachedResult = null;
  let view = 'side-by-side';
  const maxFileBytes = 10 * 1024 * 1024;

  const lineCount = (text) => text ? text.split('\n').length - Number(text.endsWith('\n')) : 0;

  function updateMeta(side) {
    const count = lineCount(side.editor.value);
    $(`${side.id}-count`).textContent = `${count.toLocaleString()} ${count === 1 ? 'line' : 'lines'}`;
    $(`${side.id}-name`).textContent = side.name || 'Or drop a text file';
    $(`${side.id}-name`).title = side.name;
  }

  function announce(message) {
    $('announcement').textContent = message;
  }

  function showState(title, detail, kind = '') {
    $('empty-state').hidden = false;
    $('empty-state').className = `empty-state ${kind}`;
    $('state-icon').textContent = kind === 'success' ? '✓' : kind === 'error' ? '!' : '≠';
    $('state-title').textContent = title;
    $('state-detail').textContent = detail;
    $('diff-output').replaceChildren();
    $('diff-output').hidden = true;
    $('stats').hidden = true;
    $('result-notice').hidden = true;
    announce(title);
  }

  function finishBusy() {
    $('compare').disabled = false;
    $('diff-surface').setAttribute('aria-busy', 'false');
  }

  function markChanged() {
    generation += 1;
    finishBusy();
    cachedResult = null;
    if (hasCompared) {
      showState('Ready for another look.', 'Your text changed. Compare to see the updated differences.');
    }
  }

  function renderResult() {
    if (!cachedResult) return;
    const { files, names, finalNewlineChanged } = cachedResult;
    const output = $('diff-output');
    // Diff2Html escapes all text content. Filenames use textContent below, never patch headers.
    const rendered = Diff2Html.html(files, {
      drawFileList: false,
      outputFormat: view,
      matching: 'lines',
      diffStyle: 'word',
      matchingMaxComparisons: 1000,
      maxLineLengthHighlight: 2000,
      renderNothingWhenEmpty: false,
      // The app's CSS variables supply both themes, including the renderer colors.
      colorScheme: 'light',
    });
    output.innerHTML = rendered;
    if (view === 'side-by-side') {
      const labels = document.createElement('div');
      labels.className = 'diff-labels';
      names.forEach((name) => {
        const label = document.createElement('span');
        label.textContent = name;
        label.title = name;
        labels.append(label);
      });
      output.prepend(labels);
    }
    // Keep keyboard scrolling available for long lines on either side.
    output.querySelectorAll('.d2h-file-side-diff, .d2h-file-diff').forEach((pane, index) => {
      pane.tabIndex = 0;
      pane.setAttribute('role', 'region');
      pane.setAttribute('aria-label', view === 'side-by-side' ? `${index === 0 ? 'Original' : 'Modified'} differences` : 'Unified differences');
    });
    const added = files.reduce((total, file) => total + file.addedLines, 0);
    const removed = files.reduce((total, file) => total + file.deletedLines, 0);
    $('added').textContent = `+${added}`;
    $('added').setAttribute('aria-label', `${added} added ${added === 1 ? 'line' : 'lines'}`);
    $('removed').textContent = `−${removed}`;
    $('removed').setAttribute('aria-label', `${removed} deleted ${removed === 1 ? 'line' : 'lines'}`);
    $('stats').hidden = false;
    $('empty-state').hidden = true;
    output.hidden = false;
    $('result-notice').textContent = 'The versions also differ in whether they end with a newline.';
    $('result-notice').hidden = !finalNewlineChanged;
    announce(`${added} added ${added === 1 ? 'line' : 'lines'}, ${removed} deleted ${removed === 1 ? 'line' : 'lines'}.`);
  }

  function compare() {
    const request = ++generation;
    hasCompared = true;
    cachedResult = null;
    finishBusy();
    const [original, modified] = sides.map((side) => side.editor.value);
    const ignoreWhitespace = $('ignore-whitespace').checked;
    if (!original && !modified) {
      showState('Add some text to compare.', 'Paste text or open a file in either editor.');
      return;
    }
    // Bound pathological inputs before building an enormous DOM.
    if (original.length + modified.length > maxFileBytes || lineCount(original) + lineCount(modified) > 50000) {
      showState('This comparison is a little too large.', 'Use fewer than 50,000 lines and 10 million characters in total.', 'error');
      return;
    }
    showState('Looking for changes…', 'Everything is being compared in your browser.');
    $('compare').disabled = true;
    $('diff-surface').setAttribute('aria-busy', 'true');
    try {
      Diff.structuredPatch('Original', 'Modified', original, modified, '', '', {
        context: 4,
        ignoreWhitespace,
        stripTrailingCr: true,
        timeout: 3000,
        callback(patch) {
          if (request !== generation) return;
          try {
            if (!patch) {
              showState('These versions need a smaller comparison.', 'Try comparing a smaller section of the text.', 'error');
            } else if (patch.hunks.length === 0) {
              showState('No differences found.', ignoreWhitespace ? 'The two versions match when edge whitespace is ignored.' : 'The two versions are identical.', 'success');
            } else {
              cachedResult = {
                files: Diff2Html.parse(Diff.formatPatch(patch)),
                names: sides.map((side, index) => side.name || (index === 0 ? 'Original' : 'Modified')),
                finalNewlineChanged: !ignoreWhitespace && !!original && !!modified && original.endsWith('\n') !== modified.endsWith('\n'),
              };
              renderResult();
            }
          } catch {
            showState('Something went wrong while comparing these versions.', 'Your text is still above. Try comparing again.', 'error');
          } finally {
            finishBusy();
          }
        },
      });
    } catch {
      showState('Something went wrong while comparing these versions.', 'Your text is still above. Try reloading the page if this continues.', 'error');
      finishBusy();
    }
  }

  function showFileError(side, message) {
    const error = $(`${side.id}-error`);
    error.textContent = message;
    error.hidden = !message;
  }

  async function loadFile(side, file) {
    if (!file) return;
    const request = ++side.readVersion;
    showFileError(side, '');
    if (file.size > maxFileBytes) {
      showFileError(side, 'This file is too large. Choose a text file smaller than 10 MB.');
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le'
        : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
      const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
      if (text.includes('\0')) throw new Error('Binary data');
      if (request !== side.readVersion) return;
      side.editor.value = text;
      side.name = file.name;
      updateMeta(side);
      markChanged();
      announce(`${file.name} loaded into ${side.id}.`);
    } catch {
      if (request === side.readVersion) showFileError(side, "This file couldn't be read as text. Try a UTF-8 or UTF-16 text file.");
    }
  }

  sides.forEach((side) => {
    // Do not restore form values from a previous page lifecycle.
    side.editor.value = '';
    side.editor.addEventListener('input', () => {
      side.readVersion += 1;
      showFileError(side, '');
      updateMeta(side);
      markChanged();
    });
    side.editor.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        compare();
      }
    });
    $(`${side.id}-open`).addEventListener('click', () => side.file.click());
    side.file.addEventListener('change', () => {
      loadFile(side, side.file.files[0]);
      side.file.value = '';
    });
    let dragDepth = 0;
    side.panel.addEventListener('dragenter', (event) => {
      if (!event.dataTransfer.types.includes('Files')) return;
      event.preventDefault();
      dragDepth += 1;
      side.panel.classList.add('drag-over');
    });
    side.panel.addEventListener('dragover', (event) => {
      if (!event.dataTransfer.types.includes('Files')) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });
    side.panel.addEventListener('dragleave', () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) side.panel.classList.remove('drag-over');
    });
    side.panel.addEventListener('drop', (event) => {
      if (!event.dataTransfer.files.length) return;
      event.preventDefault();
      dragDepth = 0;
      side.panel.classList.remove('drag-over');
      if (event.dataTransfer.files.length > 1) showFileError(side, 'Drop one text file at a time.');
      else loadFile(side, event.dataTransfer.files[0]);
    });
  });

  $('compare').addEventListener('click', compare);
  $('swap').addEventListener('click', () => {
    const [original, modified] = sides;
    [original.editor.value, modified.editor.value] = [modified.editor.value, original.editor.value];
    [original.name, modified.name] = [modified.name, original.name];
    sides.forEach((side) => { side.readVersion += 1; updateMeta(side); showFileError(side, ''); });
    markChanged();
    if (hasCompared) compare();
    else announce('Original and modified swapped.');
  });
  $('clear').addEventListener('click', () => {
    hasCompared = false;
    sides.forEach((side) => {
      side.readVersion += 1;
      side.editor.value = '';
      side.file.value = '';
      side.name = '';
      updateMeta(side);
      showFileError(side, '');
    });
    markChanged();
    showState('See what changed.', 'Add your two versions above, then compare.');
    announce('Both versions cleared.');
    sides[0].editor.focus();
  });
  $('ignore-whitespace').checked = false;
  $('ignore-whitespace').addEventListener('change', () => { if (hasCompared) compare(); });
  [['split-view', 'side-by-side'], ['unified-view', 'line-by-line']].forEach(([id, format]) => {
    $(id).addEventListener('click', () => {
      view = format;
      $('split-view').setAttribute('aria-pressed', String(view === 'side-by-side'));
      $('unified-view').setAttribute('aria-pressed', String(view === 'line-by-line'));
      renderResult();
    });
  });
  $('shortcut').textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ ↵' : 'Ctrl ↵';
  // File drops outside the editors should never navigate away from the page.
  window.addEventListener('dragover', (event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); });
  window.addEventListener('drop', (event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); });
})();
