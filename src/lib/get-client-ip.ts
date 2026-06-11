import { headers } from 'next/headers';

// Get the client IP address from request headers
export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be a list: client, proxy1, proxy2
    return forwarded.split(',')[0].trim();
  }
  const realIp = headersList.get('x-real-ip');
  return realIp || 'unknown';
}
