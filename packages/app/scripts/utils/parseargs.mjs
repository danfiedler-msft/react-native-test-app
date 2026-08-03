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
 * Hard-breaks a single `word` across `rows`, filling the current (last) row
 * before spilling onto new ones. Mirrors `wrap-ansi`'s `wrapWord` for plain
 * text.
 * @param {string[]} rows
 * @param {string} word
 * @param {number} columns
 */
function wrapWord(rows, word, columns) {
  const characters = [...word];
  let visible = rows[rows.length - 1].length;
  for (let index = 0; index < characters.length; ++index) {
    const character = characters[index];
    if (visible + 1 <= columns) {
      rows[rows.length - 1] += character;
    } else {
      rows.push(character);
      visible = 0;
    }
    ++visible;
    if (visible === columns && index < characters.length - 1) {
      rows.push("");
      visible = 0;
    }
  }
}

/**
 * Word-wraps `text` to `columns`, hard-breaking any single word that is longer
 * than `columns` so that no line ever overflows. Mirrors `wrap-ansi`'s greedy
 * `{ hard: true }` wrapping for plain (non-ANSI) text.
 * @param {string} text
 * @param {number} columns
 * @returns {string[]}
 */
function wrap(text, columns) {
  if (text.trim() === "") {
    return [""];
  }

  const words = text.split(" ");
  /** @type {string[]} */
  const rows = [""];
  for (let index = 0; index < words.length; ++index) {
    const word = words[index];
    rows[rows.length - 1] = rows[rows.length - 1].trimStart();
    let rowLength = rows[rows.length - 1].length;
    if (index !== 0 && rowLength > 0) {
      rows[rows.length - 1] += " ";
      ++rowLength;
    }

    const len = word.length;
    if (len > columns) {
      const remainingColumns = columns - rowLength;
      const breaksStartingThisLine =
        1 + Math.floor((len - remainingColumns - 1) / columns);
      const breaksStartingNextLine = Math.floor((len - 1) / columns);
      if (breaksStartingNextLine < breaksStartingThisLine) {
        rows.push("");
      }
      wrapWord(rows, word, columns);
      continue;
    }

    if (rowLength + len > columns && rowLength > 0 && len > 0) {
      rows.push("");
    }
    rows[rows.length - 1] += word;
  }

  return rows.map((row) => row.replace(/ +$/, ""));
}

/**
 * Lays out the `Options:` block: a fixed-width label column (`-x, --flag`)
 * followed by a description that word-wraps to fill the remaining `width`, with
 * continuation lines indented under the description.
 * @param {Record<string, { short?: string; description: string; }>} options
 * @param {number} width
 * @returns {string}
 */
export function formatOptions(options, width) {
  const flags = Object.entries(options);
  // `--flag` column is wide enough for the longest flag name plus its `--`
  // prefix and 2 trailing spaces (`Math.max(...) + 2 + 2`).
  const labelWidth = Math.max(...flags.map(([flag]) => flag.length)) + 4;
  // 2 leading spaces + 4-wide short-flag column (`-x,`) + the `--flag` column.
  const indent = 2 + 4 + labelWidth + 2;
  const descWidth = Math.max(width - indent, 1);

  /** @type {string[]} */
  const lines = [];
  for (const [flag, config] of flags) {
    const short = config.short ? `-${config.short},` : "";
    const label =
      "  " + short.padEnd(4) + `--${flag}`.padEnd(labelWidth + 2);
    const description = wrap(config.description, descWidth);
    lines.push((label + description[0]).replace(/ +$/, ""));
    for (let i = 1; i < description.length; ++i) {
      lines.push((" ".repeat(indent) + description[i]).replace(/ +$/, ""));
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
  const script = path.basename(process.argv[1]);
  return [
    `usage: ${script} [options]`,
    "",
    description,
    "",
    "Options:",
    formatOptions(options, process.stdout.columns ?? 80),
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
