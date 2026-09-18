/**
 * Read models for the dashboard, the findings table and the queue.
 *
 * Two rules run through all of it. Every query is filtered by `tenant_id`, and
 * amounts are only ever summed within a single value basis, so the headline
 * numbers cannot silently mix money at risk with money already in the bank.
 */

import { and, asc, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  rrActions,
  rrAppointments,
  rrInvoices,
  rrDismissals,
  rrFindingEvidence,
  rrFindings,
  rrImportJobs,
  rrRecoveryEvents,
  rrRuleRuns,
  users,
  type RrFinding,
} from "@/lib/db/schema";
import { toCents } from "@/lib/money";
import { RULES_BY_ID } from "./rules";
import { OPEN_STATUSES } from "./runner";
import type { PriorityBand } from "./types";

const sumCents = (value: string | null | undefined) => toCents(value ?? "0");

export type DashboardSummary = {
  valueAtRiskCents: number;
  confirmedRecoveredCents: number;
  outstandingActionCents: number;
  unmatchedFundsCents: number;
  potentialValueCents: number;
  duplicateValueCents: number;
  redCount: number;
  amberCount: number;
  holdCount: number;
  openCount: number;
  unassignedCount: number;
  overdueActionCount: number;
};

export async function dashboardSummary(tenantId: string): Promise<DashboardSummary> {
  const openFilter = and(eq(rrFindings.tenantId, tenantId), inArray(rrFindings.status, OPEN_STATUSES));

  const [byBasis, recovered, inProgress, bands, actionStats] = await Promise.all([
    db()
      .select({
        basis: rrFindings.valueBasis,
        total: sql<string>`coalesce(sum(${rrFindings.estimatedValue}), 0)`,
      })
      .from(rrFindings)
      .where(and(openFilter, ne(rrFindings.priorityBand, "hold")))
      .groupBy(rrFindings.valueBasis),

    db()
      .select({ total: sql<string>`coalesce(sum(${rrRecoveryEvents.amount}), 0)` })
      .from(rrRecoveryEvents)
      .where(eq(rrRecoveryEvents.tenantId, tenantId)),

    db()
      .select({ total: sql<string>`coalesce(sum(${rrFindings.estimatedValue}), 0)` })
      .from(rrFindings)
      .where(
        and(
          eq(rrFindings.tenantId, tenantId),
          inArray(rrFindings.status, ["reviewing", "actioned"]),
          inArray(rrFindings.valueBasis, ["at_risk", "outstanding"]),
        ),
      ),

    db()
      .select({ band: rrFindings.priorityBand, count: sql<string>`count(*)` })
      .from(rrFindings)
      .where(openFilter)
      .groupBy(rrFindings.priorityBand),

    db()
      .select({
        unassigned: sql<string>`count(*) filter (where ${rrActions.id} is null or ${rrActions.assignedTo} is null)`,
        overdue: sql<string>`count(*) filter (where ${rrActions.dueAt} is not null and ${rrActions.dueAt} < now() and ${rrActions.status} <> 'done')`,
        open: sql<string>`count(*)`,
      })
      .from(rrFindings)
      .leftJoin(rrActions, eq(rrActions.findingId, rrFindings.id))
      .where(openFilter),
  ]);

  const basis = (key: string) => sumCents(byBasis.find((row) => row.basis === key)?.total);
  const band = (key: PriorityBand) => Number(bands.find((row) => row.band === key)?.count ?? 0);

  return {
    valueAtRiskCents: basis("at_risk") + basis("outstanding"),
    confirmedRecoveredCents: sumCents(recovered[0]?.total),
    outstandingActionCents: sumCents(inProgress[0]?.total),
    unmatchedFundsCents: basis("unmatched"),
    potentialValueCents: basis("potential"),
    duplicateValueCents: basis("duplicate"),
    redCount: band("red"),
    amberCount: band("amber"),
    holdCount: band("hold"),
    openCount: Number(actionStats[0]?.open ?? 0),
    unassignedCount: Number(actionStats[0]?.unassigned ?? 0),
    overdueActionCount: Number(actionStats[0]?.overdue ?? 0),
  };
}

