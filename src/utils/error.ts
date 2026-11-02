/** Normalize unknown thrown values into a displayable message. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
