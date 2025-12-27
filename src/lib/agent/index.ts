import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSystemPrompt, getConversationContext } from './prompts';
import { searchCatalog, formatProductCard, formatPrice } from './tools';
import type { Product, ChatMessage, Settings, Order } from '../types';

interface AgentResponse {
    message: string;
    action?: {
        type: 'create_order' | 'save_customer_info' | 'request_payment';
        data: Record<string, string | number>;
    };
}

export async function processMessage(
    userMessage: string,
    conversationHistory: ChatMessage[],
    settings: Settings,
    products: Product[],
    currentOrder?: Order
): Promise<AgentResponse> {
    // Check if AI is configured
    if (!settings.ai.apiKey) {
        return {
            message: "Welcome to our store! 👋 I'm here to help you find the perfect products. What are you looking for today?"
        };
    }

    const genAI = new GoogleGenerativeAI(settings.ai.apiKey);
    const model = genAI.getGenerativeModel({
        model: settings.ai.model || 'gemini-1.5-flash',
        systemInstruction: getSystemPrompt(settings, products)
    });

    // Build conversation history for Gemini
    const history = conversationHistory
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

    try {
        const chat = model.startChat({
            history: history as any,
            generationConfig: {
                maxOutputTokens: 1024,
            },
        });

        const result = await chat.sendMessage(userMessage);
        const assistantMessage = result.response.text();

        // Parse for system actions
        const action = parseSystemAction(assistantMessage);

        // Clean message (remove system action strings)
        const cleanMessage = assistantMessage
            .replace(/SYSTEM_ACTION:[^\s]*/g, '')
            .trim();

        return {
            message: cleanMessage,
            action
        };
    } catch (error) {
        console.error('AI Error:', error);
        return {
            message: "I apologize, I'm having a moment. Could you please repeat that?"
        };
    }
}

function parseSystemAction(message: string): AgentResponse['action'] | undefined {
    // Match CREATE_ORDER action
    const orderMatch = message.match(/SYSTEM_ACTION:CREATE_ORDER:([^:]+):(\d+):(\d+)/);
    if (orderMatch) {
        return {
            type: 'create_order',
            data: {
                productId: orderMatch[1],
                quantity: parseInt(orderMatch[2]),
                discountPercent: parseInt(orderMatch[3])
            }
        };
    }

    // Match SAVE_CUSTOMER_INFO action
    const infoMatch = message.match(/SYSTEM_ACTION:SAVE_CUSTOMER_INFO:([^|]+)\|([^|]+)\|([^|]+)\|([^\s]+)/);
    if (infoMatch) {
        return {
            type: 'save_customer_info',
            data: {
                name: infoMatch[1],
                phone: infoMatch[2],
                address: infoMatch[3],
                city: infoMatch[4]
            }
        };
    }

    return undefined;
}

// Fallback responses when AI is not configured
export function getFallbackResponse(userMessage: string, products: Product[]): string {
    const lower = userMessage.toLowerCase();

    // Product inquiry
    if (lower.includes('product') || lower.includes('what do you have') || lower.includes('show')) {
        const productList = products.slice(0, 3).map(p => formatProductCard(p)).join('\n\n');
        return `Here are some of our popular products:\n\n${productList}\n\nWould you like to know more about any of these?`;
    }

    // Price inquiry
    if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
        const searchResults = searchCatalog(userMessage, products);
        if (searchResults.length > 0) {
            const product = searchResults[0];
            return `**${product.name}** is priced at ${formatPrice(product.price)}. Would you like to purchase it?`;
        }
        return "Which product's price would you like to know?";
    }

    // Buy intent
    if (lower.includes('buy') || lower.includes('purchase') || lower.includes('order') || lower.includes('want')) {
        return "Great choice! 🛒 To place an order, please tell me which product you'd like and I'll prepare it for you.";
    }

    // Greeting
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        return "Hello! 👋 Welcome to our store! How can I help you today? Feel free to ask about our products or browse our catalog.";
    }

    // Default
    return "I'm here to help you find the perfect product! You can ask me about our products, prices, or place an order. What would you like to know?";
}