/** Confirmed recovery by month, newest last, for the trend on the dashboard. */
export async function recoveryTrend(tenantId: string, months = 6) {
  const rows = await db()
    .select({
      month: sql<string>`to_char(date_trunc('month', ${rrRecoveryEvents.recoveryDate}), 'YYYY-MM')`,
      total: sql<string>`coalesce(sum(${rrRecoveryEvents.amount}), 0)`,
      events: sql<string>`count(*)`,
    })
    .from(rrRecoveryEvents)
    .where(eq(rrRecoveryEvents.tenantId, tenantId))
    .groupBy(sql`date_trunc('month', ${rrRecoveryEvents.recoveryDate})`)
    .orderBy(sql`date_trunc('month', ${rrRecoveryEvents.recoveryDate}) desc`)
    .limit(months);

  return rows
    .map((row) => ({ month: row.month, cents: sumCents(row.total), events: Number(row.events) }))
    .reverse();
}

export async function openFindingsByRule(tenantId: string) {
  const rows = await db()
    .select({
      ruleId: rrFindings.ruleId,
      count: sql<string>`count(*)`,
      total: sql<string>`coalesce(sum(${rrFindings.estimatedValue}) filter (where ${rrFindings.valueBasis} in ('at_risk','outstanding')), 0)`,
    })
    .from(rrFindings)
    .where(and(eq(rrFindings.tenantId, tenantId), inArray(rrFindings.status, OPEN_STATUSES)))
    .groupBy(rrFindings.ruleId)
    .orderBy(desc(sql`count(*)`));

  return rows.map((row) => ({
    ruleId: row.ruleId,
    ruleName: RULES_BY_ID[row.ruleId]?.name ?? row.ruleId,
    count: Number(row.count),
    cents: sumCents(row.total),
  }));
}

export type FindingFilters = {
  bands?: PriorityBand[];
  status?: string;
  ruleId?: string;
  assignee?: string;
  unassigned?: boolean;
  overdue?: boolean;
  minValueCents?: number;
  from?: string;
  to?: string;
  search?: string;
};

export type FindingRow = {
  finding: RrFinding;
  action: {
    id: string;
    assignedTo: string | null;
    assigneeName: string | null;
    dueAt: Date | null;
    status: string;
    nextAction: string | null;
  } | null;
  recoveredCents: number;
};

/** The findings table and the action queue are the same query, filtered. */
export async function listFindings(
  tenantId: string,
  filters: FindingFilters = {},
  limit = 200,
): Promise<FindingRow[]> {
  const conditions = [eq(rrFindings.tenantId, tenantId)];

  if (filters.bands && filters.bands.length > 0) {
    conditions.push(inArray(rrFindings.priorityBand, filters.bands));
  }
  if (filters.status && filters.status !== "all") {
    if (filters.status === "open") conditions.push(inArray(rrFindings.status, OPEN_STATUSES));
    else conditions.push(eq(rrFindings.status, filters.status));
  }
  if (filters.ruleId) conditions.push(eq(rrFindings.ruleId, filters.ruleId));
  if (filters.minValueCents && filters.minValueCents > 0) {
    conditions.push(sql`${rrFindings.estimatedValue} >= ${(filters.minValueCents / 100).toFixed(2)}`);
  }
  if (filters.from) conditions.push(sql`${rrFindings.occurredAt} >= ${filters.from}`);
  if (filters.to) conditions.push(sql`${rrFindings.occurredAt} <= ${`${filters.to} 23:59:59`}`);
  if (filters.search) {
    const pattern = `%${filters.search.toLowerCase()}%`;
    conditions.push(
      or(
        sql`lower(${rrFindings.title}) like ${pattern}`,
        sql`lower(${rrFindings.explanation}) like ${pattern}`,
        sql`lower(${rrFindings.findingKey}) like ${pattern}`,
      )!,
    );
  }
  if (filters.assignee) conditions.push(eq(rrActions.assignedTo, filters.assignee));
  if (filters.unassigned) {
    conditions.push(or(isNull(rrActions.id), isNull(rrActions.assignedTo))!);
  }
  if (filters.overdue) {
    conditions.push(sql`${rrActions.dueAt} is not null and ${rrActions.dueAt} < now() and ${rrActions.status} <> 'done'`);
  }

  const rows = await db()
    .select({
      finding: rrFindings,
      actionId: rrActions.id,
      assignedTo: rrActions.assignedTo,
      assigneeName: users.fullName,
      dueAt: rrActions.dueAt,
      actionStatus: rrActions.status,
      nextAction: rrActions.nextAction,
      recovered: sql<string>`(
        select coalesce(sum(r.amount), 0) from rr_recovery_events r where r.finding_id = ${rrFindings.id}
      )`,
    })
    .from(rrFindings)
    .leftJoin(rrActions, eq(rrActions.findingId, rrFindings.id))
    .leftJoin(users, eq(rrActions.assignedTo, users.id))
    .where(and(...conditions))
    .orderBy(
      // Red first, then the biggest money, then the oldest — the order a
      // practice manager would sort by anyway.
      sql`case ${rrFindings.priorityBand} when 'red' then 0 when 'amber' then 1 when 'green' then 2 else 3 end`,
      desc(rrFindings.priorityScore),
      asc(rrFindings.occurredAt),
    )
    .limit(limit);

  return rows.map((row) => ({
    finding: row.finding,
    action: row.actionId
      ? {
          id: row.actionId,
          assignedTo: row.assignedTo,
          assigneeName: row.assigneeName,
          dueAt: row.dueAt,
          status: row.actionStatus ?? "open",
          nextAction: row.nextAction,
        }
      : null,
    recoveredCents: sumCents(row.recovered),
  }));
}

