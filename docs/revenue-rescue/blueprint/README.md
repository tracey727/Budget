# ON TRACK Revenue Rescue™ — Blueprint Pack

Version: 1.0  
Date: 18 September 2026  
Owner: ON TRACK by TRACE  
Product: ON TRACK Revenue Rescue™

## Purpose
Revenue Rescue is a business-operations leakage detection and action system. It helps a business identify money and work at risk of falling through operational gaps, prioritise corrective action, and record confirmed recovery.

## V1 promise
**Upload operational exports. Find preventable leakage. Show what needs action. Track what was recovered.**

## V1 product boundary
V1 is intentionally small and fast to build:
- CSV and XLSX upload only.
- No direct bank connection.
- No autonomous financial decisions.
- No automatic charging, refunds, write-offs, clinical decisions, dispensing decisions, or accounting journal entries.
- All findings are explainable and reviewable by a human.
- UNKNOWN/HOLD is used when input data is incomplete, contradictory, or unsupported.
- Cloudflare + Neon + GitHub only for core hosting, database and source control.

## First target market
Initial commercial focus: psychology, allied health and NDIS service businesses. The same detection engine can later be adapted for pharmacy, dental, service stations, trades and other service businesses.

## Build order
Start at Phase 0 and progress strictly in order. Every phase has an exact Git branch name and a GREEN gate. Do not skip phases or merge a phase with failing required checks.

See `MASTER_BLUEPRINT.md` and `governance/PHASE_REGISTER.json`.
