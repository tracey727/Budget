/**
 * Automatic categorisation.
 *
 * A linked account produces a few hundred rows a month, which is more than
 * anyone will hand-sort. Rules turn the bank's raw text into a category, an
 * optional tidy name, and a business flag, and run on CSV imports too so both
 * paths behave the same way.
 *
 * Pure by design: the caller loads the rules and writes the results.
 */

export type Rule = {
  id: string;
  pattern: string;
  matchType: string;
  categoryId: string;
  renameTo: string | null;
  markBusiness: boolean;
  priority: number;
};

export type Categorisable = {
  description: string;
  merchant?: string | null;
  amountCents: number;
};

export type RuleOutcome = {
  ruleId: string;
  categoryId: string;
  description: string;
  markBusiness: boolean;
};

function matches(rule: Rule, haystack: string): boolean {
  const needle = rule.pattern.trim().toLowerCase();
  if (needle === "") return false;
  switch (rule.matchType) {
    case "equals":
      return haystack === needle;
    case "starts_with":
      return haystack.startsWith(needle);
    default:
      return haystack.includes(needle);
  }
}

/**
 * The first rule that matches, in priority order, wins. Description and
 * merchant are both searched because banks put the useful part in either.
 */
export function applyRules(
  rules: Rule[],
  transaction: Categorisable,
): RuleOutcome | null {
  const description = transaction.description.toLowerCase();
  const merchant = (transaction.merchant ?? "").toLowerCase();

  const ordered = [...rules].sort(
    (a, b) => a.priority - b.priority || a.pattern.localeCompare(b.pattern),
  );

  for (const rule of ordered) {
    if (matches(rule, description) || (merchant && matches(rule, merchant))) {
      return {
        ruleId: rule.id,
        categoryId: rule.categoryId,
        description: rule.renameTo?.trim() || transaction.description,
        markBusiness: rule.markBusiness,
      };
    }
  }

  return null;
}

/**
 * Fallback categories for common Australian merchants, used when a person has
 * written no rule of their own. Matched against the seeded category names, so
 * a missing category simply means no suggestion rather than an error.
 */
const MERCHANT_HINTS: Array<{ tokens: string[]; category: string }> = [
  { tokens: ["woolworths", "coles", "aldi", "iga", "foodworks", "harris farm"], category: "Groceries" },
  { tokens: ["ampol", "bp ", "caltex", "7-eleven", "united petroleum", "shell"], category: "Transport & fuel" },
  { tokens: ["opal", "translink", "myki", "uber", "didi", "ola", "13cabs"], category: "Transport & fuel" },
  { tokens: ["netflix", "spotify", "stan", "binge", "disney", "kayo", "apple.com/bill"], category: "Subscriptions" },
  { tokens: ["origin energy", "agl", "energyaustralia", "red energy", "alinta"], category: "Electricity & gas" },
  { tokens: ["telstra", "optus", "vodafone", "tpg", "aussie broadband", "belong"], category: "Internet & mobile" },
  { tokens: ["chemist warehouse", "priceline", "medicare", "bupa", "medibank", "nib"], category: "Health & Medicare" },
  { tokens: ["bunnings", "kmart", "big w", "target", "officeworks", "jb hi-fi"], category: "Shopping & clothing" },
  { tokens: ["mcdonald", "kfc", "domino", "guzman", "grill", "menulog", "doordash", "deliveroo", "uber eats", "coffee", "cafe"], category: "Eating out & takeaway" },
  { tokens: ["salary", "payroll", "wages", "pay run"], category: "Salary & wages" },
  { tokens: ["rent payment", "real estate", "strata"], category: "Rent or mortgage" },
  { tokens: ["transfer to savings", "savings transfer"], category: "Savings transfer" },
  { tokens: ["gym", "fitness first", "anytime fitness", "goodlife", "f45"], category: "Fitness & sport" },
  { tokens: ["insurance", "nrma", "aami", "racq", "allianz", "youi"], category: "Insurance" },
  { tokens: ["council", "water corp", "sydney water", "unitywater"], category: "Water & council rates" },
];

/**
 * Best-guess category name for a transaction with no matching rule.
 * Returns a category *name*; the caller maps it to the person's own category.
 */
export function suggestCategoryName(
  transaction: Categorisable,
): string | null {
  const haystack = `${transaction.description} ${transaction.merchant ?? ""}`.toLowerCase();
  for (const hint of MERCHANT_HINTS) {
    if (hint.tokens.some((token) => haystack.includes(token))) {
      // An income category cannot describe money leaving the account.
      if (transaction.amountCents < 0 && hint.category === "Salary & wages") continue;
      return hint.category;
    }
  }
  return null;
}

/**
 * Suggests a rule from a transaction the person has just categorised by hand —
 * "you filed WOOLWORTHS 1234 SYDNEY under Groceries, do that from now on?"
 * Takes the longest run of letters, which is almost always the trading name.
 */
export function suggestPattern(description: string): string | null {
  const words = description
    .toUpperCase()
    .replace(/[^A-Z ]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
  if (words.length === 0) return null;
  const best = words.slice(0, 2).join(" ").trim();
  return best.length >= 3 ? best : null;
}
