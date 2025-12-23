import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { processMessage, getFallbackResponse } from '@/lib/agent';
import { createOrder, calculateDiscount, createApprovalRequest } from '@/lib/agent/tools';
import type { ChatMessage, Product, Settings, Order } from '@/lib/types';
import fs from 'fs';
import path from 'path';

// Helper to read JSON files
function readJsonFile<T>(filename: string): T {
    const filePath = path.join(process.cwd(), 'src', 'data', filename);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

// Helper to write JSON files
function writeJsonFile(filename: string, data: unknown): void {
    const filePath = path.join(process.cwd(), 'src', 'data', filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, conversationHistory = [] } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Load data
        const settings = readJsonFile<Settings>('settings.json');
        const productsData = readJsonFile<{ products: Product[] }>('products.json');
        const products = productsData.products;

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
