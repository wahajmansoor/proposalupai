
'use server';

type IpApiResponse = {
  status: 'success' | 'fail';
  country: string;
  countryCode: string;
  message?: string;
};

export async function getCountryFromIp(ip: string | null): Promise<{ code: string; name: string } | null> {
  if (!ip || ip === '::1' || ip.startsWith('127.')) {
    // For local development, return a default or null
    return { code: 'US', name: 'United States' }; // Or return null
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode`);
    if (!response.ok) {
        throw new Error(`Failed to fetch IP data. Status: ${response.status}`);
    }
    
    const data: IpApiResponse = await response.json();

    if (data.status === 'success' && data.country && data.countryCode) {
      return { code: data.countryCode, name: data.country };
    } else {
      console.warn(`Could not determine country for IP ${ip}. Reason: ${data.message || 'Unknown'}`);
      return null;
    }
  } catch (error: any) {
    console.error(`Error fetching country from IP ${ip}:`, error.message);
    return null;
  }
}
