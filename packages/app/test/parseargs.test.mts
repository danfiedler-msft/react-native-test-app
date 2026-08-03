import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { formatOptions } from "../scripts/utils/parseargs.mjs";

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

describe("formatOptions()", () => {
  it("lays out a fixed label column with a flexible description", () => {
    equal(
      formatOptions(options, 80),
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

  it("wraps the description when the terminal is narrow", () => {
    equal(
      formatOptions(options, 40),
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

  it("hard-breaks words that are longer than the description column", () => {
    equal(
      formatOptions({ x: { description: "abcdefghijklmnopqrstuvwxyz" } }, 24),
      ["      --x    abcdefghijk", "             lmnopqrstuv", "             wxyz"].join(
        "\n"
      )
    );
  });
});
