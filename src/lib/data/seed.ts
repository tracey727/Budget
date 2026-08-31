import { db } from "@/lib/db";
import { accounts, categories } from "@/lib/db/schema";

/**
 * Default categories tuned to Australian household spending — the names match
 * how people actually describe their bills here (rego, Medicare, strata).
 */
/**
 * Default categories for a travelling budget, using the words Australian
 * travellers actually use — rego, diesel, park fees, dump points, van repairs —
 * alongside the household costs that keep running while you are away.
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
  { name: "Pension & government payments", kind: "income", bucket: "income", colour: "#65a30d" },
  { name: "Business income", kind: "income", bucket: "income", colour: "#0891b2", gstApplicable: true },
  { name: "Interest & dividends", kind: "income", bucket: "income", colour: "#16a34a" },
  { name: "Rent from home", kind: "income", bucket: "income", colour: "#22c55e" },

  // On the road
  { name: "Fuel & diesel", kind: "expense", bucket: "travel", colour: "#dc2626" },
  { name: "Caravan parks & camping", kind: "expense", bucket: "travel", colour: "#ea580c" },
  { name: "National park fees & permits", kind: "expense", bucket: "travel", colour: "#d97706" },
  { name: "Tolls & ferries", kind: "expense", bucket: "travel", colour: "#b45309" },
  { name: "Vehicle & van servicing", kind: "expense", bucket: "travel", colour: "#0f766e" },
  { name: "Vehicle & van repairs", kind: "expense", bucket: "travel", colour: "#0d9488" },
  { name: "Tyres & spares", kind: "expense", bucket: "travel", colour: "#14b8a6" },
  { name: "Gas bottles & water", kind: "expense", bucket: "travel", colour: "#0284c7" },
  { name: "Laundry & dump points", kind: "expense", bucket: "travel", colour: "#0369a1" },
  { name: "Attractions & tours", kind: "expense", bucket: "travel", colour: "#06b6d4" },

  // Everyday, wherever you are
  { name: "Groceries", kind: "expense", bucket: "essentials", colour: "#f59e0b" },
  { name: "Eating out & takeaway", kind: "expense", bucket: "lifestyle", colour: "#fbbf24" },
  { name: "Health & Medicare", kind: "expense", bucket: "essentials", colour: "#db2777" },
  { name: "Insurance (vehicle, van, travel)", kind: "expense", bucket: "essentials", colour: "#4f46e5" },
  { name: "Car & van registration", kind: "expense", bucket: "essentials", colour: "#6366f1" },
  { name: "Phone, internet & satellite", kind: "expense", bucket: "essentials", colour: "#7c3aed" },
  { name: "Roadside assistance & memberships", kind: "expense", bucket: "essentials", colour: "#8b5cf6" },

  // Still running at home
  { name: "Rent or mortgage", kind: "expense", bucket: "essentials", colour: "#be123c" },
  { name: "Home utilities & rates", kind: "expense", bucket: "essentials", colour: "#9f1239" },
  { name: "Storage & house sitting", kind: "expense", bucket: "essentials", colour: "#a21caf" },

  { name: "Shopping & clothing", kind: "expense", bucket: "lifestyle", colour: "#c026d3" },
  { name: "Subscriptions", kind: "expense", bucket: "lifestyle", colour: "#ec4899" },
  { name: "Gifts & donations", kind: "expense", bucket: "lifestyle", colour: "#f43f5e" },

  { name: "Savings transfer", kind: "expense", bucket: "savings", colour: "#10b981" },
  { name: "Next trip fund", kind: "expense", bucket: "savings", colour: "#34d399" },

  { name: "Business expenses", kind: "expense", bucket: "business", colour: "#475569", gstApplicable: true, isDeductible: true },
  { name: "Tools & equipment", kind: "expense", bucket: "business", colour: "#64748b", gstApplicable: true, isDeductible: true },
  { name: "Accounting & fees", kind: "expense", bucket: "business", colour: "#94a3b8", gstApplicable: true, isDeductible: true },

  { name: "Other", kind: "expense", bucket: "lifestyle", colour: "#a1a1aa" },
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
