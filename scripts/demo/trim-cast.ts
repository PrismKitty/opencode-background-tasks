import { readFile, writeFile } from 'node:fs/promises';

const LEAVE_ALTERNATE_SCREEN = '\u001b[?1049l';
const FINAL_HOLD: CastEvent = [2, 'o', ''];

type CastEvent = [interval: number, type: string, data: string];

const leavesAlternateScreen = (line: string): boolean => {
  const [, type, data] = JSON.parse(line) as CastEvent;
  return type === 'o' && data.includes(LEAVE_ALTERNATE_SCREEN);
};

/**
 * OpenCode clears the screen on exit by leaving the alternate screen, so the recording stops there and
 * holds the last real frame instead
 */
const withoutExit = (cast: string): string => {
  const [header, ...events] = cast.trimEnd().split('\n');
  const exitIndex = events.findIndex(leavesAlternateScreen);
  const kept = exitIndex === -1 ? events : events.slice(0, exitIndex);
  return [header, ...kept, JSON.stringify(FINAL_HOLD)].join('\n') + '\n';
};

const [inputPath, outputPath] = process.argv.slice(2);
if (inputPath === undefined || outputPath === undefined) {
  throw new Error('usage: node scripts/demo/trim-cast.ts <input.cast> <output.cast>');
}
await writeFile(outputPath, withoutExit(await readFile(inputPath, 'utf8')));
