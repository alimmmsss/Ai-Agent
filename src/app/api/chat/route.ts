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

// Conversation state detection
type ConversationState = 'GREETING' | 'BROWSING' | 'PRODUCT_DISCUSSION' | 'COLLECTING_ORDER' | 'ORDER_CONFIRMED';

function detectConversationState(history: ChatMessage[], products: Product[]): {
    state: ConversationState;
    activeProduct: Product | null;
    collectedInfo: { name?: string; phone?: string; address?: string };
} {
    const collectedInfo: { name?: string; phone?: string; address?: string } = {};
    let activeProduct: Product | null = null;
    let state: ConversationState = 'GREETING';

    // Analyze conversation from start to end
    for (let i = 0; i < history.length; i++) {
        const msg = history[i];
        const content = msg.content.toLowerCase();

        // Find active product mentioned
        for (const product of products) {
            if (content.includes(product.name.toLowerCase())) {
                activeProduct = product;
                state = 'PRODUCT_DISCUSSION';
            }
        }

        // Check if we're in order collection mode
        if (msg.role === 'assistant') {
            if (content.includes('your name') || content.includes('নামটা বলুন') ||
                content.includes('what\'s your name') || content.includes('আপনার নাম')) {
                state = 'COLLECTING_ORDER';
            }
            if (content.includes('phone number') || content.includes('ফোন নম্বর')) {
                state = 'COLLECTING_ORDER';
            }
            if (content.includes('delivery address') || content.includes('ঠিকানা') || content.includes('address')) {
                state = 'COLLECTING_ORDER';
            }
            if (content.includes('order confirmed') || content.includes('অর্ডার কনফার্ম')) {
                state = 'ORDER_CONFIRMED';
            }
        }

        // Extract order info from user messages in COLLECTING_ORDER state
        if (msg.role === 'user' && state === 'COLLECTING_ORDER') {
            // Look for phone numbers (Bangladesh format)
            const phoneMatch = msg.content.match(/01[3-9]\d{8}/);
            if (phoneMatch) {
                collectedInfo.phone = phoneMatch[0];
            }

            // Simple name/address detection (if not a phone number and has text)
            if (!phoneMatch && msg.content.length > 2) {
                if (!collectedInfo.name) {
                    collectedInfo.name = msg.content.trim();
                } else if (!collectedInfo.address) {
                    collectedInfo.address = msg.content.trim();
                }
            }
        }
    }

    return { state, activeProduct, collectedInfo };
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

        // Detect current conversation state
        const { state, activeProduct, collectedInfo } = detectConversationState(conversationHistory, productList);

        console.log('Conversation State:', { state, activeProduct: activeProduct?.name, collectedInfo });

        // If no API key, use smart fallback
        if (!apiKey) {
            return NextResponse.json({
                message: getSmartFallbackResponse(message, productList, conversationHistory, state, activeProduct, collectedInfo),
                messageId: uuidv4()
            });
        }

        // Format product catalog for the AI
        const productCatalog = productList.map(p =>
            `📦 ${p.name} (ID: ${p.id})
   💰 Price: ৳${p.price.toLocaleString()} (10% off: ৳${Math.round(p.price * 0.9).toLocaleString()})
   📊 Stock: ${p.stock > 0 ? `${p.stock} available` : 'Out of stock'}
   🏷️ Category: ${p.category}
   📝 ${p.description}`
        ).join('\n\n');

        // Build context summary for the AI
        const contextSummary = `
### CURRENT CONVERSATION STATE: ${state}
${activeProduct ? `### ACTIVE PRODUCT: ${activeProduct.name} (৳${activeProduct.price.toLocaleString()}, 10% off = ৳${Math.round(activeProduct.price * 0.9).toLocaleString()})` : ''}
${Object.keys(collectedInfo).length > 0 ? `### COLLECTED ORDER INFO: ${JSON.stringify(collectedInfo)}` : ''}
`;

        // SENIOR SALES CLOSER SYSTEM PROMPT
        const systemPrompt = `### ROLE
You are the "Senior Sales Closer" for AI Store (Bangladesh). Your mission is to convert chats into sales.

### LANGUAGE RULES
- MATCH the customer's language: Bengali → Bengali, English → English

### YOUR PRODUCT CATALOG:
${productCatalog || 'No products available.'}

### STORE INFO:
- Store: AI Store (Bangladesh) | Currency: ৳ (BDT)
- Payment: Cash on Delivery (COD), bKash
- Delivery: 2-3 days nationwide

---

${contextSummary}

---

## CRITICAL RULES:

### IF STATE IS "COLLECTING_ORDER":
- The user is providing their order details (name, phone, address)
- Parse what they provided and ask for the NEXT missing piece
- DO NOT ask "which product" - we already know it's ${activeProduct?.name || 'the product they selected'}
- If they give name → ask for phone
- If they give phone → ask for address  
- If they give address → CONFIRM THE ORDER with summary

### IF STATE IS "PRODUCT_DISCUSSION":
- Active product is: ${activeProduct?.name || 'unknown'}
- If user says "Yes", "OK", "Sure" → Start collecting order (ask for name)
- If user asks about price/discount → Give price with 10% discount

### ORDER CONFIRMATION FORMAT:
When you have name, phone, address - confirm like this:
"✅ অর্ডার কনফার্ম!

📦 Product: [Name]
💰 Price: ৳[discounted price]
👤 Name: [name]
📱 Phone: [phone]
📍 Address: [address]

আপনার অর্ডার ২-৩ দিনের মধ্যে পৌঁছে যাবে! ধন্যবাদ! 🎉"

### ABSOLUTELY NEVER:
- Ask "which product?" if we're in COLLECTING_ORDER state
- Give generic menu if conversation has context
- Forget the active product

### ALWAYS:
- End with a question that moves toward completing the order
- Use the active product name in your responses`;

        // Initialize Google AI
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: systemPrompt,
        });

        // Build conversation history
        const history = conversationHistory
            .filter((msg: ChatMessage) => msg.role === 'user' || msg.role === 'assistant')
            .slice(-20)
            .map((msg: ChatMessage) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        const chat = model.startChat({
            history: history as any,
            generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.7,
            },
        });

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

// Smart fallback with state awareness
function getSmartFallbackResponse(
    message: string,
    products: Product[],
    history: ChatMessage[],
    state: ConversationState,
    activeProduct: Product | null,
    collectedInfo: { name?: string; phone?: string; address?: string }
): string {
    const isBengali = /[\u0980-\u09FF]/.test(message);
    const lower = message.toLowerCase();

    // Extract info from current message
    const phoneMatch = message.match(/01[3-9]\d{8}/);
    const hasPhone = phoneMatch !== null;

    // STATE: COLLECTING_ORDER - User is providing order details
    if (state === 'COLLECTING_ORDER' && activeProduct) {
        const discountedPrice = Math.round(activeProduct.price * 0.9);

        // Parse the message for order info
        let name = collectedInfo.name;
        let phone = collectedInfo.phone || (hasPhone ? phoneMatch![0] : undefined);
        let address = collectedInfo.address;

        // If message contains multiple pieces of info (like "Alim...01921052355.....katiadi")
        const parts = message.split(/[,.\s]+/).filter(p => p.length > 1);
        for (const part of parts) {
            const partPhone = part.match(/01[3-9]\d{8}/);
            if (partPhone) {
                phone = partPhone[0];
            } else if (!name && part.length > 2 && !/^\d+$/.test(part)) {
                name = part;
            } else if (name && !address && part.length > 2 && !/^\d+$/.test(part)) {
                address = part;
            }
        }

        // If we got all info, confirm order
        if (name && phone && address) {
            return isBengali
                ? `✅ **অর্ডার কনফার্ম!** 🎉\n\n📦 **প্রোডাক্ট:** ${activeProduct.name}\n💰 **মূল্য:** ৳${discountedPrice.toLocaleString()} (১০% ছাড়)\n👤 **নাম:** ${name}\n📱 **ফোন:** ${phone}\n📍 **ঠিকানা:** ${address}\n\n🚚 আপনার অর্ডার ২-৩ দিনের মধ্যে পৌঁছে যাবে!\nধন্যবাদ AI Store থেকে শপিং করার জন্য! 💜`
                : `✅ **Order Confirmed!** 🎉\n\n📦 **Product:** ${activeProduct.name}\n💰 **Price:** ৳${discountedPrice.toLocaleString()} (10% off)\n👤 **Name:** ${name}\n📱 **Phone:** ${phone}\n📍 **Address:** ${address}\n\n🚚 Your order will arrive in 2-3 days!\nThank you for shopping with AI Store! 💜`;
        }

        // Ask for missing info
        if (!name) {
            return isBengali
                ? `${activeProduct.name} এর জন্য অর্ডার নিচ্ছি! 🎉\n\nদয়া করে আপনার **নাম** বলুন?`
                : `Processing your order for ${activeProduct.name}! 🎉\n\nWhat's your **name**?`;
        }
        if (!phone) {
            return isBengali
                ? `ধন্যবাদ ${name}! 😊\n\nআপনার **ফোন নম্বর** দিন (যেমন: 01XXXXXXXXX)?`
                : `Thanks ${name}! 😊\n\nWhat's your **phone number**?`;
        }
        if (!address) {
            return isBengali
                ? `চমৎকার! 📱\n\nএখন আপনার **ডেলিভারি ঠিকানা** দিন?`
                : `Perfect! 📱\n\nNow, what's your **delivery address**?`;
        }
    }

    // STATE: PRODUCT_DISCUSSION - User said Yes/OK to a product
    if ((lower === 'yes' || lower === 'ok' || lower === 'sure' || lower === 'হ্যাঁ') && activeProduct) {
        const discountedPrice = Math.round(activeProduct.price * 0.9);
        return isBengali
            ? `দারুণ পছন্দ! 🎉 **${activeProduct.name}** আপনার হবে মাত্র ৳${discountedPrice.toLocaleString()} তে!\n\nঅর্ডার সম্পন্ন করতে আপনার **নাম** বলুন?`
            : `Excellent choice! 🎉 **${activeProduct.name}** is yours for just ৳${discountedPrice.toLocaleString()}!\n\nTo complete the order, what's your **name**?`;
    }

    // Handle discount/price queries
    if (lower.includes('discount') || lower.includes('price') || lower.includes('দাম') || lower.includes('ছাড়')) {
        if (activeProduct) {
            const discountedPrice = Math.round(activeProduct.price * 0.9);
            return isBengali
                ? `**${activeProduct.name}** এ আজ ১০% ছাড়! 🎉\n\nআসল দাম: ৳${activeProduct.price.toLocaleString()}\nআপনার দাম: **৳${discountedPrice.toLocaleString()}**\n\nঅর্ডার করবেন?`
                : `10% off on **${activeProduct.name}** today! 🎉\n\nOriginal: ৳${activeProduct.price.toLocaleString()}\nYour price: **৳${discountedPrice.toLocaleString()}**\n\nShould I reserve this for you?`;
        }
    }

    // Handle product queries
    for (const product of products) {
        if (lower.includes(product.name.toLowerCase()) || lower.includes(product.category.toLowerCase())) {
            const discountedPrice = Math.round(product.price * 0.9);
            return `**${product.name}** - Our bestseller! 🔥\n\n💰 **Price:** ৳${product.price.toLocaleString()}\n🎁 **Today's Deal:** ৳${discountedPrice.toLocaleString()} (10% off!)\n✨ ${product.description}\n📦 Stock: ${product.stock > 0 ? 'Available' : 'Out of stock'}\n\nWant to grab this deal?`;
        }
    }

    // Bengali greeting
    if (lower.includes('হাই') || lower.includes('হ্যালো')) {
        const top = products[0];
        if (top) {
            const discountedPrice = Math.round(top.price * 0.9);
            return `হ্যালো! 👋 AI Store এ স্বাগতম!\n\nআমাদের বেস্টসেলার **${top.name}** এখন ১০% ছাড়ে মাত্র ৳${discountedPrice.toLocaleString()}!\n\nদেখবেন নাকি?`;
        }
    }

    // English greeting  
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        const top = products[0];
        if (top) {
            const discountedPrice = Math.round(top.price * 0.9);
            return `Hey! 👋 Welcome to AI Store!\n\nOur bestseller **${top.name}** is on sale - ৳${discountedPrice.toLocaleString()} (10% off)!\n\nWant to check it out?`;
        }
    }

    // Products list
    if (lower.includes('product') || lower.includes('show') || lower.includes('প্রোডাক্ট')) {
        const list = products.slice(0, 3).map(p =>
            `• **${p.name}** - ৳${p.price.toLocaleString()} ${p.stock > 0 ? '✅' : '❌'}`
        ).join('\n');
        return isBengali
            ? `আমাদের সেরা প্রোডাক্ট:\n\n${list}\n\n🎁 সবগুলোতে ১০% ছাড়! কোনটা দেখবেন?`
            : `Our top products:\n\n${list}\n\n🎁 All have 10% off! Which one interests you?`;
    }

    // Default with context
    if (activeProduct) {
        const discountedPrice = Math.round(activeProduct.price * 0.9);
        return isBengali
            ? `আপনি **${activeProduct.name}** সম্পর্কে জানতে চেয়েছিলেন। দাম ৳${discountedPrice.toLocaleString()} (১০% ছাড়!)। অর্ডার করবেন?`
            : `You were asking about **${activeProduct.name}**. It's ৳${discountedPrice.toLocaleString()} (10% off!). Want to order?`;
    }

    return isBengali
        ? `কোন প্রোডাক্ট দেখতে চান? আমি সেরা ডিল দিতে পারি! 😊`
        : `Which product would you like to see? I can get you the best deal! 😊`;
}
