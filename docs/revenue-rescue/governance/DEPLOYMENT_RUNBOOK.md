# Deployment Runbook

## Environments
- Local
- Preview
- Production

## Preview flow
1. Branch push.
2. GitHub Actions required checks.
3. Deploy preview Worker/web app.
4. Run smoke tests.
5. Review PR.

## Production flow
1. Merge protected PR to main after GREEN checks.
2. Apply validated migrations using controlled process.
3. Deploy application/API.
4. Verify health endpoint.
5. Run production smoke tests using non-sensitive test tenant.
6. Confirm no critical errors.

## Rollback
- Revert application to last known-good release.
- Database migrations require forward-safe/rollback plan before execution.
- Never restore one tenant over another.

## Release evidence
Record exact commit SHA, CI run, migration version, deployment identifier and smoke-test result.
