import {
  parseCsv,
  parseAuDate,
  parseCsvAmount,
  detectMapping,
  extractRows,
} from "../src/lib/csv";

let pass = 0, fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; console.log(`FAIL ${name}\n  got: ${a}\n  exp: ${e}`); }
}

// Quoted fields with embedded commas + escaped quotes
check("quoted comma", parseCsv('a,"b,c",d')[0], ["a","b,c","d"]);
check("escaped quote", parseCsv('"say ""hi""",2')[0], ['say "hi"',"2"]);
check("crlf", parseCsv("a,b\r\nc,d").length, 2);
check("bom", parseCsv("﻿Date,Amount\n01/02/2026,5")[0], ["Date","Amount"]);

// AU dates
check("dd/mm/yyyy", parseAuDate("01/07/2026"), "2026-07-01");
check("d/m/yy", parseAuDate("1/7/26"), "2026-07-01");
check("iso", parseAuDate("2026-07-01"), "2026-07-01");
check("invalid 31 feb", parseAuDate("31/02/2026"), null);
check("dash sep", parseAuDate("15-03-2026"), "2026-03-15");

// Amounts
check("plain", parseCsvAmount("42.50"), 4250);
check("dollar+comma", parseCsvAmount("$1,234.56"), 123456);
check("parens negative", parseCsvAmount("(89.10)"), -8910);
check("minus", parseCsvAmount("-25"), -2500);
check("junk", parseCsvAmount("abc"), null);

// CommBank style: single amount column
const cba = parseCsv(`Date,Amount,Description
01/07/2026,-85.40,"WOOLWORTHS 1234, SYDNEY"
02/07/2026,3200.00,SALARY`);
const cbaMap = detectMapping(cba)!;
const cbaOut = extractRows(cba, cbaMap);
check("cba count", cbaOut.rows.length, 2);
check("cba row0", cbaOut.rows[0], { occurredOn: "2026-07-01", description: "WOOLWORTHS 1234, SYDNEY", amountCents: -8540 });
check("cba row1 income", cbaOut.rows[1].amountCents, 320000);

// NAB style: separate debit/credit columns
const nab = parseCsv(`Date,Narrative,Debit,Credit
03/07/2026,ORIGIN ENERGY,180.25,
04/07/2026,REFUND,,45.00`);
const nabMap = detectMapping(nab)!;
const nabOut = extractRows(nab, nabMap);
check("nab debit negative", nabOut.rows[0].amountCents, -18025);
check("nab credit positive", nabOut.rows[1].amountCents, 4500);

// Headerless
const bare = parseCsv(`05/07/2026,-12.00,COFFEE`);
const bareMap = detectMapping(bare)!;
check("headerless hasHeader", bareMap.hasHeader, false);
check("headerless row", extractRows(bare, bareMap).rows[0].amountCents, -1200);

// Bad rows are skipped, not fatal
const messy = parseCsv(`Date,Description,Amount
notadate,X,5.00
06/07/2026,Y,notanamount
07/07/2026,Z,9.99`);
const messyOut = extractRows(messy, detectMapping(messy)!);
check("messy kept", messyOut.rows.length, 1);
check("messy skipped", messyOut.skipped, 2);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
