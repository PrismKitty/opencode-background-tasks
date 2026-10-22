export const KEPT_OUTPUT_LENGTH = 64 * 1024;

export interface ShellOutput {
  text: string;
  isMissingEarlierOutput: boolean;
}

const COLOUR_OR_CURSOR_CODE = /\x1b\[[0-?]*[ -\/]*[@-~]/;

const HYPERLINK_OR_TITLE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/;

const CHARACTER_SET_SWITCH = /\x1b[ -\/]*[0-~]/;

const ESCAPE_SEQUENCES = new RegExp(
  [COLOUR_OR_CURSOR_CODE, HYPERLINK_OR_TITLE, CHARACTER_SET_SWITCH].map((pattern) => pattern.source).join('|'),
  'g',
);

export const appendedOutput = (output: ShellOutput, page: string): ShellOutput => {
  const text = output.text + page;
  if (text.length <= KEPT_OUTPUT_LENGTH) {
    return { text, isMissingEarlierOutput: output.isMissingEarlierOutput };
  }
  return { text: text.slice(-KEPT_OUTPUT_LENGTH), isMissingEarlierOutput: true };
};

const lastRedraw = (line: string): string => line.split('\r').findLast((drawing) => drawing !== '') ?? '';

export const readableOutput = (raw: string): string =>
  raw.replace(ESCAPE_SEQUENCES, '').replace(/\r\n/g, '\n').split('\n').map(lastRedraw).join('\n');

export const isMissingShell = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && '_tag' in error && error._tag === 'ShellNotFoundError';
