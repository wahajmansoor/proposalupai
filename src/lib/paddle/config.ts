import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { PADDLE_PRICES, CREDIT_AMOUNTS } from './constants';

if (typeof window !== 'undefined') {
  throw new Error('Paddle Node SDK cannot be used on the client side.');
}

if (!process.env.PADDLE_API_KEY) {
  throw new Error('PADDLE_API_KEY environment variable is not set.');
}

export const paddle = new Paddle(process.env.PADDLE_API_KEY, {
  environment: process.env.NODE_ENV === 'production'
    ? Environment.production
    : Environment.sandbox,
});

export { PADDLE_PRICES, CREDIT_AMOUNTS };

