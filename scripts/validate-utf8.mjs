#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css']);
const excludedDirectories = new Set(['node_modules', '.next', 'dist', 'build', 'out', 'coverage']);

function isSourceFile(file) {
  const parts = file.split(/[\\/]+/);
  if (parts.some((part) => excludedDirectories.has(part))) return false;
  return sourceExtensions.has(path.extname(file).toLowerCase());
}

function firstInvalidUtf8Offset(bytes) {
  for (let offset = 0; offset < bytes.length;) {
    const lead = bytes[offset];
    if (lead <= 0x7f) { offset += 1; continue; }

    let continuationCount;
    if (lead >= 0xc2 && lead <= 0xdf) continuationCount = 1;
    else if (lead >= 0xe0 && lead <= 0xef) continuationCount = 2;
    else if (lead >= 0xf0 && lead <= 0xf4) continuationCount = 3;
    else return offset;

    if (offset + continuationCount >= bytes.length) return offset;
    const second = bytes[offset + 1];
    if (second < 0x80 || second > 0xbf) return offset + 1;
    if ((lead === 0xe0 && second < 0xa0) ||
        (lead === 0xed && second > 0x9f) ||
        (lead === 0xf0 && second < 0x90) ||
        (lead === 0xf4 && second > 0x8f)) return offset + 1;

    for (let index = 2; index <= continuationCount; index += 1) {
      const byte = bytes[offset + index];
      if (byte < 0x80 || byte > 0xbf) return offset + index;
    }
    offset += continuationCount + 1;
  }
  return -1;
}

const decoder = new TextDecoder('utf-8', { fatal: true });
const trackedFiles = execFileSync('git', ['ls-files', '-z'], { cwd: root })
  .toString('utf8').split('\0').filter(isSourceFile);
const failures = [];

for (const file of trackedFiles) {
  let bytes;
  try {
    bytes = readFileSync(path.join(root, file));
  } catch (error) {
    failures.push(`${file}: unable to read (${error.message})`);
    continue;
  }
  try {
    decoder.decode(bytes);
  } catch {
    failures.push(`${file}: invalid UTF-8 at byte offset ${firstInvalidUtf8Offset(bytes)}`);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`UTF-8 validation passed for ${trackedFiles.length} tracked source files.`);
}