export async function findingDetail(tenantId: string, findingId: string) {
  const rows = await db()
    .select()
    .from(rrFindings)
    .where(and(eq(rrFindings.id, findingId), eq(rrFindings.tenantId, tenantId)))
    .limit(1);

  const finding = rows[0];
  if (!finding) return null;

  const [evidence, actions, recoveries, dismissal] = await Promise.all([
    db()
      .select()
      .from(rrFindingEvidence)
      .where(eq(rrFindingEvidence.findingId, finding.id))
      .orderBy(asc(rrFindingEvidence.createdAt)),

    db()
      .select({
        action: rrActions,
        assigneeName: users.fullName,
      })
      .from(rrActions)
      .leftJoin(users, eq(rrActions.assignedTo, users.id))
      .where(and(eq(rrActions.findingId, finding.id), eq(rrActions.tenantId, tenantId))),

    db()
      .select({ event: rrRecoveryEvents, confirmedByName: users.fullName })
      .from(rrRecoveryEvents)
      .leftJoin(users, eq(rrRecoveryEvents.confirmedBy, users.id))
      .where(and(eq(rrRecoveryEvents.findingId, finding.id), eq(rrRecoveryEvents.tenantId, tenantId)))
      .orderBy(desc(rrRecoveryEvents.createdAt)),

    db()
      .select({ dismissal: rrDismissals, byName: users.fullName })
      .from(rrDismissals)
      .leftJoin(users, eq(rrDismissals.dismissedBy, users.id))
      .where(and(eq(rrDismissals.findingId, finding.id), eq(rrDismissals.tenantId, tenantId)))
      .orderBy(desc(rrDismissals.createdAt))
      .limit(1),
  ]);

  const recoveredCents = recoveries.reduce((total, row) => total + toCents(row.event.amount), 0);

  return {
    finding,
    rule: RULES_BY_ID[finding.ruleId] ?? null,
    evidence,
    action: actions[0] ?? null,
    recoveries,
    recoveredCents,
    dismissal: dismissal[0] ?? null,
  };
}

export async function recentImports(tenantId: string, limit = 25) {
  return db()
    .select()
    .from(rrImportJobs)
    .where(eq(rrImportJobs.tenantId, tenantId))
    .orderBy(desc(rrImportJobs.createdAt))
    .limit(limit);
}

export async function lastRuleRun(tenantId: string) {
  const rows = await db()
    .select()
    .from(rrRuleRuns)
    .where(eq(rrRuleRuns.tenantId, tenantId))
    .orderBy(desc(rrRuleRuns.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Whether there is anything to detect on yet.
 *
 * It counts canonical records rather than import jobs, because the
 * demonstration workspace is seeded directly and would otherwise look empty.
 */
export async function hasOperationalData(tenantId: string): Promise<boolean> {
  const [appointments, invoices] = await Promise.all([
    db()
      .select({ count: sql<string>`count(*)` })
      .from(rrAppointments)
      .where(eq(rrAppointments.tenantId, tenantId)),
    db()
      .select({ count: sql<string>`count(*)` })
      .from(rrInvoices)
      .where(eq(rrInvoices.tenantId, tenantId)),
  ]);
  return Number(appointments[0]?.count ?? 0) + Number(invoices[0]?.count ?? 0) > 0;
}
