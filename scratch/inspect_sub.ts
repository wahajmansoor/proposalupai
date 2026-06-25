import fs from 'fs';
import path from 'path';

// Parse .env file manually first
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0]?.trim();
      let value = parts.slice(1).join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      if (key) {
        process.env[key] = value;
      }
    }
  });
}

async function main() {
  const { stripe } = await import('../src/lib/stripe');

  const customerId = "cus_UlmkwcmFz6KmK5"; // jani@gmail.com
  console.log("Checking customer:", customerId);
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 1,
    });
    const sub = subscriptions.data[0];
    console.log("Keys on subscription:", Object.keys(sub));
    console.log("current_period_end value:", (sub as any).current_period_end);
    console.log("currentPeriodEnd value:", (sub as any).currentPeriodEnd);
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
