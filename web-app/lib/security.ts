import dns from 'node:dns/promises'
import net from 'node:net'

/**
 * Checks if an IP address falls within private or reserved ranges.
 * Supports both IPv4 and IPv6, including IPv4-mapped IPv6 addresses.
 */
function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isPrivateIPv4(ip)
  } else if (net.isIPv6(ip)) {
    // IPv6 private ranges
    // fc00::/7 (Unique Local)
    // fe80::/10 (Link-local)
    // ::1 (Loopback)
    // :: (Unspecified)

    const lowerIP = ip.toLowerCase()

    // Check for IPv4-mapped IPv6 addresses (::ffff:1.2.3.4)
    if (lowerIP.startsWith('::ffff:')) {
      const remainder = lowerIP.substring(7)

      // If the remainder is a valid IPv4 address (e.g. ::ffff:127.0.0.1)
      if (net.isIPv4(remainder)) {
        return isPrivateIPv4(remainder)
      }

      // If the remainder is in hex format (e.g. ::ffff:7f00:1)
      const hexParts = remainder.split(':')
      if (hexParts.length === 2) {
        // Parse hex parts
        const high = parseInt(hexParts[0], 16)
        const low = parseInt(hexParts[1], 16)

        if (!isNaN(high) && !isNaN(low)) {
          // Construct IPv4 string from hex
          // high: first 2 bytes, low: last 2 bytes
          const b1 = (high >> 8) & 0xff
          const b2 = high & 0xff
          const b3 = (low >> 8) & 0xff
          const b4 = low & 0xff

          const ipv4 = `${b1}.${b2}.${b3}.${b4}`
          return isPrivateIPv4(ipv4)
        }
      }
    }

    // Check for ::1
    if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true

    // Check for ::
    if (ip === '::' || ip === '0:0:0:0:0:0:0:0') return true

    // fc00::/7 => fc00... to fdff...
    if (lowerIP.startsWith('fc') || lowerIP.startsWith('fd')) return true

    // fe80::/10 => fe80... to febf...
    // fe8, fe9, fea, feb
    if (lowerIP.startsWith('fe8') || lowerIP.startsWith('fe9') || lowerIP.startsWith('fea') || lowerIP.startsWith('feb')) return true

    return false
  }

  return false
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4) return false

  // 10.0.0.0/8
  if (parts[0] === 10) return true

  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true

  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true

  // 169.254.0.0/16 (Link-local)
  if (parts[0] === 169 && parts[1] === 254) return true

  // 0.0.0.0/8 (Current network)
  if (parts[0] === 0) return true

  return false
}

export async function validateUrl(url: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const urlObj = new URL(url)

    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, reason: 'Invalid protocol. Only HTTP and HTTPS are allowed.' }
    }

    let hostname = urlObj.hostname

    // Handle IPv6 bracket stripping for IP validation
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      hostname = hostname.slice(1, -1)
    }

    // Check if hostname is an IP address
    if (net.isIP(hostname)) {
      if (isPrivateIP(hostname)) {
        return { valid: false, reason: 'Access to private IP addresses is restricted.' }
      }
      return { valid: true }
    }

    // Resolve hostname
    try {
      const { address } = await dns.lookup(hostname)

      if (isPrivateIP(address)) {
        return { valid: false, reason: 'Access to local network resources is restricted.' }
      }
    } catch (dnsError) {
      // If we can't resolve it, it might be an internal name or just invalid.
      // Failing closed is safer for SSRF, but might block valid sites if DNS is flaky.
      // However, usually if it doesn't resolve, we can't scan it anyway.
      return { valid: false, reason: 'Could not resolve hostname.' }
    }

    return { valid: true }

  } catch (error) {
    return { valid: false, reason: 'Invalid URL format.' }
  }
}
