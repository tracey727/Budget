/** Automatic categorisation: the person's own rules, then the built-in hints. */

import {
  applyRules,
  suggestCategoryName,
  suggestPattern,
  type Rule,
} from "../src/lib/bank/rules";

let pass = 0, fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; } else { fail++; console.log(`FAIL ${name}\n  got: ${a}\n  exp: ${e}`); }
}

function rule(over: Partial<Rule> = {}): Rule {
  return {
    id: "rule-1",
    pattern: "woolworths",
    matchType: "contains",
    categoryId: "cat-groceries",
    renameTo: null,
    markBusiness: false,
    priority: 100,
    ...over,
  };
}

const woolies = { description: "WOOLWORTHS 1234 SYDNEY", merchant: "Woolworths", amountCents: -8940 };

check("contains matches case-insensitively", applyRules([rule()], woolies)?.categoryId, "cat-groceries");
check("no rule means no outcome", applyRules([rule({ pattern: "coles" })], woolies), null);

check(
  "starts_with is anchored",
  applyRules([rule({ matchType: "starts_with", pattern: "sydney" })], woolies),
  null,
);
check(
  "starts_with matches from the front",
  applyRules([rule({ matchType: "starts_with", pattern: "woolworths" })], woolies)?.categoryId,
  "cat-groceries",
);
check(
  "equals needs the whole string",
  applyRules([rule({ matchType: "equals", pattern: "woolworths" })], woolies)?.categoryId,
  "cat-groceries",
);

check(
  "the merchant field is searched too",
  applyRules(
    [rule({ pattern: "woolworths" })],
    { description: "EFTPOS PURCHASE 4417", merchant: "Woolworths", amountCents: -100 },
  )?.categoryId,
  "cat-groceries",
);

check(
  "lower priority wins",
  applyRules(
    [
      rule({ id: "late", pattern: "woolworths", categoryId: "cat-late", priority: 200 }),
      rule({ id: "early", pattern: "woolworths", categoryId: "cat-early", priority: 10 }),
    ],
    woolies,
  )?.categoryId,
  "cat-early",
);

check(
  "renameTo replaces the bank's text",
  applyRules([rule({ renameTo: "Groceries — Woolworths" })], woolies)?.description,
  "Groceries — Woolworths",
);
check(
  "an empty renameTo leaves the text alone",
  applyRules([rule({ renameTo: "   " })], woolies)?.description,
  "WOOLWORTHS 1234 SYDNEY",
);
check(
  "an empty pattern never matches anything",
  applyRules([rule({ pattern: "  " })], woolies),
  null,
);

/* --------------------------- built-in hints ----------------------------- */

check("groceries hint", suggestCategoryName(woolies), "Groceries");
check(
  "fuel hint",
  suggestCategoryName({ description: "AMPOL FOODARY ALEXANDRIA", amountCents: -7215 }),
  "Transport & fuel",
);
check(
  "subscription hint",
  suggestCategoryName({ description: "NETFLIX.COM", amountCents: -1899 }),
  "Subscriptions",
);
check(
  "income hint",
  suggestCategoryName({ description: "SALARY PAYMENT", amountCents: 342680 }),
  "Salary & wages",
);
check(
  "an income category is never applied to money going out",
  suggestCategoryName({ description: "SALARY SACRIFICE", amountCents: -20000 }),
  null,
);
check("unknown merchants get no guess", suggestCategoryName({ description: "ZZQ 4417", amountCents: -500 }), null);

/* ------------------------- suggesting a pattern ------------------------- */

check("pattern from a bank description", suggestPattern("WOOLWORTHS 1234 SYDNEY"), "WOOLWORTHS SYDNEY");
check("pattern ignores digits and symbols", suggestPattern("SQ *COFFEE ANTHOLOGY"), "COFFEE ANTHOLOGY");
check("pattern from unusable text", suggestPattern("12 34"), null);

console.log(`\nrules: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
