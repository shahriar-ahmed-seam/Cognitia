// Minimal PDF writer for seed data: A4 pages, Helvetica, ASCII text.
// Supports "# heading", "- bullet", blank lines and wrapped paragraphs.

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 56;
const WRAP_AT = 90;

function toAscii(text) {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2192/g, "->")
    .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text, width) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

// Turn content blocks into positioned lines: { font, size, text, x, gap }
function layout(title, subtitle, blocks) {
  const lines = [{ font: "F2", size: 18, text: title, x: MARGIN, gap: 26 }];
  if (subtitle) lines.push({ font: "F1", size: 10, text: subtitle, x: MARGIN, gap: 24 });

  for (const raw of blocks) {
    const block = toAscii(raw);
    if (block.trim() === "") {
      lines.push({ font: "F1", size: 11, text: "", x: MARGIN, gap: 8 });
    } else if (block.startsWith("# ")) {
      lines.push({ font: "F2", size: 13, text: block.slice(2), x: MARGIN, gap: 20 });
    } else if (block.startsWith("- ")) {
      wrap(block.slice(2), WRAP_AT - 4).forEach((part, i) =>
        lines.push({ font: "F1", size: 11, text: (i === 0 ? "-  " : "   ") + part, x: MARGIN + 8, gap: 15 })
      );
    } else {
      wrap(block, WRAP_AT).forEach((part) => lines.push({ font: "F1", size: 11, text: part, x: MARGIN, gap: 15 }));
    }
  }
  return lines;
}

function paginate(lines) {
  const pages = [];
  let page = [];
  let y = PAGE_HEIGHT - MARGIN;
  for (const line of lines) {
    if (y - line.gap < MARGIN + 20) {
      pages.push(page);
      page = [];
      y = PAGE_HEIGHT - MARGIN;
    }
    y -= line.gap;
    page.push({ ...line, y });
  }
  if (page.length) pages.push(page);
  return pages;
}

/**
 * Build a PDF document.
 * @param {{ title: string, subtitle?: string, blocks: string[] }} doc
 * @returns {Buffer}
 */
export function createPdf({ title, subtitle = "", blocks }) {
  const pages = paginate(layout(toAscii(title), toAscii(subtitle), blocks));
  const objects = [];
  const pageIds = pages.map((_, i) => 5 + i * 2);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  pages.forEach((pageLines, i) => {
    const drawn = pageLines
      .filter((line) => line.text)
      .map((line) => `BT /${line.font} ${line.size} Tf ${line.x} ${line.y} Td (${escapePdfText(line.text)}) Tj ET`);
    drawn.push(`BT /F1 9 Tf ${PAGE_WIDTH / 2 - 20} 30 Td (Page ${i + 1} of ${pages.length}) Tj ET`);
    const stream = drawn.join("\n");
    objects[pageIds[i]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[i] + 1} 0 R >>`;
    objects[pageIds[i] + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}
