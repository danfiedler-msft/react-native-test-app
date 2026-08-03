import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { cliui } from "../scripts/utils/cliui.mjs";

/**
 * Renders an option list the same way `formatHelp` does in `parseargs.mjs`.
 */
function renderOptions(
  width: number,
  options: Record<string, { short?: string; description: string }>
): string {
  const flags = Object.entries(options);
  const indent = "  ";
  const minWidth =
    Math.max(...flags.map(([flag]) => flag.length)) + indent.length * 2;

  const ui = cliui({ width });
  for (const [flag, config] of flags) {
    ui.div(
      { text: "", width: 2 },
      { text: config.short ? `-${config.short},` : "", width: 4 },
      { text: `--${flag}`, width: minWidth + 2 },
      { text: config.description }
    );
  }
  return ui.toString();
}

const options = {
  help: { description: "Show this help message", short: "h" },
  version: { description: "Show version number", short: "v" },
  name: { description: "Name of the app" },
  platform: {
    description:
      "Platform to configure; can be specified multiple times e.g., `-p android -p ios`",
    short: "p",
  },
  destination: { description: "Destination path for the app" },
};

describe("cliui()", () => {
  it("lays out fixed columns with a flexible trailing column", () => {
    equal(
      renderOptions(80, options),
      [
        "  -h, --help           Show this help message",
        "  -v, --version        Show version number",
        "      --name           Name of the app",
        "  -p, --platform       Platform to configure; can be specified multiple times",
        "                       e.g., `-p android -p ios`",
        "      --destination    Destination path for the app",
      ].join("\n")
    );
  });

  it("wraps the flexible column when the terminal is narrow", () => {
    equal(
      renderOptions(40, options),
      [
        "  -h, --help           Show this help",
        "                       message",
        "  -v, --version        Show version",
        "                       number",
        "      --name           Name of the app",
        "  -p, --platform       Platform to",
        "                       configure; can be",
        "                       specified",
        "                       multiple times",
        "                       e.g., `-p android",
        "                       -p ios`",
        "      --destination    Destination path",
        "                       for the app",
      ].join("\n")
    );
  });

  it("hard-breaks words that are longer than the column width", () => {
    const ui = cliui({ width: 12 });
    ui.div({ text: "x", width: 2 }, { text: "abcdefghijklmnop" });
    equal(ui.toString(), ["x abcdefghij", "  klmnop"].join("\n"));
  });
});
