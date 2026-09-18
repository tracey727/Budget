/**
 * A minimal XLSX reader, with no dependencies.
 *
 * An .xlsx file is a ZIP of XML parts. Everything needed to read one is already
 * in the runtime: `DecompressionStream("deflate-raw")` exists in both Node and
 * Cloudflare Workers, so the ZIP can be opened without pulling in a spreadsheet
 * library — which matters here, because the popular one carries a history of
 * parser advisories and this code reads files that arrive from outside.
 *
 * Only what the Import Centre needs is implemented: the first worksheet, shared
 * strings, inline strings, numbers, booleans, and dates (which Excel stores as
 * serial numbers that mean nothing without the cell's number format).
 *
 * The output is deliberately the same shape `parseCsv` produces — a header row
 * and rows of plain strings — so validation, mapping and commit see no
 * difference between a CSV and a spreadsheet.
 */

/* -------------------------------------------------------------------------- */
/*                                    ZIP                                      */
/* -------------------------------------------------------------------------- */

type ZipEntry = { name: string; offset: number; method: number; compressedSize: number };

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const ZIP64_MARKER = 0xffffffff;

/** Finds the end-of-central-directory record, which lives at the tail. */
function findEocd(view: DataView): number | null {
  // The record is 22 bytes plus a comment of up to 64 KiB, so this is the
  // whole range worth searching.
  const start = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let offset = view.byteLength - 22; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE) return offset;
  }
  return null;
}

function readZipEntries(buffer: ArrayBuffer): Map<string, ZipEntry> | null {
  const view = new DataView(buffer);
  const eocd = findEocd(view);
  if (eocd === null) return null;

  const entryCount = view.getUint16(eocd + 10, true);
  const directoryOffset = view.getUint32(eocd + 16, true);
  if (directoryOffset === ZIP64_MARKER || entryCount === 0xffff) return null; // ZIP64

  const entries = new Map<string, ZipEntry>();
  const decoder = new TextDecoder("utf-8");
  let cursor = directoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > view.byteLength) return null;
    if (view.getUint32(cursor, true) !== CENTRAL_SIGNATURE) return null;

    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);

    const name = decoder.decode(new Uint8Array(buffer, cursor + 46, nameLength));
    entries.set(name, { name, offset: localOffset, method, compressedSize });

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function readEntry(buffer: ArrayBuffer, entry: ZipEntry): Promise<string | null> {
  const view = new DataView(buffer);
  if (entry.offset + 30 > view.byteLength) return null;
  if (view.getUint32(entry.offset, true) !== 0x04034b50) return null;

  // The local header repeats the name and extra-field lengths, and they can
  // differ from the central directory's, so they are read again here.
  const nameLength = view.getUint16(entry.offset + 26, true);
  const extraLength = view.getUint16(entry.offset + 28, true);
  const dataStart = entry.offset + 30 + nameLength + extraLength;

  if (entry.method === 0) {
    const bytes = new Uint8Array(buffer, dataStart, entry.compressedSize);
    return new TextDecoder("utf-8").decode(bytes);
  }

  if (entry.method !== 8) return null; // only stored and deflate are used by Excel

  const compressed = new Uint8Array(buffer, dataStart, entry.compressedSize);
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

/* -------------------------------------------------------------------------- */
/*                                    XML                                      */
/* -------------------------------------------------------------------------- */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

function unescapeXml(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|apos|#x?[0-9a-fA-F]+);/g, (match) => {
    if (ENTITIES[match]) return ENTITIES[match];
    const hex = /^&#x([0-9a-fA-F]+);$/.exec(match);
    if (hex) return String.fromCodePoint(Number.parseInt(hex[1], 16));
    const dec = /^&#(\d+);$/.exec(match);
    if (dec) return String.fromCodePoint(Number.parseInt(dec[1], 10));
    return match;
  });
}

/** Every `<tag …>…</tag>` and `<tag … />` at any depth, as raw strings. */
function elements(xml: string, tag: string): string[] {
  const found: string[] = [];
  // The attribute run is matched lazily on purpose: a greedy `[^>]*` swallows
  // the slash of a self-closing tag, and `<sheet …/>` would then be read as an
  // unclosed element whose content runs to the end of the file.
  const pattern = new RegExp(`<${tag}(\\s[^>]*?)?(/>|>)`, "g");
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(xml)) !== null) {
    if (match[2] === "/>") {
      found.push(match[0]);
      continue;
    }
    const close = xml.indexOf(`</${tag}>`, pattern.lastIndex);
    if (close === -1) break;
    found.push(xml.slice(match.index, close + tag.length + 3));
    pattern.lastIndex = close + tag.length + 3;
  }

  return found;
}

