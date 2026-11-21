import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { initializeDesktop } from '../scripts/init.mjs';
import { readConfig } from '../src/config.ts';
import { desktopConfigLocations } from '../src/desktop-config.ts';

test('Desktop initialization migrates template defaults and preserves configuration on retry or invalid replacement', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tbea-desktop-config-'));
  t.after(async () => {
    if (root.startsWith(path.join(os.tmpdir(), 'tbea-desktop-config-'))) await fs.rm(root, { recursive: true, force: true });
  });
  const harnessHome = path.join(root, 'Harness with spaces');
  const packageRoot = path.join(root, 'plugin');
  const { filename, options } = desktopConfigLocations(harnessHome, packageRoot);
  await fs.mkdir(options.bundledPopplerBin, { recursive: true });
  for (const name of ['pdfinfo.exe', 'pdftoppm.exe']) {
    await fs.writeFile(path.join(options.bundledPopplerBin, name), 'fixture');
  }
  const source = path.join(root, 'source.json');
  const template = JSON.parse(await fs.readFile(new URL('../config/example.json', import.meta.url), 'utf8'));
  const previewEnabled = process.platform === 'win32';
  template.documentPreview.enabled = previewEnabled;
  template.documentPreview.office = 'custom/office.exe';
  await fs.writeFile(source, JSON.stringify(template));
  await initializeDesktop(root, { harnessHome, configSource: source });
  const saved = await fs.readFile(filename, 'utf8');
  const parsed = await readConfig(filename, options);
  assert.match(parsed.serviceToken, /^[a-f0-9]{64}$/);
  assert.equal(parsed.dataDirectory, path.join(harnessHome, 'dsh-mcp-tbea-knowledge-data'));
  assert.equal(parsed.documentPreview.office, path.join(harnessHome, 'custom', 'office.exe'));
  if (previewEnabled) {
    assert.equal(parsed.documentPreview.pdfInfo, path.join(options.bundledPopplerBin, 'pdfinfo.exe'));
    assert.equal(parsed.documentPreview.pdfToPpm, path.join(options.bundledPopplerBin, 'pdftoppm.exe'));
  }
  await fs.writeFile(source, JSON.stringify({ ...template, port: 12 }));
  await initializeDesktop(root, { harnessHome, configSource: source });
  assert.equal(await fs.readFile(filename, 'utf8'), saved);
  await assert.rejects(initializeDesktop(root, { harnessHome, configSource: source, replaceConfig: true }), /port/u);
  assert.equal(await fs.readFile(filename, 'utf8'), saved);
  await fs.writeFile(source, JSON.stringify({ ...template, port: 17862, serviceToken: parsed.serviceToken }));
  await initializeDesktop(root, { harnessHome, configSource: source, replaceConfig: true });
  const replacement = await readConfig(filename, options);
  assert.equal(replacement.port, 17862);
  assert.equal(replacement.serviceToken, parsed.serviceToken);
});
