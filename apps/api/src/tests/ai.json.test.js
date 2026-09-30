/**
 * @jest-environment node
 */
// Lenient parsing of model JSON (LaTeX escapes, raw newlines, cut-off replies).
import { parseJsonLoose, repairJson, salvageArrayItems } from "../modules/ai/json.js";
import { parseQuestions } from "../modules/practice/generator.js";

describe("repairJson", () => {
  it("leaves valid JSON alone", () => {
    const valid = JSON.stringify({ a: "line\nbreak \"quoted\" \\frac{1}{2} \u00e9", b: [1, 2] });
    expect(repairJson(valid)).toBe(valid);
  });

  it("keeps LaTeX backslashes that aren't valid escapes", () => {
    const raw = '{"prompt":"Find $\\lim_{x \\to \\infty} f(x)$ and \\(a+b\\)"}';
    expect(JSON.parse(repairJson(raw)).prompt).toBe("Find $\\lim_{x \\to \\infty} f(x)$ and \\(a+b\\)");
  });

  it("doesn't turn \\frac or \\times into control characters", () => {
    const raw = '{"p":"$\\frac{a}{b} \\times \\theta \\neq \\beta \\rho$"}';
    expect(JSON.parse(repairJson(raw)).p).toBe("$\\frac{a}{b} \\times \\theta \\neq \\beta \\rho$");
  });

  it("still reads real \\n and \\t escapes", () => {
    expect(JSON.parse(repairJson('{"p":"one\\ntwo\\tthree\\nThe end"}')).p).toBe("one\ntwo\tthree\nThe end");
  });

  it("escapes raw newlines inside strings", () => {
    expect(JSON.parse(repairJson('{"p":"one\ntwo"}')).p).toBe("one\ntwo");
  });
});

describe("parseJsonLoose", () => {
  it("strips code fences and surrounding prose", () => {
    expect(parseJsonLoose('```json\n{"score": 3}\n```')).toEqual({ score: 3 });
    expect(parseJsonLoose('Here you go: {"score": 2.5, "note": "$\\sum x$"} Thanks')).toEqual({ score: 2.5, note: "$\\sum x$" });
    expect(parseJsonLoose("not json")).toBeUndefined();
  });
});

describe("salvageArrayItems", () => {
  it("keeps the complete items of a cut-off array", () => {
    const cut = '{"questions":[{"type":"NUMERIC","prompt":"a {b}","answer":{"value":1}},{"type":"WRITTEN","prompt":"Explain \\frac';
    expect(salvageArrayItems(cut, "questions")).toEqual([{ type: "NUMERIC", prompt: "a {b}", answer: { value: 1 } }]);
  });

  it("finds questions in replies the generator gets", () => {
    const reply = '{"questions":[{"type":"TRUE_FALSE","prompt":"$\\infty$ is a number","answer":{"correct":1}}]}';
    expect(parseQuestions(reply)).toHaveLength(1);
    expect(parseQuestions('{"questions":[{"type":"SINGLE_CHOICE","prompt":"x"}, {"type":')).toHaveLength(1);
  });
});
