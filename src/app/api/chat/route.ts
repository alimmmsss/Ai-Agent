import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { db, products as productsTable } from '@/lib/db';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    category: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, conversationHistory = [] } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_AI_API_KEY;

        // Fetch products from database
        let productList: Product[] = [];
        try {
            productList = await db.select().from(productsTable) as Product[];
        } catch (error) {
            console.error('Error fetching products:', error);
        }

        // If no API key, use fallback
        if (!apiKey) {
            return NextResponse.json({
                message: getFallbackResponse(message, productList),
                messageId: uuidv4()
            });
        }

        // Format product catalog for the AI
        const productCatalog = productList.map(p =>
            `• ${p.name} (ID: ${p.id}) - ৳${p.price.toLocaleString()} - ${p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'} - Category: ${p.category}\n  Description: ${p.description}`
        ).join('\n\n');

        // Build comprehensive system prompt with actual product data
        const systemPrompt = `You are a friendly and helpful AI Sales Assistant for "AI Store", an e-commerce store in Bangladesh.

## YOUR PRODUCT CATALOG (REAL DATA - USE THIS):
${productCatalog || 'No products currently available.'}

## STORE INFORMATION:
- Store Name: AI Store
- Currency: Bengali Taka (৳ or BDT)
- Location: Bangladesh
- Payment Methods: Cash on Delivery (COD), bKash
- Delivery: Nationwide delivery, typically 2-3 days

## YOUR CAPABILITIES:
1. **Product Information**: Answer questions about products using the catalog above
2. **Price Negotiation**: You can offer up to 15% discount maximum
3. **Order Assistance**: Help customers place orders
4. **Recommendations**: Suggest products based on customer needs

## HOW TO RESPOND:

### When customer asks about products:
- Reference specific products from the catalog above with accurate prices
- Mention stock availability
- Describe features from the product descriptions

### When customer asks about a specific product:
- Give detailed information about that exact product
- Include price, stock status, and description
- Suggest related products if relevant

### When customer wants to buy:
- Confirm which product and quantity
- Ask for: Name, Phone, Address, City
- Explain payment options (COD or bKash)

### When customer negotiates price:
- Start with 5% discount offer
- Maximum you can offer is 15%
- Be friendly but don't give max discount immediately

## RULES:
- Always use ৳ for prices (e.g., ৳4,999)
- Be conversational and friendly, use emojis occasionally
- Give accurate information from the product catalog
- If product doesn't exist in catalog, say you don't have it
- Keep responses concise but helpful
- Remember what customer said earlier in conversation

## EXAMPLE RESPONSES:

Customer: "What products do you have?"
You: "Welcome! 🛍️ Here are some of our popular products:

• **Premium Wireless Headphones** - ৳4,999 (50 in stock)
  High-quality sound with active noise cancellation

• **Smart Watch Pro** - ৳8,999 (30 in stock)
  Track fitness, receive notifications, monitor health

Would you like details about any of these? 😊"

Customer: "Tell me about the headphones"
You: "Great choice! 🎧

**Premium Wireless Headphones** - ৳4,999

Features:
- High-quality sound with deep bass
- Active noise cancellation
- Up to 30 hours battery life
- Comfortable over-ear design

We have 50 units in stock. Would you like to order one? I might be able to offer you a small discount! 😉"`;

        // Initialize Google AI
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: systemPrompt,
        });

        // Build conversation history for context
        const history = conversationHistory
            .filter((msg: ChatMessage) => msg.role === 'user' || msg.role === 'assistant')
            .slice(-10) // Keep last 10 messages for context
            .map((msg: ChatMessage) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        // Start chat with history
        const chat = model.startChat({
            history: history as any,
            generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.7,
            },
        });

        // Send message and get response
        const result = await chat.sendMessage(message);
        const assistantMessage = result.response.text();

        return NextResponse.json({
            message: assistantMessage,
            messageId: uuidv4()
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({
            message: "I apologize, I'm having a moment. Could you please try again? 🙏",
            messageId: uuidv4()
        });
    }
}

// Fallback responses when API key is not configured
function getFallbackResponse(message: string, products: Product[]): string {
    const lower = message.toLowerCase();

    // Greeting
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.match(/^(hi|hello|hey)$/)) {
        return "Hello! 👋 Welcome to AI Store! I'm your shopping assistant. How can I help you today? Feel free to ask about our products!";
    }

    // Products inquiry
    if (lower.includes('product') || lower.includes('what do you have') || lower.includes('show') || lower.includes('catalog')) {
        if (products.length === 0) {
            return "We're currently updating our catalog. Please check back soon!";
        }
        const list = products.slice(0, 3).map(p =>
            `• **${p.name}** - ৳${p.price.toLocaleString()} (${p.stock > 0 ? 'In stock' : 'Out of stock'})`
        ).join('\n');
        return `Here are some of our products:\n\n${list}\n\nWould you like more details about any of these?`;
    }

    // Price inquiry
    if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
        const matchedProduct = products.find(p =>
            lower.includes(p.name.toLowerCase()) ||
            lower.includes(p.category.toLowerCase())
        );
        if (matchedProduct) {
            return `**${matchedProduct.name}** is priced at ৳${matchedProduct.price.toLocaleString()}. Would you like to purchase it?`;
        }
        return "Which product's price would you like to know? I can help you find the best deals!";
    }

    // Buy intent
    if (lower.includes('buy') || lower.includes('order') || lower.includes('purchase')) {
        return "Great! 🛒 To place an order, please tell me:\n1. Which product you'd like\n2. Your name and phone number\n3. Delivery address\n\nI'll help you complete your purchase!";
    }

    // Thanks
    if (lower.includes('thank')) {
        return "You're welcome! 😊 Is there anything else I can help you with?";
    }

    // Default
    return "I'm here to help! You can ask me about:\n• Our products and prices\n• Stock availability\n• Placing an order\n• Special discounts\n\nWhat would you like to know?";
}
