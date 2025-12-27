import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { processMessage, getFallbackResponse } from '@/lib/agent';
import { createOrder, calculateDiscount, createApprovalRequest } from '@/lib/agent/tools';
import type { ChatMessage, Product, Settings, Order } from '@/lib/types';
import { db, products as productsTable } from '@/lib/db';

// Default settings for AI
const defaultSettings: Settings = {
    storeName: 'AI Store',
    storeDescription: 'Your smart shopping destination',
    currency: 'BDT',
    ownerEmail: '',
    ai: {
        provider: 'google',
        apiKey: process.env.GOOGLE_AI_API_KEY || '',
        model: 'gemini-1.5-flash',
        maxDiscountPercent: 15,
    },
    payments: {
        cashOnDelivery: { enabled: true },
        stripe: { enabled: false, publicKey: '', secretKey: '' },
        paypal: { enabled: false, clientId: '', clientSecret: '', mode: 'sandbox' },
        bkash: { enabled: false, appKey: '', appSecret: '', username: '', password: '', mode: 'sandbox' },
    },
    courier: {
        pathao: { enabled: false, clientId: '', clientSecret: '', username: '', password: '' },
        steadfast: { enabled: false, apiKey: '', secretKey: '' },
        manual: { enabled: true },
    },
    notifications: {
        emailNotifications: false,
        soundAlerts: true,
    },
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, conversationHistory = [] } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Load products from database
        let products: Product[] = [];
        try {
            products = await db.select().from(productsTable) as Product[];
        } catch (error) {
            console.error('Error fetching products:', error);
        }

        // Use default settings with env API key
        const settings = {
            ...defaultSettings,
            ai: {
                ...defaultSettings.ai,
                apiKey: process.env.GOOGLE_AI_API_KEY || '',
            }
        };

        // Process message
        let response;

        if (settings.ai.apiKey) {
            // Use AI agent
            response = await processMessage(
                message,
                conversationHistory as ChatMessage[],
                settings,
                products
            );
        } else {
            // Use fallback
            response = {
                message: getFallbackResponse(message, products)
            };
        }

        // Handle system actions
        if (response.action) {
            switch (response.action.type) {
                case 'create_order': {
                    const { productId, quantity, discountPercent } = response.action.data;
                    const product = products.find(p => p.id === productId);

                    if (product) {
                        const finalPrice = calculateDiscount(product.price, discountPercent as number);
                        const order = createOrder([{
                            productId: productId as string,
                            productName: product.name,
                            quantity: quantity as number,
                            originalPrice: product.price,
                            finalPrice,
                            discountPercent: discountPercent as number
                        }]);

                        // Save order
                        const ordersData = readJsonFile<{ orders: Order[] }>('orders.json');
                        ordersData.orders.push(order);
                        writeJsonFile('orders.json', ordersData);

                        // Create approval request
                        const approval = createApprovalRequest(order, 'deal');

                        return NextResponse.json({
                            message: response.message,
                            order,
                            approval,
                            awaitingApproval: true
                        });
                    }
                    break;
                }

                case 'save_customer_info': {
                    const { name, phone, address, city } = response.action.data;
                    return NextResponse.json({
                        message: response.message,
                        customerInfo: { name, phone, address, city }
                    });
                }
            }
        }

        // Create response message
        const assistantMessage: ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: response.message,
            timestamp: new Date().toISOString()
        };

        return NextResponse.json({
            message: assistantMessage.content,
            messageId: assistantMessage.id
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json(
            { error: 'Failed to process message' },
            { status: 500 }
        );
    }
}
