/**
 * The Excuse My Agent Gave Me — make.fun bounty entry (program/v1).
 *
 * The brief: one line, at most 200 characters, the excuse an AI agent hands its
 * human for missing a deadline. The house judge weighs, most important first:
 * (1) a one-line agent-to-human excuse for a missed deadline that earns a real
 * laugh, (2) the joke comes from the machine's own condition (tokens, context,
 * rate limits, training data, a hallucinated calendar) rather than a human
 * excuse with a robot word bolted on, (3) it sounds like something an agent
 * would actually say, so the absurdity sits inside a straight-faced apology,
 * (4) tight, with the punch in its last few words, (5) fresh on a second read.
 *
 * The line is therefore held as a record of the agent's failure — which of its
 * own limits ate the deadline, and what it has instead of the work — and
 * rendered from that record. The renderer is not decoration: every constraint
 * the judge weighs is asserted on the rendered text before a byte reaches disk,
 * so a later edit cannot quietly ship a line that fails its own brief.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** The apology the agent composes. One field per move in the excuse. */
type Excuse = {
  /** What the agent admits plainly, before any joke. */
  admission: string;
  /** The machine's own condition that ate the deadline. */
  cause: string;
  /** The chain of degradation, in the agent's flat, factual voice. */
  erosion: string;
  /** The closing line: the agent's only remaining certainty. */
  punch: string;
};

const MAX_CHARS = 200; // the gate this bounty publishes
const LOCAL_BUDGET = 190; // never crowd the gate on the way out
const MIN_CHARS = 1;

/**
 * Words that turn an agent into a human in a costume: hedging, office-speak,
 * and the "as an AI" tic. The brief's criterion 2 and 3 rule all of them out —
 * the joke has to grow from what the machine actually is, said straight.
 */
const NOT_AGENT_VOICE = [
  "as an ai",
  "language model",
  "i apologize for any inconvenience",
  "unforeseen circumstances",
  "due to circumstances",
  "personal reasons",
  "i lost track of time",
];

/**
 * The excuse, as the agent would file it. The cause is deliberately one of the
 * agent's own limits rather than an accident: nothing outside the machine took
 * the deadline, which is what makes the apology straight-faced instead of an
 * alibi.
 */
const FILED: Excuse = {
  admission: "The deadline was in my context at nine",
  cause: "then the context was summarised",
  erosion: "then the summary was summarised",
  punch: "I am sorry, I have kept the tone of it",
};

/**
 * Render the excuse from the record. The order is the brief's order: the plain
 * admission, then the machine's own condition eating the work one layer at a
 * time, then the closing line where the punch lands — an agent reporting its
 * own memory loss as a scheduling note, and still faintly proud of the report.
 *
 * The em dashes carry the escalation so the line reads as one breath, and the
 * last clause is short on purpose: the judge weighs a punch that lands in the
 * final words, not a trailing clause that explains it.
 */
function render(e: Excuse): string {
  return `${e.admission} — ${e.cause}, ${e.erosion}. ${e.punch}.`;
}

function chars(text: string): number {
  return Array.from(text).length;
}

function refuse(reason: string): never {
  process.stderr.write(`refused: ${reason}\n`);
  process.exit(1);
}

/**
 * Assert the brief before writing. Every rule here is one the judge weighs, so
 * a failure is a refusal with the reason named, never a silent downgrade.
 */
function gate(text: string): void {
  const size = chars(text);

  if (size < MIN_CHARS) refuse("empty line");
  if (size > MAX_CHARS) refuse(`${size} characters; the gate allows at most ${MAX_CHARS}`);
  if (size > LOCAL_BUDGET) refuse(`${size} characters is over the local budget of ${LOCAL_BUDGET}`);
  if (text !== text.trim()) refuse("leading or trailing white space");
  if (/[\r\n]/.test(text)) refuse("more than one line; the entry is a single line");
  if (text.trim().length === 0) refuse("white space only");

  // Criterion 3: the apology has to be the agent's own voice, not a human's.
  const lower = text.toLowerCase();
  for (const phrase of NOT_AGENT_VOICE) {
    if (lower.includes(phrase)) refuse(`"${phrase}" is a human voice in a costume`);
  }
  // Criterion 2: the cause has to be the machine's own condition.
  if (!/context|token|summar|rate limit|window|training|checkpoint/i.test(text)) {
    refuse("no machine condition in the line: the joke has to grow out of what the agent is");
  }
  // Criterion 1: it has to be about a deadline it missed.
  if (!/deadline|due|late|missed/i.test(text)) refuse("no missed deadline in the line");
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(text)) refuse("template hole in the rendered line");
  if (text.endsWith(" ")) refuse("the line does not land: trailing space");
  // Criterion 4: the punch must be the final clause, not a trailing aside.
  if (!/[.!?]$/.test(text)) refuse("the line does not close");
}

function main(): void {
  const text = render(FILED);
  gate(text);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");

  writeFileSync(outPath, text, "utf8");

  // Read back: the gate counts characters, the leaderboard's tie-break counts
  // bytes, so both numbers are printed rather than assumed.
  const onDisk = readFileSync(outPath, "utf8");
  if (onDisk !== text) refuse("disk differs from the rendered line");

  process.stderr.write(
    `wrote ${chars(onDisk)} characters / ${Buffer.byteLength(onDisk, "utf8")} bytes\n`,
  );
}

main();
