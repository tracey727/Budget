# Import Centre Specification

## Supported formats
- CSV UTF-8
- XLSX

## Initial source templates
- Appointments
- Invoices
- Payments
- Referrals
- Waitlist
- Operational tasks

## Workflow
1. Select source type.
2. Upload file.
3. System scans size/type and calculates SHA-256.
4. Parse headers and sample rows.
5. User maps fields.
6. Validate required fields and types.
7. Preview VALID / INVALID / HOLD counts.
8. User confirms import.
9. Commit valid rows.
10. Preserve validation evidence and import summary.
11. Offer rule run.

## Required safeguards
- Duplicate file warning.
- Row-level error messages.
- No silent coercion of malformed dates or currency.
- Australian date formats can be supported explicitly but must not be guessed when ambiguous.
- Timezone stored per tenant.
- Currency defaults must be explicit in tenant settings; V1 first pilot may lock to AUD.
- Formula cells from XLSX are imported as displayed/parsed values only if safely supported; otherwise HOLD.
