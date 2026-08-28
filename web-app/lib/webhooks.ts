import { prisma } from './prisma'
import { signWebhookPayload } from './webhook-signing'
import { logger } from './logger'

export type WebhookEvent = 'scan.completed'

interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: Record<string, any>
}

const DELIVERY_TIMEOUT_MS = 10_000

// Fires a webhook to every enabled endpoint for an organization. Runs
// fire-and-forget from the caller's perspective (see triggerWebhooks) —
// a slow or failing customer endpoint should never make a scan response
// wait on it or fail because of it.
async function deliverToEndpoint(
  endpoint: { id: string; url: string; secret: string },
  payload: WebhookPayload
): Promise<void> {
  const body = JSON.stringify(payload)
  const signature = signWebhookPayload(endpoint.secret, body)

  let status: number | null = null
  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Accessibility-Navigator-Signature': signature,
        'X-Accessibility-Navigator-Event': payload.event,
      },
      body,
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
    })
    status = response.status
  } catch (error) {
    logger.warn(`Webhook delivery failed for endpoint ${endpoint.id}:`, error)
  }

  await prisma.webhookEndpoint
    .update({
      where: { id: endpoint.id },
      data: { lastDeliveryAt: new Date(), lastDeliveryStatus: status },
    })
    .catch(() => undefined)
}

// Called after a scan completes. Never awaited by the caller — delivery
// failures are logged and recorded on the endpoint, not surfaced to the
// person who ran the scan.
export function triggerWebhooks(organizationId: string, event: WebhookEvent, data: Record<string, any>): void {
  prisma.webhookEndpoint
    .findMany({ where: { organizationId, enabled: true } })
    .then(endpoints => {
      const payload: WebhookPayload = { event, timestamp: new Date().toISOString(), data }
      return Promise.all(endpoints.map(endpoint => deliverToEndpoint(endpoint, payload)))
    })
    .catch(error => logger.error('Failed to trigger webhooks:', error))
}
