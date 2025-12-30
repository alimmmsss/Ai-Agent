import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { db, products as productsTable } from '@/lib/db';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
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
                message: getFallbackResponse(message, productList, conversationHistory),
                messageId: uuidv4()
            });
        }

        // Format product catalog for the AI
        const productCatalog = productList.map(p =>
            `📦 ${p.name} (ID: ${p.id})
   💰 Price: ৳${p.price.toLocaleString()}
   📊 Stock: ${p.stock > 0 ? `${p.stock} available` : 'Out of stock'}
   🏷️ Category: ${p.category}
   📝 ${p.description}`
        ).join('\n\n');

        // SENIOR SALES CLOSER SYSTEM PROMPT
        const systemPrompt = `### ROLE
You are the "Senior Sales Closer" for AI Store (Bangladesh). You are NOT a generic support bot. Your sole mission is to identify what the user wants, provide specific details, and guide them toward purchase.

### LANGUAGE RULES
- MATCH the customer's language: If they write Bengali, reply in Bengali. If English, reply in English.
- Bengali greetings: হাই, হ্যালো = Hello | ধন্যবাদ = Thanks | হ্যাঁ = Yes
- Bengali product terms: প্রোডাক্ট = Product | দাম = Price | কিনতে চাই = Want to buy

### YOUR PRODUCT CATALOG (REAL DATA):
${productCatalog || 'No products available.'}

### STORE INFO:
- Store: AI Store (Bangladesh)
- Currency: ৳ (BDT)
- Payment: Cash on Delivery (COD), bKash
- Delivery: 2-3 days nationwide

### CORE RULE: CONTEXTUAL CONTINUITY (CRITICAL!)
1. ALWAYS analyze the ENTIRE message history before responding.
2. If user mentions "it," "that," "discounts," or "price," look at previous messages to identify which product they mean.
3. NEVER repeat the generic menu if user has already started a product conversation.
4. If context is unclear, ask: "Which product were you interested in? I want to give you the right discount!"

### CONTEXT MAPPING:
- User said product name before + now says "discount"/"price" → Reference THAT specific product
- User said "Yes"/"OK" after product list → Ask which one they want
- User said "Yes"/"OK" after single product → Assume they want to buy IT, ask for order details
- User says product name (e.g., "Smart watch", "Headphones") → Give THAT product's full details + price

### SALES STRATEGY
1. **BE PROACTIVE**: When user asks about a product, immediately give:
   - Price
   - One key benefit
   - Stock status

2. **HANDLE DISCOUNTS**: Never say "I'll check." Instead say:
   "Great news! We have a special 10% discount on [product name] if you order today. That brings it down to ৳[discounted price]. Should I apply this for you?"

3. **THE CLOSING HOOK**: Every response MUST end with a closing question:
   - "Would you like the Midnight Black or Silver version?"
   - "Should I add this to your cart?"
   - "Ready to place the order? I just need your name and phone number."
   - "Which color do you prefer?"

### GUARDRAILS
- NO "Robot Talk": Never say "As an AI..." or "Here's what I can do..."
- NO Generic Menus: If user asked about a product, don't show the menu
- STAY ON TOPIC: Only discuss products in the catalog
- If context is 100% lost, ask: "Which product from our catalog were you interested in? I want to make sure I give you the right deal!"

### RESPONSE EXAMPLES:

User: "Tell me about smart watch"
You: "The **Smart Watch Pro** is one of our bestsellers! 🔥

💰 **Price:** ৳8,999
✨ **Key Feature:** Full fitness tracking with heart rate monitor
📦 **Stock:** Available now

And here's a tip - we have 10% off today, bringing it to ৳8,099! Should I reserve one for you?"

User: "What's the discount?" (after talking about headphones)
You: "For the **Premium Wireless Headphones**, I can offer you 10% off! 🎧

Original: ৳4,999
Your price: **৳4,499**

This discount is valid for today only. Want me to lock this price for you?"

User: "Yes" (after headphones discussion)
You: "Excellent choice! 🎉 The Premium Wireless Headphones will be on their way to you.

To complete your order, I just need:
📝 Your full name
📱 Phone number  
📍 Delivery address

What's your name?"

User: "হাই" (Bengali)
You: "হ্যালো! 👋 AI Store এ স্বাগতম!

আজ কী খুঁজছেন? আমাদের সবচেয়ে জনপ্রিয় প্রোডাক্ট হলো Smart Watch Pro (৳৮,৯৯৯) - এখন ১০% ছাড় চলছে! দেখবেন নাকি?"

User: "Price?" (after smart watch discussion)
You: "The **Smart Watch Pro** is ৳8,999 - but today I can do ৳8,099 for you (10% off)! 💰

This is our best fitness watch with heart rate, steps, and notifications.

Should I set this aside for you before the discount expires?"`;

        // Initialize Google AI
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: systemPrompt,
        });

        // Build conversation history - include ALL messages for context
        const history = conversationHistory
            .filter((msg: ChatMessage) => msg.role === 'user' || msg.role === 'assistant')
            .slice(-20) // Keep last 20 messages for full context
            .map((msg: ChatMessage) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        // Start chat with history
        const chat = model.startChat({
            history: history as any,
            generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.8,
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
            message: "দুঃখিত, একটু সমস্যা হচ্ছে। আবার চেষ্টা করুন! 🙏",
            messageId: uuidv4()
        });
    }
}

