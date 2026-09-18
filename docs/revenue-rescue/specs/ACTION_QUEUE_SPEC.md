# Action Queue Specification

## Purpose
Turn findings into controlled work rather than passive reporting.

## Required columns
- Priority band
- Finding
- Estimated value / unmatched value
- Confidence
- Age
- Assigned owner
- Due date
- Status
- Rule ID

## Filters
- RED / AMBER / GREEN / HOLD
- Unassigned
- Overdue
- Rule
- Assignee
- Status
- Date range
- Minimum value

## Finding detail
Must show:
- Plain-language explanation
- What rule fired
- Rule version
- Source evidence
- Calculation
- Why the priority was assigned
- Action history
- Recovery history
- Audit references

## Actions
- Assign
- Set due date
- Add next action
- Mark actioned
- Resolve
- Put on HOLD
- Dismiss with mandatory reason
- Record recovery

## Zero-chase management view
Managers should be able to see only exceptions: overdue RED/AMBER, unassigned high-value findings and HOLD items requiring data correction.
