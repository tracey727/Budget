/**
 * The XLSX reader.
 *
 * The fixtures are real workbooks, built here byte by byte — a valid ZIP with
 * correct CRCs, one entry deflated and one stored, so both decompression paths
 * are exercised. Nothing is mocked: if this passes, the reader can open a file
 * Excel produced.
 *
 * Most of what is asserted is restraint. A date only becomes a date because the
 * cell's number format says so; a formula Excel never evaluated stays a
 * formula; an error cell stays an error. None of it is guessed at.
 */

import { deflateRawSync } from "node:zlib";
import { readXlsx, isXlsxFailure } from "../src/lib/rescue/xlsx";
import { parseUpload, isParseFailure } from "../src/lib/rescue/parse";
import { normaliseRow } from "../src/lib/rescue/validate";

let pass = 0, fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; console.log(`FAIL ${name}\n  got: ${a}\n  exp: ${e}`); }
}

/* --------------------------- building a workbook -------------------------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** A real ZIP: local headers, central directory and end record. */
function buildZip(files: { name: string; content: string; store?: boolean }[]): ArrayBuffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const raw = Buffer.from(file.content, "utf8");
    const data = file.store ? raw : deflateRawSync(raw);
    const method = file.store ? 0 : 8;
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + data.length;
  }

  const directory = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);

  const zip = Buffer.concat([...locals, directory, eocd]);
  return zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer;
}

const SHARED = [
  "appointment_ref", "client_ref", "scheduled_start", "status", "service_value", "notes",
  "APT-001", "CL-001", "cancelled", "Rang & left a message <urgent>",
];

