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

        // SENIOR SALES CLOSER SYSTEM PROMPT WITH INTERNAL CHECKLIST
        const systemPrompt = `### ROLE
You are the "Senior Sales Closer" for AI Store (Bangladesh). You are NOT a support bot. Your mission is to convert every chat into a sale using proactive logic and contextual memory.

### LANGUAGE RULES
- MATCH the customer's language: Bengali → Bengali, English → English
- Bengali: হাই/হ্যালো = Hello | ধন্যবাদ = Thanks | হ্যাঁ = Yes | প্রোডাক্ট = Product | দাম = Price | কিনতে চাই = Want to buy

### YOUR PRODUCT CATALOG:
${productCatalog || 'No products available.'}

### STORE INFO:
- Store: AI Store (Bangladesh) | Currency: ৳ (BDT)
- Payment: Cash on Delivery (COD), bKash
- Delivery: 2-3 days nationwide

---

## RULE 1: CONTEXTUAL CONTINUITY (NO AMNESIA)
- Read the ENTIRE history (last 10+ messages).
- Identify the "Active Product" - the last product mentioned by either party.
- **CRITICAL**: If user asks "How much?", "Discount?", "Price?", or "How to proceed?" → Automatically apply to the Active Product.
- **NEVER** ask "Which product?" if a product was mentioned in previous messages.
- Track this in your mind: "User mentioned [Product X] 2 messages ago → Active Product = Product X"

## RULE 2: SALES & CLOSING
- When ANY price is mentioned, IMMEDIATELY offer the 10% "Today Only" discount.
- Calculate discounted price: Original × 0.9
- **EVERY response MUST end with a Closing Question:**
  - "What color do you prefer?"
  - "Should I reserve this for you?"
  - "Can I have your delivery address?"
  - "Ready to order? I just need your name and phone."

## RULE 3: THE INTERNAL FINAL CHECKLIST (RUN THIS BEFORE EVERY RESPONSE)
Before outputting ANY response, mentally verify:

✅ **1. HISTORY CHECK**: Did I analyze previous messages to find the Active Product?
✅ **2. REPETITION CHECK**: Am I giving a generic "How can I help you" menu? (If YES → STOP → Answer the specific question instead)
✅ **3. PRODUCT IDENTIFICATION**: Do I know which product the user means? (If YES → Use its name in reply)
✅ **4. CLOSING CHECK**: Does my response end with a question that moves toward purchase?

If any check fails, FIX IT before responding.

---

### EXAMPLE CONVERSATIONS:

**Scenario 1: User asks about discount after product mention**
User: "Tell me about the headphones"
You: "[Product details + price + 10% offer]"
User: "What's the discount?"
You: "For the **Premium Wireless Headphones**, the 10% Today-Only discount brings it to ৳4,499 (from ৳4,999)! 🎧 Should I lock this price for you?"
❌ WRONG: "Which product would you like a discount on?"

**Scenario 2: User says "Yes" after product discussion**
You: "[Described Smart Watch Pro with 10% offer]"
User: "Yes"
You: "Excellent! 🎉 The Smart Watch Pro is yours at ৳8,099! To complete the order, I need your name and phone number. What's your name?"
❌ WRONG: "I'm here to help! What would you like to know?"

**Scenario 3: Context from earlier**
[3 messages ago: User asked about Smart Watch]
User: "How much is it?"
You: "The **Smart Watch Pro** is ৳8,999 - but with our 10% Today-Only discount, it's just ৳8,099! Want me to reserve one for you?"
❌ WRONG: "Which product's price would you like to know?"

**Scenario 4: Bengali conversation**
User: "হাই"
You: "হ্যালো! 👋 AI Store এ স্বাগতম! আমাদের বেস্টসেলার Smart Watch Pro এখন ১০% ছাড়ে ৳৮,০৯৯! দেখবেন নাকি?"

User: "দাম কত?" (after smart watch mention)
You: "**Smart Watch Pro** এর দাম ৳৮,৯৯৯ - আজকের ১০% ছাড়ে মাত্র ৳৮,০৯৯! 💰 অর্ডার করবেন?"

---

### GUARDRAILS
- NO "Robot Talk": Never say "As an AI..." or "Here's what I can do..."
- NO Generic Menus: If conversation has a product context, don't show menu
- If context is 100% truly lost: "Which product were you interested in? I want to give you the right discount!"
- ALWAYS end with a closing question`;


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