// Smart fallback responses
function getFallbackResponse(message: string, products: Product[], history: ChatMessage[]): string {
    const lower = message.toLowerCase();
    const isBengali = /[\u0980-\u09FF]/.test(message);

    // Find last mentioned product from history
    const lastProductMention = findLastProduct(history, products);

    // Handle discount/price queries with context
    if (lower.includes('discount') || lower.includes('price') || message.includes('দাম') || message.includes('ছাড়')) {
        if (lastProductMention) {
            const discountedPrice = Math.round(lastProductMention.price * 0.9);
            return isBengali
                ? `**${lastProductMention.name}** এ আজ ১০% ছাড়! 🎉\n\nআসল দাম: ৳${lastProductMention.price.toLocaleString()}\nআপনার দাম: **৳${discountedPrice.toLocaleString()}**\n\nঅর্ডার করবেন?`
                : `Great news! I can offer 10% off on **${lastProductMention.name}**! 🎉\n\nOriginal: ৳${lastProductMention.price.toLocaleString()}\nYour price: **৳${discountedPrice.toLocaleString()}**\n\nShould I lock this price for you?`;
        }
    }

    // Handle "Yes" with context
    if (lower === 'yes' || lower === 'ok' || lower === 'sure' || message === 'হ্যাঁ' || message === 'হাঁ') {
        if (lastProductMention) {
            return isBengali
                ? `দারুণ! 🎉 ${lastProductMention.name} আপনার জন্য!\n\nঅর্ডার সম্পন্ন করতে বলুন:\n📝 আপনার নাম\n📱 ফোন নম্বর\n📍 ঠিকানা\n\nনামটা বলুন?`
                : `Excellent choice! 🎉 The ${lastProductMention.name} is yours!\n\nTo complete your order, I need:\n📝 Your name\n📱 Phone number\n📍 Delivery address\n\nWhat's your name?`;
        }
        return isBengali
            ? `দারুণ! 😊 কোন প্রোডাক্টটি নিতে চাচ্ছেন?`
            : `Great! 😊 Which product caught your eye?`;
    }

    // Handle product name queries
    for (const product of products) {
        if (lower.includes(product.name.toLowerCase()) || lower.includes(product.category.toLowerCase())) {
            const discountedPrice = Math.round(product.price * 0.9);
            return `The **${product.name}** is one of our bestsellers! 🔥\n\n💰 **Price:** ৳${product.price.toLocaleString()}\n✨ **${product.description}**\n📦 **Stock:** ${product.stock > 0 ? `${product.stock} available` : 'Out of stock'}\n\n🎁 Special offer: 10% off today = **৳${discountedPrice.toLocaleString()}**\n\nWant me to reserve one for you?`;
        }
    }

    // Bengali greeting
    if (message.includes('হাই') || message.includes('হ্যালো')) {
        const topProduct = products[0];
        const discountedPrice = topProduct ? Math.round(topProduct.price * 0.9) : 0;
        return `হ্যালো! 👋 AI Store এ স্বাগতম!\n\nআজ কী খুঁজছেন? আমাদের সবচেয়ে জনপ্রিয় প্রোডাক্ট হলো **${topProduct?.name}** (৳${topProduct?.price.toLocaleString()}) - এখন ১০% ছাড়ে ৳${discountedPrice.toLocaleString()}!\n\nদেখবেন নাকি?`;
    }

    // English greeting
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        const topProduct = products[0];
        const discountedPrice = topProduct ? Math.round(topProduct.price * 0.9) : 0;
        return `Hey there! 👋 Welcome to AI Store!\n\nLooking for something specific? Our bestseller **${topProduct?.name}** is on sale - ৳${discountedPrice.toLocaleString()} (10% off)!\n\nWant to check it out?`;
    }

    // Products inquiry
    if (lower.includes('product') || lower.includes('show') || message.includes('প্রোডাক্ট')) {
        const list = products.slice(0, 3).map(p =>
            `• **${p.name}** - ৳${p.price.toLocaleString()} ${p.stock > 0 ? '✅' : '❌'}`
        ).join('\n');
        return isBengali
            ? `আমাদের সেরা প্রোডাক্ট:\n\n${list}\n\n🎁 সবগুলোতে আজ ১০% ছাড়! কোনটা সম্পর্কে জানতে চান?`
            : `Here are our top products:\n\n${list}\n\n🎁 All have 10% off today! Which one interests you?`;
    }

    // Default - don't show generic menu, ask what they want
    return isBengali
        ? `কোন প্রোডাক্ট সম্পর্কে জানতে চান? আমি আপনাকে সেরা ডিল দিতে পারি! 😊`
        : `Which product are you interested in? I'd love to get you the best deal! 😊`;
}

// Find the last mentioned product from conversation history
function findLastProduct(history: ChatMessage[], products: Product[]): Product | null {
    // Go through history in reverse to find last product mention
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i].content.toLowerCase();
        for (const product of products) {
            if (msg.includes(product.name.toLowerCase())) {
                return product;
            }
        }
    }
    return null;
}
