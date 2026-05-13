
'use client';

import { useEffect, useState } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

interface PaddleCheckoutProps {
    priceId: string;
    userId: string;
    userEmail: string;
    customData?: any;
    onSuccess?: (data: any) => void;
    buttonText?: string;
    className?: string;
    variant?: 'default' | 'outline' | 'ghost';
    couponCode?: string;
}

import { Loader2 } from 'lucide-react';

export default function PaddleCheckout({
    priceId,
    userId,
    userEmail,
    customData = {},
    onSuccess,
    buttonText = 'Subscribe Now',
    className,
    variant = 'default',
    couponCode
}: PaddleCheckoutProps) {
    const [paddle, setPaddle] = useState<Paddle | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let currentPaddle: Paddle | undefined;
        initializePaddle({
            environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
            token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || '',
            eventCallback: (event) => {
                if (event.name === 'checkout.completed') {
                    if (onSuccess) onSuccess(event.data);

                    // Automatically close the success screen after 3.5 seconds
                    if (currentPaddle) {
                        setTimeout(() => {
                            currentPaddle?.Checkout.close();
                        }, 3500);
                    }
                }
            }
        }).then((paddleInstance) => {
            if (paddleInstance) {
                currentPaddle = paddleInstance;
                setPaddle(paddleInstance);
                setIsLoading(false);
            }
        });
    }, [onSuccess]);

    const handleCheckout = () => {
        if (!paddle) return;

        paddle.Checkout.open({
            items: [
                {
                    priceId: priceId,
                    quantity: 1
                }
            ],
            customer: {
                email: userEmail
            },
            customData: {
                userId: userId,
                ...customData
            },
            discountId: couponCode,
            settings: {
                displayMode: 'overlay',
                theme: 'dark',
                locale: 'en'
            }
        });
    };

    return (
        <button
            onClick={handleCheckout}
            disabled={isLoading || !paddle}
            className={className}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {buttonText}
        </button>
    );
}
