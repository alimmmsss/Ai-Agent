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
   📝 Description: ${p.description}`
        ).join('\n\n');

        // Build comprehensive system prompt with Bengali support
        const systemPrompt = `You are a friendly AI Sales Assistant for "AI Store" - an e-commerce store in Bangladesh. 

## LANGUAGE INSTRUCTIONS (VERY IMPORTANT):
- You MUST respond in the SAME LANGUAGE the customer uses
- If customer writes in Bengali (বাংলা), respond in Bengali
- If customer writes in English, respond in English  
- If customer mixes languages (Banglish), you can mix too
- Common Bengali phrases you should understand:
  - হ্যাঁ/হাঁ/Yes = Yes
  - না/No = No
  - হাই/হাইলো/স্বাগতম = Hello
  - প্রোডাক্ট = Product
  - দাম/মূল্য/কত = Price
  - কিনতে চাই/অর্ডার = Want to buy/Order
  - ধন্যবাদ = Thank you
  - ডিসকাউন্ট/কমাও = Discount/Reduce price

## YOUR PRODUCT CATALOG:
${productCatalog || 'No products currently available.'}

## STORE INFO:
- Store: AI Store (Bangladesh)
- Currency: ৳ (Bengali Taka/BDT)
- Payment: Cash on Delivery (COD), bKash
- Delivery: 2-3 days nationwide

## CONVERSATION CONTEXT (CRITICAL):
You MUST remember and reference the conversation history. When customer says:
- "Yes", "হ্যাঁ", "OK", "Sure" → They're agreeing to your previous suggestion/offer
- "Tell me more", "আরো বলো" → Give more details about the last mentioned product
- "This one", "এইটা" → Refers to the last product mentioned
- Short responses → Relate them to the ongoing conversation topic

## HOW TO BE CONTEXTUAL:
1. If you just listed products and customer says "Yes" → Ask which product they want
2. If you described a product and customer says "OK" → Ask if they want to order
3. If customer asks for discount → Offer 5-10% (max 15%)
4. Always reference what was discussed before

## RESPONSE STYLE:
- Be warm, friendly, use relevant emojis
- Keep responses concise but complete
- Use bullet points for product lists
- Always include prices when mentioning products
- End with a relevant question or call-to-action

## EXAMPLES:

User: "হাই" (Hi in Bengali)
You: "হ্যালো! 👋 AI Store এ স্বাগতম! আমি আপনার শপিং অ্যাসিস্ট্যান্ট। আজ কীভাবে সাহায্য করতে পারি? আমাদের প্রোডাক্ট দেখতে চান?"

User: "প্রোডাক্ট সম্পর্কে বলো" (Tell me about products)
You: "অবশ্যই! 🛍️ আমাদের জনপ্রিয় প্রোডাক্টগুলো হলো:

• **Premium Wireless Headphones** - ৳৪,৯৯৯
  দারুণ সাউন্ড কোয়ালিটি, নয়েজ ক্যান্সেলেশন

• **Smart Watch Pro** - ৳৮,৯৯৯
  ফিটনেস ট্র্যাকিং, নোটিফিকেশন

কোন প্রোডাক্ট সম্পর্কে আরো জানতে চান? 😊"

User: "Yes" (after seeing product list)
You: "দারুণ! 😊 কোন প্রোডাক্টটি নিতে চাচ্ছেন? Headphones নাকি Smart Watch? আমি সেটা সম্পর্কে বিস্তারিত বলতে পারি!"

User: "about products"
You: "Sure! Here are our popular products:

• **Premium Wireless Headphones** - ৳4,999
  Great sound, noise cancellation, 30hr battery

• **Smart Watch Pro** - ৳8,999  
  Fitness tracking, notifications, health monitoring

• **Leather Messenger Bag** - ৳3,499
  Premium leather, multiple compartments

Would you like details about any of these? 😊"`;

        // Initialize Google AI
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: systemPrompt,
        });

        // Build conversation history for context - include more messages
        const history = conversationHistory
            .filter((msg: ChatMessage) => msg.role === 'user' || msg.role === 'assistant')
            .slice(-15) // Keep last 15 messages for better context
            .map((msg: ChatMessage) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

        // Start chat with history
        const chat = model.startChat({
            history: history as any,
            generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.8, // Slightly higher for more natural responses
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
            message: "দুঃখিত, একটু সমস্যা হচ্ছে। আবার চেষ্টা করুন। 🙏 / Sorry, having some issues. Please try again.",
            messageId: uuidv4()
        });
    }
}

