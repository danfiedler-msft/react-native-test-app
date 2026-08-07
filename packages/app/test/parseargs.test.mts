import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { formatOptionsTable, wordWrap } from "../scripts/utils/parseargs.mjs";

describe("wordWrap()", () => {
  it("returns the text unchanged when it fits on one line", () => {
    deepEqual(wordWrap("hello world", 80), ["hello world"]);
  });

  it("wraps text greedily across multiple lines", () => {
    deepEqual(wordWrap("the quick brown fox jumps", 10), [
      "the quick",
      "brown fox",
      "jumps",
    ]);
  });

  it("does not break up words longer than the specified width", () => {
    deepEqual(wordWrap("supercalifragilisticexpialidocious", 10), [
      "supercalifragilisticexpialidocious",
    ]);
  });

  it("returns a single empty line for empty text", () => {
    deepEqual(wordWrap("", 10), [""]);
  });

  it("returns a single empty line for text that is only whitespace", () => {
    deepEqual(wordWrap("   ", 10), [""]);
  });
});

describe("formatOptionsTable()", () => {
  const options = {
    help: {
      description: "Show this help message",
      short: "h",
    },
    version: {
      description: "Show version number",
      short: "v",
    },
    platform: {
      description:
        "Target platform. This is a long description that should wrap across multiple lines when the width is small enough.",
    },
  };

  it("renders short and long flags with descriptions", () => {
    const lines = formatOptionsTable(options, 80).split("\n");
    deepEqual(lines, [
      "  -h, --help        Show this help message",
      "  -v, --version     Show version number",
      "      --platform    Target platform. This is a long description that should wrap",
      "                    across multiple lines when the width is small enough.",
    ]);
  });

  it("uses blank spaces instead of a short flag when not provided", () => {
    const lines = formatOptionsTable(
      { destination: { description: "Destination path for the app" } },
      80,
    ).split("\n");
    equal(lines[0], "      --destination    Destination path for the app");
  });

  it("wraps long descriptions and aligns continuation lines", () => {
    const lines = formatOptionsTable({ platform: options.platform }, 40).split(
      "\n",
    );
    deepEqual(lines, [
      "      --platform    Target platform.",
      "                    This is a long",
      "                    description that",
      "                    should wrap across",
      "                    multiple lines when",
      "                    the width is small",
      "                    enough.",
    ]);
  });
});
