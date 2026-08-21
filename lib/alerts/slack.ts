/**
 * A shout when the guide can't file a case.
 *
 * The Stopgap key rotation went unnoticed for hours because nothing was
 * watching: the failure was in the logs and nowhere else. This posts to the
 * same Slack webhook the analytics dashboard uses. Optional by design — with
 * no webhook configured it does nothing, and the handover email still gets the
 * case to a human.
 */

export const slackConfigured = (): boolean =>
  Boolean(process.env.SLACK_WEBHOOK_URL);

export async function alertSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      cache: "no-store",
    });
  } catch (e) {
    // Never let the alert channel become the thing that breaks the request.
    console.error("[alert] slack failed:", e instanceof Error ? e.message : e);
  }
}
