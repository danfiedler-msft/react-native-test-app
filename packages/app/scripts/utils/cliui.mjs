// @ts-check

/**
 * Minimal, dependency-free helper for laying out `--flag   description` help
 * output (see `formatHelp` in `parseargs.mjs`). It is not a general-purpose
 * replacement for `@isaacs/cliui`; it only supports the single shape used to
 * render help.
 *
 * Each row is made up of one or more fixed-width leading columns (the flag
 * names, which are short enough to never overflow their width) followed by a
 * single flexible column (the description) that word-wraps to fill the
 * remaining terminal width. Wrapped continuation lines are indented so they
 * align under the flexible column.
 *
 * Widths are measured with `String.length`, so ANSI escape codes and wide/CJK
 * characters are not accounted for. This is fine for plain help text.
 */

/**
 * @typedef {{ text: string; width?: number }} Column
 */

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
 * Word-wraps a single line (no embedded newlines) to `columns`, hard-breaking
 * any word longer than the column. Mirrors `wrap-ansi`'s `exec` for the plain
 * text, `{ hard: true }` configuration used here.
 * @param {string} line
 * @param {number} columns
 * @returns {string[]}
 */
function wrapLine(line, columns) {
  if (line.trim() === "") {
    return [""];
  }

  const words = line.split(" ");
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

  // Trim trailing padding from each wrapped line.
  return rows.map((row) => row.replace(/ +$/, ""));
}

/**
 * Word-wraps `text` to `width` columns, hard-breaking any single word that is
 * longer than `width` so that no line ever overflows.
 * @param {string} text
 * @param {number} width
 * @returns {string[]}
 */
function wrapText(text, width) {
  const columns = Math.max(1, width);
  return text.split("\n").flatMap((line) => wrapLine(line, columns));
}

class UI {
  /** @param {{ width: number }} opts */
  constructor(opts) {
    this.width = opts.width;
    /** @type {Column[][]} */
    this.rows = [];
  }

  /**
   * Records a row made up of one or more leading columns and a flexible
   * trailing column.
   * @param {...Column} columns
   */
  div(...columns) {
    this.rows.push(columns);
  }

  /** @returns {string} */
  toString() {
    /** @type {string[]} */
    const lines = [];
    for (const row of this.rows) {
      // All columns except the last are fixed-width and short enough to fit;
      // the last column is flexible and fills the remaining width.
      const leading = row.slice(0, -1);
      const flexible = row[row.length - 1];
      const indent = leading.reduce((sum, col) => sum + (col.width ?? 0), 0);
      const flexWidth = flexible.width ?? Math.max(this.width - indent, 1);

      const prefix = leading
        .map((col) => col.text.padEnd(col.width ?? 0))
        .join("");
      const wrapped = wrapText(flexible.text, flexWidth);
      const continuation = " ".repeat(indent);

      lines.push((prefix + wrapped[0]).replace(/ +$/, ""));
      for (let r = 1; r < wrapped.length; ++r) {
        lines.push((continuation + wrapped[r]).replace(/ +$/, ""));
      }
    }
    return lines.join("\n");
  }
}

/**
 * Creates a new help-output layout builder.
 * @param {{ width?: number }} [opts]
 * @returns {UI}
 */
export function cliui(opts = {}) {
  const width =
    opts.width ??
    (typeof process === "object" && process.stdout && process.stdout.columns
      ? process.stdout.columns
      : 80);
  return new UI({ width });
}
