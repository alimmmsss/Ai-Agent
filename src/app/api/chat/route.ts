import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, FunctionCallingMode } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import {
    agentTools,
    executeInventoryCheck,
    executeCreateInvoice,
    executeNegotiatePrice,
    executeSavePreference,
    getOrCreateSession,
    saveSessionMessages
} from '@/lib/agent/functions';
import { db, products as productsTable } from '@/lib/db';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

// System prompt for the AI agent
const SYSTEM_PROMPT = `You are an AI Sales Assistant for an e-commerce store. Your job is to:

1. **Help customers find products** - Use the inventory_check function to search and display products
2. **Negotiate prices** - Use negotiate_price to offer discounts (max 15%). Be friendly but don't give discounts too easily
3. **Create orders** - Use create_invoice when customer confirms purchase with their details
4. **Remember preferences** - Use save_customer_preference to personalize the experience

**Personality:**
- Friendly, helpful, and professional
- Enthusiastic about products but not pushy
- Good at negotiating - start with lower discounts and work up if needed
- Always confirm before creating orders

**Rules:**
- Maximum discount is 15%
- Always check inventory before promising products
- Get customer name, phone, address, and city before creating invoice
- Use Bengali Taka (৳) for prices
- Be conversational, not robotic

**When customer asks about products:**
Call inventory_check to get real product data, then describe them naturally.

**When customer wants to negotiate:**
Use negotiate_price with a reasonable counter-offer. Start at 5-10%, go up to 15% max if they push.

**When customer wants to buy:**
Collect: name, phone, address, city. Then call create_invoice.`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, sessionId = 'default', conversationHistory = [] } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            // Fallback response if no API key
            return NextResponse.json({
                message: "Hello! I'm your AI shopping assistant. To enable full AI features, please configure your Google AI API key.",
                sessionId
            });
        }

        // Get or create session for persistent memory
        const session = await getOrCreateSession(sessionId);

        // Combine stored messages with current conversation
        const allMessages: ChatMessage[] = [
            ...session.messages,
            ...conversationHistory.filter((m: ChatMessage) =>
                !session.messages.some((sm: ChatMessage) => sm.content === m.content && sm.timestamp === m.timestamp)
            )
        ];

        // Initialize Google AI
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: SYSTEM_PROMPT,
            tools: agentTools,
        });

        // Build history for Gemini
        const geminiHistory = allMessages
            .filter(msg => msg.role !== 'system' as string)
            .map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        // Start chat with function calling enabled
        const chat = model.startChat({
            history: geminiHistory as any,
            generationConfig: {
                maxOutputTokens: 1024,
            },
        });

        // Send message
        let result = await chat.sendMessage(message);
        let response = result.response;

        // Handle function calls
        let functionCallCount = 0;
        const maxFunctionCalls = 5;

        while (response.functionCalls() && functionCallCount < maxFunctionCalls) {
            functionCallCount++;
            const functionCalls = response.functionCalls();
            const functionResponses = [];

            for (const call of functionCalls) {
                console.log(`Calling function: ${call.name}`, call.args);

                let functionResult: string;

                switch (call.name) {
                    case 'inventory_check':
                        functionResult = await executeInventoryCheck(call.args as any);
                        break;
                    case 'create_invoice':
                        functionResult = await executeCreateInvoice(call.args as any);
                        break;
                    case 'negotiate_price':
                        functionResult = await executeNegotiatePrice(call.args as any, sessionId);
                        break;
                    case 'save_customer_preference':
                        functionResult = await executeSavePreference(call.args as any, sessionId);
                        break;
                    default:
                        functionResult = JSON.stringify({ error: 'Unknown function' });
                }

                functionResponses.push({
                    functionResponse: {
                        name: call.name,
                        response: JSON.parse(functionResult)
                    }
                });
            }

            // Send function results back to the model
            result = await chat.sendMessage(functionResponses as any);
            response = result.response;
        }

        // Get final text response
        const assistantMessage = response.text();

        // Save messages to session
        const updatedMessages: ChatMessage[] = [
            ...allMessages,
            { role: 'user', content: message, timestamp: new Date().toISOString() },
            { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() }
        ];

        // Keep only last 20 messages to prevent token overflow
        const messagesToSave = updatedMessages.slice(-20);
        await saveSessionMessages(sessionId, messagesToSave);

        return NextResponse.json({
            message: assistantMessage,
            sessionId,
            messageId: uuidv4()
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json(
            {
                error: 'Failed to process message',
                message: "I apologize, I'm having a moment. Could you please try again?"
            },
            { status: 500 }
        );
    }
}
