/** Result banner for a form action. Errors are never swallowed. */
export function Notice({ state }: { state?: { error?: string; ok?: boolean; message?: string } }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p className="gm-alert-error text-sm" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p className="gm-alert-ok text-sm" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}