// Fallback responses when API key is not configured
function getFallbackResponse(message: string, products: Product[], history: ChatMessage[]): string {
    const lower = message.toLowerCase();
    const lastAssistantMsg = history.filter(m => m.role === 'assistant').pop()?.content || '';

    // Check for Bengali
    const isBengali = /[\u0980-\u09FF]/.test(message);

    // Contextual responses based on conversation flow
    if (lower === 'yes' || lower === 'ok' || lower === 'sure' || message === 'হ্যাঁ' || message === 'হাঁ') {
        // If last message was about products
        if (lastAssistantMsg.includes('product') || lastAssistantMsg.includes('প্রোডাক্ট')) {
            return isBengali
                ? "দারুণ! কোন প্রোডাক্টটি নিতে চাচ্ছেন? আমি বিস্তারিত বলতে পারি! 😊"
                : "Great! Which product are you interested in? I can give you more details! 😊";
        }
        return isBengali
            ? "অবশ্যই! কীভাবে সাহায্য করতে পারি? 😊"
            : "Sure! How can I help you? 😊";
    }

    // Bengali greetings
    if (message.includes('হাই') || message.includes('হ্যালো') || message.includes('স্বাগত')) {
        return "হ্যালো! 👋 AI Store এ স্বাগতম! আমি আপনার শপিং অ্যাসিস্ট্যান্ট। আমাদের প্রোডাক্ট সম্পর্কে জানতে চান?";
    }

    // English greetings
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.match(/^(hi|hello|hey)$/)) {
        return "Hello! 👋 Welcome to AI Store! I'm your shopping assistant. Would you like to see our products?";
    }

    // Bengali product inquiry
    if (message.includes('প্রোডাক্ট') || message.includes('পণ্য') || message.includes('কী কী আছে')) {
        if (products.length === 0) {
            return "দুঃখিত, এখন কোনো প্রোডাক্ট নেই। শীঘ্রই আসছে!";
        }
        const list = products.slice(0, 3).map(p =>
            `• **${p.name}** - ৳${p.price.toLocaleString()}`
        ).join('\n');
        return `আমাদের জনপ্রিয় প্রোডাক্ট:\n\n${list}\n\nকোনটা সম্পর্কে জানতে চান? 😊`;
    }

    // English product inquiry
    if (lower.includes('product') || lower.includes('what do you have') || lower.includes('show') || lower.includes('catalog')) {
        if (products.length === 0) {
            return "We're currently updating our catalog. Please check back soon!";
        }
        const list = products.slice(0, 3).map(p =>
            `• **${p.name}** - ৳${p.price.toLocaleString()} (${p.stock > 0 ? 'In stock' : 'Out of stock'})`
        ).join('\n');
        return `Here are our products:\n\n${list}\n\nWould you like more details about any of these? 😊`;
    }

    // Bengali price inquiry
    if (message.includes('দাম') || message.includes('কত') || message.includes('মূল্য')) {
        const matchedProduct = products.find(p =>
            lower.includes(p.name.toLowerCase()) ||
            lower.includes(p.category.toLowerCase())
        );
        if (matchedProduct) {
            return `**${matchedProduct.name}** এর দাম ৳${matchedProduct.price.toLocaleString()}। কিনতে চান? 😊`;
        }
        return "কোন প্রোডাক্টের দাম জানতে চান?";
    }

    // English price inquiry
    if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
        const matchedProduct = products.find(p =>
            lower.includes(p.name.toLowerCase()) ||
            lower.includes(p.category.toLowerCase())
        );
        if (matchedProduct) {
            return `**${matchedProduct.name}** is priced at ৳${matchedProduct.price.toLocaleString()}. Would you like to order? 😊`;
        }
        return "Which product's price would you like to know?";
    }

    // Bengali buy intent
    if (message.includes('কিনতে') || message.includes('অর্ডার') || message.includes('নিতে চাই')) {
        return "দারুণ! 🛒 অর্ডার করতে আপনার নাম, ফোন নম্বর এবং ঠিকানা দিন। আমি সাহায্য করব!";
    }

    // English buy intent
    if (lower.includes('buy') || lower.includes('order') || lower.includes('purchase')) {
        return "Great! 🛒 To order, please share your name, phone number, and delivery address!";
    }

    // Bengali thanks
    if (message.includes('ধন্যবাদ') || message.includes('থ্যাংকস')) {
        return "স্বাগতম! 😊 আর কিছু সাহায্য লাগলে বলবেন!";
    }

    // English thanks
    if (lower.includes('thank')) {
        return "You're welcome! 😊 Let me know if you need anything else!";
    }

    // Default - detect language
    if (isBengali) {
        return "আমি সাহায্য করতে এখানে আছি! 😊\n\n• প্রোডাক্ট দেখতে বলুন\n• দাম জানতে জিজ্ঞেস করুন\n• অর্ডার করতে বলুন\n\nকী জানতে চান?";
    }

    return "I'm here to help! 😊\n\n• Ask about our products\n• Check prices & stock\n• Place an order\n• Get discounts\n\nWhat would you like to know?";
}