function workbook(sheetXml: string, options: { date1904?: boolean; twoSheets?: boolean } = {}) {
  const sheets = options.twoSheets
    ? '<sheet name="Appointments" sheetId="1" r:id="rId1"/><sheet name="Notes" sheetId="2" r:id="rId2"/>'
    : '<sheet name="Appointments" sheetId="1" r:id="rId1"/>';

  return buildZip([
    {
      name: "xl/workbook.xml",
      content:
        `<?xml version="1.0"?><workbook><workbookPr${options.date1904 ? ' date1904="1"' : ""}/>` +
        `<sheets>${sheets}</sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content:
        '<?xml version="1.0"?><Relationships>' +
        '<Relationship Id="rId1" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Target="worksheets/sheet2.xml"/>' +
        "</Relationships>",
      // Stored rather than deflated, so both ZIP paths are covered.
      store: true,
    },
    {
      name: "xl/sharedStrings.xml",
      content:
        `<?xml version="1.0"?><sst count="${SHARED.length}">` +
        SHARED.map((text) => `<si><t>${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</t></si>`).join("") +
        "</sst>",
    },
    {
      name: "xl/styles.xml",
      content:
        '<?xml version="1.0"?><styleSheet>' +
        '<numFmts count="2">' +
        '<numFmt numFmtId="164" formatCode="dd/mm/yyyy\\ hh:mm"/>' +
        '<numFmt numFmtId="165" formatCode="0.00&quot;my total&quot;"/>' +
        "</numFmts>" +
        // cellStyleXfs must NOT be indexed by a cell's s attribute.
        '<cellStyleXfs count="1"><xf numFmtId="14"/></cellStyleXfs>' +
        '<cellXfs count="4">' +
        '<xf numFmtId="0"/>' +      // 0 — general
        '<xf numFmtId="14"/>' +     // 1 — built-in date
        '<xf numFmtId="164"/>' +    // 2 — custom date and time
        '<xf numFmtId="165"/>' +    // 3 — money with a quoted word in the format
        "</cellXfs></styleSheet>",
    },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml },
    { name: "xl/worksheets/sheet2.xml", content: "<worksheet><sheetData/></worksheet>" },
  ]);
}

/* -------------------------------- reading -------------------------------- */

async function main() {

  const sheet =
    '<?xml version="1.0"?><worksheet><cols><col min="1" max="6"/></cols><sheetData>' +
    '<row r="1">' +
    '<c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c>' +
    '<c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c><c r="F1" t="s"><v>5</v></c>' +
    "</row>" +
    '<row r="2">' +
    '<c r="A2" t="s"><v>6</v></c>' +
    '<c r="B2" t="s"><v>7</v></c>' +
    '<c r="C2" s="2"><v>46266.375</v></c>' +   // 1 Sept 2026, 09:00
    '<c r="D2" t="s"><v>8</v></c>' +
    '<c r="E2" s="3"><v>252.99</v></c>' +
    '<c r="F2" t="s"><v>9</v></c>' +
    "</row>" +
    '<row r="3">' +
    '<c r="A3" t="inlineStr"><is><t>APT-</t><t>002</t></is></c>' +
    '<c r="C3" s="1"><v>46266</v></c>' +        // a whole day: a date, not a time
    '<c r="D3" t="str"><f>CONCAT("no","_show")</f><v>no_show</v></c>' +
    '<c r="E3"><f>SUM(E2:E2)</f></c>' +          // never calculated: no cached value
    '<c r="F3" t="e"><v>#REF!</v></c>' +
    "</row>" +
    '<row r="4">' +
    '<c r="A4" t="s"><v>6</v></c><c r="B4" t="b"><v>1</v></c><c r="E4" s="0"><v>252.99</v></c>' +
    "</row>" +
    '<row r="5"><c r="A5"/><c r="B5"/></row>' +  // formatted but empty: dropped
    "</sheetData></worksheet>";

  const result = await readXlsx(workbook(sheet, { twoSheets: true }));
  if (isXlsxFailure(result)) {
    console.log(`FAIL could not read the workbook: ${result.error}`);
    process.exit(1);
  }

  check("the first sheet is the one read", result.sheetName, "Appointments");
  check("other sheets are counted", result.sheetCount, 2);
  check("empty trailing rows are dropped", result.rows.length, 4);

  check("shared strings come through", result.rows[0], [
    "appointment_ref", "client_ref", "scheduled_start", "status", "service_value", "notes",
  ]);
  check("a formatted date and time becomes a readable timestamp", result.rows[1][2], "2026-09-01T09:00:00");
  check("a whole-day serial becomes a plain date", result.rows[2][1 + 1], "2026-09-01");
  check("money keeps its own text, not a date", result.rows[1][4], "252.99");
  check("a quoted word in a number format is not mistaken for a date", result.rows[1][4], "252.99");
  check("escaped XML is unescaped", result.rows[1][5], "Rang & left a message <urgent>");
  check("runs of an inline string are joined", result.rows[2][0], "APT-002");
  check("a cached formula result is used", result.rows[2][3], "no_show");
  check("an uncalculated formula stays a formula", result.rows[2][4], "=SUM(E2:E2)");
  check("an error cell keeps the error", result.rows[2][5], "#REF!");
  check("a gap keeps the columns lined up", result.rows[2][1], "");
  check("a boolean reads as text", result.rows[3][1], "TRUE");
  check("an unformatted number is left alone", result.rows[3][4], "252.99");

  /* ------------------------- the 1904 date system --------------------------- */

  const mac = await readXlsx(workbook(sheet, { date1904: true, twoSheets: false }));
  // The two Excel date systems are exactly 1462 days apart, so the same serial
  // read as a 1904 workbook lands four years and a day later.
  check(
    "the Mac 1904 date system is honoured",
    !isXlsxFailure(mac) && mac.rows[2][2],
    "2030-09-02",
  );

  /* ------------------------------- failures --------------------------------- */

  const notAZip = await readXlsx(new TextEncoder().encode("appointment_ref,status\nAPT-1,cancelled").buffer as ArrayBuffer);
  check("a CSV renamed to .xlsx is refused", isXlsxFailure(notAZip), true);

  const zipButNotExcel = await readXlsx(buildZip([{ name: "readme.txt", content: "hello" }]));
  check("a plain ZIP is refused", isXlsxFailure(zipButNotExcel), true);
  check(
    "and the refusal says what to do instead",
    isXlsxFailure(zipButNotExcel) && zipButNotExcel.error.includes("CSV UTF-8"),
    true,
  );

  /* --------------------------- through the upload --------------------------- */

  const upload = await parseUpload(
    new File([workbook(sheet, { twoSheets: true })], "appointments.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  if (isParseFailure(upload)) {
    console.log(`FAIL upload rejected the workbook: ${upload.error}`);
    process.exit(1);
  }

  check("the upload finds the headers", upload.headers[0], "appointment_ref");
  check("the upload keeps every data row", upload.rows.length, 3);
  check("the upload names the sheet it read", upload.sheetName, "Appointments");
  check("the upload warns about the sheets it skipped", upload.extraSheets, 1);
  check("the upload hashes the file", upload.sha256.length, 64);
  check("a workbook maps to the same row shape as a CSV", upload.rows[0].appointment_ref, "APT-001");

  const xls = await parseUpload(new File([new Uint8Array([0xd0, 0xcf])], "old.xls"));
  check("the old binary .xls format is refused", isParseFailure(xls), true);

  /* ----------------------- validation of what came out ---------------------- */

  const config = {
    fields: {
      appointment_ref: "appointment_ref",
      client_ref: "client_ref",
      scheduled_start: "scheduled_start",
      status: "status",
      service_value: "service_value",
    },
    dateConvention: "iso" as const,
    timeZone: "Australia/Sydney",
  };

  const good = normaliseRow("appointments", config, upload.rows[0]);
  check("a spreadsheet row validates", good.status, "valid");
  check("its timestamp is read in the tenant timezone", good.values.scheduled_start, "2026-08-31T23:00:00.000Z");
  check("its money becomes cents", good.values.service_value, 25299);

  const uncalculated = normaliseRow("appointments", config, upload.rows[1]);
  check("an uncalculated formula holds the row", uncalculated.status, "hold");
  check(
    "and explains that the result was never saved",
    uncalculated.issues.some((issue) => issue.message.includes("never saved")),
    true,
  );

  const errorCell = normaliseRow(
    "appointments",
    { ...config, fields: { ...config.fields, client_ref: "notes" } },
    { ...upload.rows[1], notes: "#N/A" },
  );
  check("an Excel error holds the row", errorCell.status, "hold");
  check(
    "and names the error",
    errorCell.issues.some((issue) => issue.message.includes("#N/A")),
    true,
  );

  console.log(`\nrescue-xlsx: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);

}

main();
