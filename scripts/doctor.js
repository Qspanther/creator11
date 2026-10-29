#!/usr/bin/env node
const { execSync } = require('child_process');
const targetArg = process.argv.slice(2).join(' ');
try {
  const output = execSync(`npx ecc-universal@2.2.0 doctor ${targetArg}`, { encoding: 'utf8' });
  process.stdout.write(output);
  process.exit(0);
} catch (err) {
  if (err.stdout) process.stdout.write(err.stdout);
  if (err.stderr) process.stderr.write(err.stderr);
  process.exit(err.status || 1);
}
