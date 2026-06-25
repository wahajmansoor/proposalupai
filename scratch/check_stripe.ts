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
  // Dynamically import stripe after process.env is set
  const { stripe } = await import('../src/lib/stripe');

  const customerId = "cus_UlmGHAv3mhrSvu"; // ali@gmail.com
  console.log("Checking customer:", customerId);
  try {
    const customer = await stripe.customers.retrieve(customerId);
    console.log("Customer details:", JSON.stringify(customer, null, 2));

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
    });
    console.log("Subscriptions list:", JSON.stringify(subscriptions.data, null, 2));
  } catch (error) {
    console.error("Error fetching from Stripe:", error);
  }
}

main().catch(console.error);