function attribute(element: string, name: string): string | null {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(element);
  return match ? unescapeXml(match[1]) : null;
}

/** The text of every `<t>` in an element, joined — a shared string may be split
 * into runs when parts of it are formatted differently. */
function textContent(element: string): string {
  const parts = element.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g);
  if (!parts) return "";
  return parts
    .map((part) => unescapeXml(part.replace(/^<t(?:\s[^>]*)?>/, "").replace(/<\/t>$/, "")))
    .join("");
}

function firstTagText(element: string, tag: string): string | null {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(element);
  return match ? unescapeXml(match[1]) : null;
}

/* -------------------------------------------------------------------------- */
/*                              Dates and numbers                              */
/* -------------------------------------------------------------------------- */

/** Built-in number formats that mean a date or a time. */
const BUILT_IN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

/**
 * Does this format code render a date?
 *
 * Literal text in a format code is quoted or escaped, and colour and condition
 * sections sit in brackets, so those are stripped before looking for the date
 * placeholders. Otherwise a format like `0.00"my total"` would be mistaken for
 * one containing months and years.
 */
function isDateFormat(code: string): boolean {
  const bare = code
    .replace(/"[^"]*"/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\\./g, "");
  return /[ymdhs]/i.test(bare);
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

/**
 * Excel serial number to an ISO-ish string.
 *
 * Excel counts days from 1899-12-30 in the 1900 system (the offset absorbs its
 * famous phantom 29 February 1900) or 1904-01-01 in the Mac system. A whole
 * number is a date; a fraction is a time of day. No timezone is emitted,
 * because a spreadsheet has none — the tenant's declared timezone is applied
 * later, by the validator, exactly as it is for a bare CSV timestamp.
 */
function serialToText(serial: number, date1904: boolean): string {
  const shifted = date1904 ? serial + 1462 : serial;
  const days = Math.floor(shifted);
  const fraction = shifted - days;

  const utc = new Date(Math.round((days - 25569) * 86_400_000));
  if (Number.isNaN(utc.getTime())) return String(serial);

  const iso = `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
  if (fraction === 0) return iso;

  // Rounded to the second, then carried, so 23:59:59.7 cannot become 24:00:00.
  const totalSeconds = Math.round(fraction * 86_400);
  if (totalSeconds >= 86_400) {
    const next = new Date(utc.getTime() + 86_400_000);
    return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}T00:00:00`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${iso}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** "A" → 0, "Z" → 25, "AA" → 26. */
function columnIndex(reference: string): number {
  const letters = /^([A-Z]+)/.exec(reference.toUpperCase());
  if (!letters) return -1;
  let index = 0;
  for (const character of letters[1]) {
    index = index * 26 + (character.charCodeAt(0) - 64);
  }
  return index - 1;
}

/* -------------------------------------------------------------------------- */
/*                                  Workbook                                   */
/* -------------------------------------------------------------------------- */

export type XlsxTable = { sheetName: string; rows: string[][]; sheetCount: number };
export type XlsxFailure = { error: string };

export function isXlsxFailure(value: XlsxTable | XlsxFailure): value is XlsxFailure {
  return "error" in value;
}

/** Style index → true when that style renders its number as a date. */
function dateStyles(stylesXml: string | null): Set<number> {
  const dateStyleIndexes = new Set<number>();
  if (!stylesXml) return dateStyleIndexes;

  const customDateFormats = new Set<number>();
  for (const format of elements(stylesXml, "numFmt")) {
    const id = Number(attribute(format, "numFmtId"));
    const code = attribute(format, "formatCode");
    if (Number.isFinite(id) && code && isDateFormat(code)) customDateFormats.add(id);
  }

  // Only the <cellXfs> block is indexed by a cell's `s` attribute; <cellStyleXfs>
  // uses the same element name and must not be counted.
  const cellXfsBlock = elements(stylesXml, "cellXfs")[0];
  if (!cellXfsBlock) return dateStyleIndexes;

  elements(cellXfsBlock, "xf").forEach((xf, index) => {
    const id = Number(attribute(xf, "numFmtId"));
    if (!Number.isFinite(id)) return;
    if (BUILT_IN_DATE_FORMATS.has(id) || customDateFormats.has(id)) dateStyleIndexes.add(index);
  });

  return dateStyleIndexes;
}

/** The path of the first worksheet, resolved through the workbook relationships. */
function firstSheet(workbookXml: string, relsXml: string | null): { name: string; path: string; count: number } {
  const sheets = elements(workbookXml, "sheet");
  const first = sheets[0];
  const name = first ? (attribute(first, "name") ?? "Sheet1") : "Sheet1";
  const relationshipId = first ? attribute(first, "r:id") : null;

  if (relationshipId && relsXml) {
    for (const relationship of elements(relsXml, "Relationship")) {
      if (attribute(relationship, "Id") !== relationshipId) continue;
      const target = attribute(relationship, "Target");
      if (!target) break;
      const path = target.startsWith("/")
        ? target.slice(1)
        : target.startsWith("xl/")
          ? target
          : `xl/${target.replace(/^\.\//, "")}`;
      return { name, path, count: sheets.length };
    }
  }

  return { name, path: "xl/worksheets/sheet1.xml", count: Math.max(1, sheets.length) };
}

export async function readXlsx(buffer: ArrayBuffer): Promise<XlsxTable | XlsxFailure> {
  if (typeof DecompressionStream === "undefined") {
    return { error: "This server cannot read Excel files. Save the file as CSV UTF-8 and upload that." };
  }

  const entries = readZipEntries(buffer);
  if (!entries) {
    return { error: "That file is not a readable .xlsx workbook. Save it again as .xlsx, or as CSV UTF-8." };
  }

  const read = async (name: string) => {
    const entry = entries.get(name);
    return entry ? readEntry(buffer, entry) : null;
  };

  const workbookXml = await read("xl/workbook.xml");
  if (!workbookXml) {
    return {
      error:
        "That file is a ZIP but not an Excel workbook. If it came from another system, export it as CSV UTF-8 instead.",
    };
  }

  const date1904 = /date1904="(1|true)"/.test(workbookXml);
  const sheet = firstSheet(workbookXml, await read("xl/_rels/workbook.xml.rels"));

  const sheetXml = await read(sheet.path);
  if (!sheetXml) return { error: `The worksheet "${sheet.name}" could not be read from that workbook.` };

  const sharedStringsXml = await read("xl/sharedStrings.xml");
  const sharedStrings = sharedStringsXml
    ? elements(sharedStringsXml, "si").map((si) => textContent(si))
    : [];

  const styles = dateStyles(await read("xl/styles.xml"));

  const rows: string[][] = [];

  for (const rowXml of elements(sheetXml, "row")) {
    const cells: string[] = [];

    for (const cellXml of elements(rowXml, "c")) {
      const reference = attribute(cellXml, "r");
      const index = reference ? columnIndex(reference) : cells.length;
      const position = index >= 0 ? index : cells.length;

      // Cells are omitted when empty, so gaps are filled to keep columns aligned.
      while (cells.length < position) cells.push("");

      const type = attribute(cellXml, "t");
      const rawValue = firstTagText(cellXml, "v");
      const formula = firstTagText(cellXml, "f");

      let value = "";

      if (type === "inlineStr") {
        value = textContent(cellXml);
      } else if (type === "s") {
        const stringIndex = Number(rawValue);
        value = Number.isFinite(stringIndex) ? (sharedStrings[stringIndex] ?? "") : "";
      } else if (type === "str") {
        value = rawValue ?? "";
      } else if (type === "b") {
        value = rawValue === "1" ? "TRUE" : "FALSE";
      } else if (type === "e") {
        // An error cell (#REF!, #N/A) is passed through as its own text so the
        // row is held or rejected with a message naming what Excel showed.
        value = rawValue ?? "#ERROR";
      } else if (rawValue !== null) {
        const styleIndex = Number(attribute(cellXml, "s"));
        const numeric = Number(rawValue);
        value =
          Number.isFinite(numeric) && Number.isFinite(styleIndex) && styles.has(styleIndex)
            ? serialToText(numeric, date1904)
            : rawValue;
      } else if (formula !== null) {
        // A formula whose result Excel never cached cannot be read as a value.
        // It is passed through as the formula text, which validation holds
        // rather than guessing at what it would have evaluated to.
        value = `=${formula}`;
      }

      cells[position] = value;
    }

    rows.push(cells);
  }

  // Trailing rows that Excel keeps for formatting carry no data.
  while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell.trim() === "")) rows.pop();

  return { sheetName: sheet.name, rows, sheetCount: sheet.count };
}
