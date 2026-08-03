// @ts-check

/**
 * Minimal, dependency-free replacement for the subset of `@isaacs/cliui` that
 * this package uses (see `formatHelp` in `parseargs.mjs`).
 *
 * Only the features actually exercised are implemented: fixed-width leading
 * columns, a single flexible trailing column, and word-wrapping within each
 * column. This intentionally avoids the upstream dependency chain
 * (`string-width`/`strip-ansi`/`wrap-ansi`) while reproducing its output for
 * plain (non-ANSI) text.
 *
 * Intentional limitations:
 *   - Widths are measured with `String.length`; ANSI escape codes and
 *     wide/CJK characters are not accounted for.
 *   - `padding` is accepted (for API compatibility) but ignored, and `align`
 *     is not supported. Neither is used by the callers.
 */

/**
 * @typedef {{
 *   text: string;
 *   width?: number;
 *   padding?: number[];
 * }} Column
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

/**
 * Resolves the rendered width of each column in a row. Columns with an explicit
 * `width` keep it; the remaining space is split evenly between the flexible
 * columns, with a minimum of one column each.
 * @param {Column[]} row
 * @param {number} totalWidth
 * @returns {number[]}
 */
function columnWidths(row, totalWidth) {
  let flexible = 0;
  let remaining = totalWidth;
  for (const col of row) {
    if (col.width) {
      remaining -= col.width;
    } else {
      flexible++;
    }
  }
  const flexWidth = flexible > 0 ? Math.floor(remaining / flexible) : 0;
  return row.map((col) => col.width ?? Math.max(flexWidth, 1));
}

class UI {
  /** @param {{ width: number }} opts */
  constructor(opts) {
    this.width = opts.width;
    /** @type {Column[][]} */
    this.rows = [];
  }

  /**
   * Records a row made up of one or more columns.
   * @param {...Column} columns
   * @returns {Column[]}
   */
  div(...columns) {
    this.rows.push(columns);
    return columns;
  }

  /** @returns {string} */
  toString() {
    /** @type {string[]} */
    const lines = [];
    for (const row of this.rows) {
      const widths = columnWidths(row, this.width);
      const wrapped = row.map((col, i) => wrapText(col.text, widths[i]));
      const height = Math.max(...wrapped.map((cell) => cell.length));
      for (let r = 0; r < height; ++r) {
        let line = "";
        for (let c = 0; c < row.length; ++c) {
          line += (wrapped[c][r] ?? "").padEnd(widths[c]);
        }
        // Trim trailing padding, matching `@isaacs/cliui`.
        lines.push(line.replace(/ +$/, ""));
      }
    }
    return lines.join("\n");
  }
}

/**
 * Creates a new layout builder.
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
