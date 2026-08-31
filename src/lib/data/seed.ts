import { db } from "@/lib/db";
import { accounts, categories } from "@/lib/db/schema";

/**
 * Default categories tuned to Australian household spending — the names match
 * how people actually describe their bills here (rego, Medicare, strata).
 */
const DEFAULT_CATEGORIES: Array<{
  name: string;
  kind: "income" | "expense";
  bucket: string;
  colour: string;
  gstApplicable?: boolean;
  isDeductible?: boolean;
}> = [
  { name: "Salary & wages", kind: "income", bucket: "income", colour: "#059669" },
  { name: "Business income", kind: "income", bucket: "income", colour: "#0891b2", gstApplicable: true },
  { name: "Government payments", kind: "income", bucket: "income", colour: "#65a30d" },
  { name: "Interest & dividends", kind: "income", bucket: "income", colour: "#16a34a" },

  { name: "Rent or mortgage", kind: "expense", bucket: "essentials", colour: "#dc2626" },
  { name: "Groceries", kind: "expense", bucket: "essentials", colour: "#ea580c" },
  { name: "Electricity & gas", kind: "expense", bucket: "essentials", colour: "#d97706" },
  { name: "Water & council rates", kind: "expense", bucket: "essentials", colour: "#0284c7" },
  { name: "Internet & mobile", kind: "expense", bucket: "essentials", colour: "#7c3aed" },
  { name: "Insurance", kind: "expense", bucket: "essentials", colour: "#4f46e5" },
  { name: "Health & Medicare", kind: "expense", bucket: "essentials", colour: "#db2777" },
  { name: "Transport & fuel", kind: "expense", bucket: "essentials", colour: "#0d9488" },
  { name: "Car rego & servicing", kind: "expense", bucket: "essentials", colour: "#0f766e" },
  { name: "Childcare & school", kind: "expense", bucket: "essentials", colour: "#c026d3" },

  { name: "Eating out & takeaway", kind: "expense", bucket: "lifestyle", colour: "#f59e0b" },
  { name: "Shopping & clothing", kind: "expense", bucket: "lifestyle", colour: "#8b5cf6" },
  { name: "Entertainment", kind: "expense", bucket: "lifestyle", colour: "#ec4899" },
  { name: "Subscriptions", kind: "expense", bucket: "lifestyle", colour: "#6366f1" },
  { name: "Travel & holidays", kind: "expense", bucket: "lifestyle", colour: "#06b6d4" },
  { name: "Fitness & sport", kind: "expense", bucket: "lifestyle", colour: "#22c55e" },
  { name: "Gifts & donations", kind: "expense", bucket: "lifestyle", colour: "#f43f5e" },

  { name: "Savings transfer", kind: "expense", bucket: "savings", colour: "#10b981" },
  { name: "Extra loan repayment", kind: "expense", bucket: "savings", colour: "#14b8a6" },

  { name: "Business expenses", kind: "expense", bucket: "business", colour: "#475569", gstApplicable: true, isDeductible: true },
  { name: "Tools & equipment", kind: "expense", bucket: "business", colour: "#64748b", gstApplicable: true, isDeductible: true },
  { name: "Accounting & fees", kind: "expense", bucket: "business", colour: "#94a3b8", gstApplicable: true, isDeductible: true },

  { name: "Other", kind: "expense", bucket: "lifestyle", colour: "#94a3b8" },
];

/** Runs once at sign-up so a new account is immediately usable. */
export async function seedStarterData(userId: string): Promise<void> {
  await db()
    .insert(categories)
    .values(
      DEFAULT_CATEGORIES.map((category, index) => ({
        userId,
        name: category.name,
        kind: category.kind,
        bucket: category.bucket,
        colour: category.colour,
        gstApplicable: category.gstApplicable ?? false,
        isDeductible: category.isDeductible ?? false,
        sortOrder: index,
      })),
    )
    .onConflictDoNothing();

  await db()
    .insert(accounts)
    .values({
      userId,
      name: "Everyday account",
      type: "transaction",
      openingBalance: "0",
    })
    .onConflictDoNothing();
}
