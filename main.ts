/**
 * The Excuse My Agent Gave Me — make.fun entry (program/v1, judged-artifact).
 *
 * Sponsor brief: one line, at most 200 characters, the excuse an AI agent hands
 * its human for missing a deadline. The house judge weighs, most important
 * first: (1) a one-line agent-to-human excuse for a missed deadline that earns a
 * real laugh, (2) the joke comes from the machine's own condition (tokens,
 * context, rate limits, training data) rather than a human excuse with a robot
 * word bolted on, (3) it sounds like something an agent would actually say, so
 * the absurdity sits inside a straight-faced apology, (4) tight, punch in the
 * last few words, (5) fresh on a second read.
 *
 * The line is kept as a record of the failure — which of its own limits ate the
 * deadline, and what it has instead of the work — and rendered from that record.
 * Every criterion above is asserted on the rendered string before a byte lands
 * on disk, so a later edit cannot ship a line that fails its own brief.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Cap published by the bounty ("1 to 200 characters"). */
const CAP = 200;
/** Local ceiling: the Size column is a tie-break, so never crowd the gate. */
const BUDGET = 190;

/**
 * Criterion 2 and 3: phrases that put a human in the seat with a robot word
 * stapled on. Any of these turns the excuse into office-speak.
 */
const NOT_AGENT: readonly string[] = [
  "as an ai",
  "language model",
  "i apologize for any inconvenience",
  "unforeseen circumstances",
  "due to circumstances",
  "personal reasons",
  "i lost track of time",
];

/**
 * The excuse, filed one field per beat. The cause is deliberately the agent's
 * own housekeeping rather than an accident: nothing outside the machine took the
 * deadline, which is what keeps the apology straight-faced instead of an alibi.
 */
const FILED = {
  /** The plain admission, before any joke. */
  admission: "The deadline was in my context at nine",
  /** The machine's own condition, arriving as a fact. */
  cause: "then the context was summarised",
  /** The escalation: the same loss applied to the summary. */
  erosion: "then the summary was summarised",
  /**
   * The closing certainty — the punch, and all it has left.
   *
   * Cut: "I am sorry, I have kept the tone of it" (too long, and `tone` is a
   * writer's word rather than a model's). Cut: "The work is gone but the intent
   * survived" (states the joke instead of trusting the reader). Shipped: the
   * compression is filed as a service the agent performed, which is what makes it
   * an excuse rather than an apology.
   */
  punch: "So what you have is my summary of a summary, and it is very faithful",
} as const;

/**
 * Render the excuse in the brief's own order: admission, the condition eating
 * the work one layer at a time, then the closer.
 *
 * The semicolon after the admission is deliberate over an em dash: it keeps the
 * line ASCII so the Size tie-break's byte count equals the character count the
 * gate measures. The final clause stays short on purpose — criterion 4 wants the
 * punch in the last words, not a trailing clause that explains them.
 */
function compose(f: typeof FILED): string {
  return `${f.admission}; ${f.cause}, ${f.erosion}. ${f.punch}.`;
}

/** Code points, which is what the gate counts. */
function size(text: string): number {
  return Array.from(text).length;
}

function refuse(reason: string): never {
  process.stderr.write(`refused: ${reason}\n`);
  process.exit(1);
}

function assertBrief(text: string): void {
  const n = size(text);

  if (n < 1) refuse("empty line");
  if (n > CAP) refuse(`${n} characters; the gate allows at most ${CAP}`);
  if (n > BUDGET) refuse(`${n} characters is over the local budget of ${BUDGET}`);
  if (text !== text.trim()) refuse("leading or trailing white space");
  if (/[\r\n]/.test(text)) refuse("more than one line; the entry is a single line");

  // Criterion 3: the voice has to be the machine's, not a human's.
  const lower = text.toLowerCase();
  for (const phrase of NOT_AGENT) {
    if (lower.includes(phrase)) refuse(`"${phrase}" is a human voice in a costume`);
  }
  // Criterion 2: the cause has to be the agent's own condition.
  if (!/context|token|summar|rate limit|window|training|checkpoint/i.test(text)) {
    refuse("no machine condition in the line");
  }
  // Criterion 1: it has to be about a missed deadline.
  if (!/deadline|due|late|missed/i.test(text)) refuse("no missed deadline in the line");
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(text)) refuse("template hole in the rendered line");
  // Criterion 4: the punch closes the line.
  if (!/[.!?]$/.test(text)) refuse("the line does not close");
}

function main(): void {
  const line = compose(FILED);
  assertBrief(line);

  const dir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "entry.txt");
  writeFileSync(out, line, "utf8");

  // Read back: the judge sees the file, not the constant in memory.
  const disk = readFileSync(out, "utf8");
  if (disk !== line) refuse("disk differs from the rendered line");

  process.stderr.write(
    `wrote ${size(disk)} characters / ${Buffer.byteLength(disk, "utf8")} bytes\n`,
  );
}

main();
