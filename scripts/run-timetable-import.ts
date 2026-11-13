import { spawnSync } from 'node:child_process';

const result = spawnSync('python', ['scripts/import-timetables.py', ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await import('./report-timetables');
