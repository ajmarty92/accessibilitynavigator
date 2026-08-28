import { logger } from './logger'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

export interface SendEmailParams {
  to: { email: string; name?: string }[]
  subject: string
  html: string
  text?: string
}

export interface SendEmailResult {
  sent: boolean
  error?: string
}

// Talks to Brevo's transactional email API directly over fetch rather than
// pulling in their SDK — it's a single POST endpoint, and one fewer
// dependency to keep pinned. Never throws: a broken email integration
// should degrade to "no alert sent, logged" rather than take down whatever
// triggered it (a scan finishing, a monitor run).
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY
  const fromEmail = process.env.EMAIL_FROM_ADDRESS
  const fromName = process.env.EMAIL_FROM_NAME || 'Accessibility Navigator'

  if (!apiKey || !fromEmail) {
    logger.warn('Email not sent — BREVO_API_KEY or EMAIL_FROM_ADDRESS not configured')
    return { sent: false, error: 'Email provider not configured' }
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: params.to,
        subject: params.subject,
        htmlContent: params.html,
        textContent: params.text,
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      logger.error(`Brevo send failed (${response.status}):`, body)
      return { sent: false, error: `Email provider returned ${response.status}` }
    }

    return { sent: true }
  } catch (error) {
    logger.error('Failed to send email via Brevo:', error)
    return { sent: false, error: 'Failed to reach email provider' }
  }
}
