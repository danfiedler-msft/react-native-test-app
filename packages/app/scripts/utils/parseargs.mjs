// @ts-check
import * as path from "node:path";
import * as util from "node:util";
import manifest from "../../package.json" with { type: "json" };

/** @import { Args, Options } from "../types.ts"; */

/**
 * @template {Options} O
 * @param {NonNullable<unknown>} values
 * @param {O} _options (Unused; only present for type inference)
 * @returns {values is Args<O>}
 */
function coerce(values, _options) {
  return typeof values === "object" && Object.hasOwn(values, "help");
}

/**
 * Greedily wraps plain text so that no line exceeds the specified width.
 * Words longer than `width` are not broken up and may overflow.
 * @param {string} text
 * @param {number} width
 * @returns {string[]}
 */
export function wordWrap(text, width) {
  const lines = [];
  let lineStart = 0; // Start index of the current line within `text`.
  let lineEnd = 0; // End index (exclusive) of the current line's last word.
  let wordStart = 0; // Start index of the word currently being scanned.

  for (let i = 0; i <= text.length; i++) {
    if (i < text.length && text[i] !== " ") {
      continue;
    }
    if (wordStart === i) {
      // Collapse consecutive spaces; nothing to do for an empty word.
      wordStart = i + 1;
      continue;
    }
    if (lineEnd === lineStart || i - lineStart <= width) {
      // Either this is the first word on the line (always accepted, even if
      // it overflows `width`), or it still fits within `width`.
      lineEnd = i;
    } else {
      lines.push(text.slice(lineStart, lineEnd));
      lineStart = wordStart;
      lineEnd = i;
    }
    wordStart = i + 1;
  }
  lines.push(text.slice(lineStart, lineEnd));
  return lines;
}

/**
 * Renders the options as a two-column table: a fixed-width column with the
 * short and long flag names, and a word-wrapped description column.
 * @param {Record<string, { short?: string; description: string; }>} options
 * @param {number} width Total width available to render the table.
 * @returns {string}
 */
export function formatOptionsTable(options, width) {
  const flags = Object.entries(options);

  // Additional space added to the longest flag name so descriptions never
  // start flush against the flag column; matches the pre-existing spacing.
  const extraFlagPadding = 4;
  const minWidth =
    Math.max(...flags.map(([flag]) => flag.length)) + extraFlagPadding;

  const spacerWidth = 2;
  const shortWidth = 4;
  const flagWidth = minWidth + 2;
  const prefixWidth = spacerWidth + shortWidth + flagWidth;
  const descriptionWidth = Math.max(1, width - prefixWidth);

  const lines = [];
  for (const [flag, config] of flags) {
    const short = config.short ? `-${config.short},` : "";
    const prefix =
      " ".repeat(spacerWidth) +
      short.padEnd(shortWidth) +
      `--${flag}`.padEnd(flagWidth);
    const [firstLine, ...rest] = wordWrap(config.description, descriptionWidth);
    lines.push(prefix + firstLine);
    for (const line of rest) {
      lines.push(" ".repeat(prefixWidth) + line);
    }
  }

  return lines.join("\n");
}

/**
 * Generates help message.
 * @param {string} description
 * @param {Record<string, { short?: string; description: string; }>} options
 * @returns {string}
 */
function formatHelp(description, options) {
  const width = process.stdout.columns ?? 80;
  const script = path.basename(process.argv[1]);
  return [
    `usage: ${script} [options]`,
    "",
    description,
    "",
    "Options:",
    formatOptionsTable(options, width),
    "",
  ].join("\n");
}

/**
 * Parses command line arguments.
 *
 * @see {@link https://nodejs.org/api/util.html#utilparseargsconfig}
 *
 * @template {Options} O
 * @param {string} description
 * @param {O} options
 * @param {(args: Args<O>) => void} callback
 */
export function parseArgs(description, options, callback) {
  const mergedOptions = {
    help: {
      description: "Show this help message",
      type: "boolean",
      short: "h",
      default: false,
    },
    version: {
      description: "Show version number",
      type: "boolean",
      short: "v",
      default: false,
    },
    ...options,
  };

  const { values, positionals } = util.parseArgs({
    args: process.argv.slice(2),
    options: mergedOptions,
    strict: true,
    allowPositionals: true,
    tokens: false,
  });

  if (!coerce(values, mergedOptions)) {
    throw new Error("Failed to parse command-line arguments");
  }

  if (values.help) {
    console.log(formatHelp(description, mergedOptions));
  } else if (typeof values.version === "boolean" && values.version) {
    const { name, version } = manifest;
    console.log(`${name} ${version}`);
  } else {
    values._ = positionals;
    callback(values);
  }
}
