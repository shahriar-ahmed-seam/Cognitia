// Lenient JSON parsing for model output. Models writing LaTeX inside JSON strings often leave
// backslashes unescaped (`\frac`, `\infty`, `\(`), put raw newlines in strings, or run out of
// tokens mid-array. These helpers repair what can be repaired and salvage complete items.

// LaTeX commands that start with a valid JSON escape letter (b, f, n, r, t). Unescaped, `\frac`
// would parse as a form feed followed by "rac", so these are turned into a literal backslash.
const LATEX_COMMANDS = new Set([
  "backslash", "bar", "because", "begin", "beta", "big", "bigcap", "bigcup", "bigg", "bigoplus", "binom", "bmod", "boldsymbol", "bot", "bullet", "bf",
  "flat", "forall", "frac", "frown",
  "nabla", "ne", "neg", "neq", "newline", "nexists", "ngeq", "ni", "nleq", "nmid", "not", "notin", "nu",
  "rangle", "rceil", "rfloor", "rho", "right", "rightarrow", "rightleftharpoons", "rm",
  "tan", "tanh", "tau", "text", "textbf", "textit", "textrm", "texttt", "tfrac", "therefore", "theta", "tilde", "times", "to", "top", "triangle", "triangleq",
]);

/** Fix invalid escapes and raw control characters inside JSON strings. Leaves valid JSON unchanged. */
export function repairJson(text) {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }
    if (ch === "\n") {
      out += "\\n";
      continue;
    }
    if (ch === "\r") continue;
    if (ch === "\t") {
      out += "\\t";
      continue;
    }
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = text[i + 1];
    if (next === undefined) {
      out += "\\\\";
      continue;
    }
    if (next === '"' || next === "\\" || next === "/") {
      out += ch + next;
      i++;
      continue;
    }
    if (next === "u" && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
      out += text.slice(i, i + 6);
      i += 5;
      continue;
    }
    if ("bfnrt".includes(next)) {
      const word = /^[a-zA-Z]+/.exec(text.slice(i + 1))[0];
      if (LATEX_COMMANDS.has(word)) {
        out += "\\\\"; // a literal backslash; the command's letters follow as plain text
        continue;
      }
      out += ch + next;
      i++;
      continue;
    }
    // Not a JSON escape at all (\( \infty \sum ...): keep the backslash as text
    out += "\\\\";
  }
  return out;
}

const stripFences = (content) =>
  String(content ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

/** Parse model output as JSON: as is, then repaired, then the outermost {...}. Returns undefined if nothing works. */
export function parseJsonLoose(content) {
  const cleaned = stripFences(content);
  for (const candidate of [cleaned, repairJson(cleaned)]) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next form
    }
  }
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(repairJson(match[0]));
    } catch {
      // fall through
    }
  }
  return undefined;
}

/**
 * The complete objects of the first array after `key` (e.g. "questions"), even if the output was
 * cut off partway through the array. Objects that don't parse are skipped.
 */
export function salvageArrayItems(content, key) {
  const text = repairJson(stripFences(content));
  const keyAt = key ? text.indexOf(`"${key}"`) : 0;
  const start = text.indexOf("[", Math.max(0, keyAt));
  if (start === -1) return [];
  const items = [];
  let depth = 0;
  let inString = false;
  let objectStart = -1;
  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") {
      if (depth === 0 && ch === "{") objectStart = i;
      depth++;
    } else if (ch === "}" || ch === "]") {
      if (depth === 0) break; // end of the array
      depth--;
      if (depth === 0 && ch === "}" && objectStart !== -1) {
        try {
          items.push(JSON.parse(text.slice(objectStart, i + 1)));
        } catch {
          // skip a broken item
        }
        objectStart = -1;
      }
    }
  }
  return items;
}
