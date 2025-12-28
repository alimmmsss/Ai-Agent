import { db, products, orders, orderItems, customerInfo, chatSessions } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { SchemaType, type FunctionDeclaration, type Tool } from '@google/generative-ai';

// ============================================
// FUNCTION CALLING SCHEMAS FOR GOOGLE AI
// ============================================

/**
 * inventory_check - Check product availability and details
 */
export const inventoryCheckDeclaration: FunctionDeclaration = {
    name: 'inventory_check',
    description: 'Check product inventory, get product details, search for products by name or category. Use this when a customer asks about products, prices, availability, or wants to browse the catalog.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            query: {
                type: SchemaType.STRING,
                description: 'Search query for product name, category, or keywords (e.g., "headphones", "electronics", "smart watch")'
            },
            productId: {
                type: SchemaType.STRING,
                description: 'Specific product ID to check (e.g., "prod_001")'
            },
            checkStock: {
                type: SchemaType.BOOLEAN,
                description: 'Whether to check stock availability'
            }
        },
        required: []
    }
};

/**
 * create_invoice - Create an order/invoice for the customer
 */
export const createInvoiceDeclaration: FunctionDeclaration = {
    name: 'create_invoice',
    description: 'Create an invoice/order when a customer confirms they want to purchase a product. Use this after customer confirms purchase intent and provides required information.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            productId: {
                type: SchemaType.STRING,
                description: 'The ID of the product to order'
            },
            quantity: {
                type: SchemaType.NUMBER,
                description: 'Number of items to order (default: 1)'
            },
            discountPercent: {
                type: SchemaType.NUMBER,
                description: 'Discount percentage to apply (0-15 max)'
            },
            customerName: {
                type: SchemaType.STRING,
                description: 'Customer full name'
            },
            customerPhone: {
                type: SchemaType.STRING,
                description: 'Customer phone number'
            },
            customerAddress: {
                type: SchemaType.STRING,
                description: 'Delivery address'
            },
            customerCity: {
                type: SchemaType.STRING,
                description: 'City for delivery'
            },
            paymentMethod: {
                type: SchemaType.STRING,
                description: 'Payment method (cod = Cash on Delivery, bkash, or online)'
            }
        },
        required: ['productId', 'customerName', 'customerPhone', 'customerAddress', 'customerCity']
    }
};

/**
 * negotiate_price - Handle price negotiation 
 */
export const negotiatePriceDeclaration: FunctionDeclaration = {
    name: 'negotiate_price',
    description: 'Negotiate price with the customer. Use when customer asks for discount, bargains, or tries to negotiate. You can offer up to 15% discount max.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            productId: {
                type: SchemaType.STRING,
                description: 'The product ID to negotiate price for'
            },
            requestedDiscount: {
                type: SchemaType.NUMBER,
                description: 'Discount percentage the customer is requesting'
            },
            counterOffer: {
                type: SchemaType.NUMBER,
                description: 'Your counter-offer discount percentage (max 15%)'
            },
            reason: {
                type: SchemaType.STRING,
                description: 'Reason for the discount decision'
            }
        },
        required: ['productId']
    }
};

/**
 * save_customer_preference - Remember customer preferences
 */
export const savePreferenceDeclaration: FunctionDeclaration = {
    name: 'save_customer_preference',
    description: 'Save customer preferences like favorite categories, price range, or specific interests for personalized recommendations.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            preferenceType: {
                type: SchemaType.STRING,
                description: 'Type of preference to save (category, price_range, brand, interest)'
            },
            value: {
                type: SchemaType.STRING,
                description: 'The preference value (e.g., "electronics", "budget-friendly")'
            }
        },
        required: ['preferenceType', 'value']
    }
};

// All tools for the AI agent
export const agentTools: Tool[] = [
    { functionDeclarations: [inventoryCheckDeclaration, createInvoiceDeclaration, negotiatePriceDeclaration, savePreferenceDeclaration] }
];

// ============================================
// FUNCTION IMPLEMENTATIONS
// ============================================

interface InventoryCheckParams {
    query?: string;
    productId?: string;
    checkStock?: boolean;
}

interface CreateInvoiceParams {
    productId: string;
    quantity?: number;
    discountPercent?: number;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    customerCity: string;
    paymentMethod?: string;
}

interface NegotiatePriceParams {
    productId: string;
    requestedDiscount?: number;
    counterOffer?: number;
    reason?: string;
}

interface SavePreferenceParams {
    preferenceType: string;
    value: string;
}

/**
 * Execute inventory_check function
 */
export async function executeInventoryCheck(params: InventoryCheckParams): Promise<string> {
    try {
        let productsList = await db.select().from(products);

        // Filter by product ID if provided
        if (params.productId) {
            const product = productsList.find(p => p.id === params.productId);
            if (product) {
                return JSON.stringify({
                    found: true,
                    product: {
                        id: product.id,
                        name: product.name,
                        description: product.description,
                        price: product.price,
                        currency: 'BDT',
                        stock: product.stock,
                        category: product.category,
                        available: product.stock > 0,
                        maxDiscount: product.maxDiscount || 15
                    }
                });
            }
            return JSON.stringify({ found: false, message: 'Product not found' });
        }

        // Search by query
        if (params.query) {
            const query = params.query.toLowerCase();
            productsList = productsList.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.description.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query)
            );
        }

        // Format results
        const results = productsList.slice(0, 5).map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            stock: p.stock,
            category: p.category,
            available: p.stock > 0
        }));

        return JSON.stringify({
            found: results.length > 0,
            count: results.length,
            products: results,
            message: results.length > 0 ? `Found ${results.length} products` : 'No products found matching your query'
        });
    } catch (error) {
        console.error('Inventory check error:', error);
        return JSON.stringify({ error: 'Failed to check inventory' });
    }
}

/**
 * Execute create_invoice function
 */
export async function executeCreateInvoice(params: CreateInvoiceParams): Promise<string> {
    try {
        // Get product details
        const productResult = await db.select().from(products).where(eq(products.id, params.productId));
        const product = productResult[0];

        if (!product) {
            return JSON.stringify({ success: false, error: 'Product not found' });
        }

        const quantity = params.quantity || 1;
        const discountPercent = Math.min(params.discountPercent || 0, product.maxDiscount || 15);
        const originalTotal = product.price * quantity;
        const discountAmount = Math.round(originalTotal * (discountPercent / 100));
        const finalAmount = originalTotal - discountAmount;

        // Create order
        const orderId = `ORD-${Date.now()}`;
        await db.insert(orders).values({
            id: orderId,
            totalAmount: originalTotal,
            discountAmount: discountAmount,
            finalAmount: finalAmount,
            status: 'pending_approval',
            paymentMethod: params.paymentMethod || 'cod',
            paymentStatus: 'pending',
        });

        // Create order item
        await db.insert(orderItems).values({
            id: `${orderId}_item_1`,
            orderId: orderId,
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            originalPrice: product.price,
            finalPrice: Math.round(product.price * (1 - discountPercent / 100)),
            discountPercent: discountPercent,
        });

        // Save customer info
        await db.insert(customerInfo).values({
            id: `CUST-${Date.now()}`,
            orderId: orderId,
            name: params.customerName,
            phone: params.customerPhone,
            address: params.customerAddress,
            city: params.customerCity,
            email: '',
        });

        // Update stock
        await db.update(products)
            .set({ stock: product.stock - quantity })
            .where(eq(products.id, product.id));

        return JSON.stringify({
            success: true,
            orderId: orderId,
            invoice: {
                orderId,
                productName: product.name,
                quantity,
                originalPrice: product.price,
                discountPercent,
                discountAmount,
                finalAmount,
                paymentMethod: params.paymentMethod || 'cod',
                customer: {
                    name: params.customerName,
                    phone: params.customerPhone,
                    address: params.customerAddress,
                    city: params.customerCity
                }
            },
            message: `Order ${orderId} created successfully! Total: ৳${finalAmount.toLocaleString()}`
        });
    } catch (error) {
        console.error('Create invoice error:', error);
        return JSON.stringify({ success: false, error: 'Failed to create invoice' });
    }
}

/**
 * Execute negotiate_price function
 */
export async function executeNegotiatePrice(params: NegotiatePriceParams, sessionId: string): Promise<string> {
    try {
        // Get product
        const productResult = await db.select().from(products).where(eq(products.id, params.productId));
        const product = productResult[0];

        if (!product) {
            return JSON.stringify({ success: false, error: 'Product not found' });
        }

        const maxDiscount = product.maxDiscount || 15;
        const requested = params.requestedDiscount || 0;
        let offeredDiscount = params.counterOffer || 0;

        // Cap at max discount
        offeredDiscount = Math.min(offeredDiscount, maxDiscount);

        // Negotiation logic
        let accepted = false;
        let message = '';

        if (requested <= maxDiscount) {
            accepted = true;
            offeredDiscount = requested;
            message = `Great! I can offer you ${offeredDiscount}% off on ${product.name}. That brings the price down to ৳${Math.round(product.price * (1 - offeredDiscount / 100)).toLocaleString()}!`;
        } else if (offeredDiscount > 0) {
            message = `I understand you're looking for a better deal. The best I can offer is ${offeredDiscount}% off, bringing the price to ৳${Math.round(product.price * (1 - offeredDiscount / 100)).toLocaleString()}. Would that work for you?`;
        } else {
            offeredDiscount = Math.min(10, maxDiscount); // Default counter-offer
            message = `I'd love to help you save! I can offer ${offeredDiscount}% off, making it ৳${Math.round(product.price * (1 - offeredDiscount / 100)).toLocaleString()}. Shall we proceed?`;
        }

        // Save negotiated discount to session (for later order creation)
        try {
            const sessionResult = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, sessionId));
            const session = sessionResult[0];

            if (session) {
                const discounts = (session.negotiatedDiscounts as Record<string, number>) || {};
                discounts[params.productId] = offeredDiscount;
                await db.update(chatSessions)
                    .set({
                        negotiatedDiscounts: discounts,
                        updatedAt: new Date()
                    })
                    .where(eq(chatSessions.sessionId, sessionId));
            }
        } catch (e) {
            console.error('Failed to save negotiated discount:', e);
        }

        return JSON.stringify({
            success: true,
            productId: params.productId,
            productName: product.name,
            originalPrice: product.price,
            discountPercent: offeredDiscount,
            discountedPrice: Math.round(product.price * (1 - offeredDiscount / 100)),
            accepted,
            message
        });
    } catch (error) {
        console.error('Negotiate price error:', error);
        return JSON.stringify({ success: false, error: 'Failed to process negotiation' });
    }
}

/**
 * Execute save_customer_preference function
 */
export async function executeSavePreference(params: SavePreferenceParams, sessionId: string): Promise<string> {
    try {
        const sessionResult = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, sessionId));
        const session = sessionResult[0];

        if (session) {
            const preferences = (session.customerPreferences as Record<string, string>) || {};
            preferences[params.preferenceType] = params.value;

            await db.update(chatSessions)
                .set({
                    customerPreferences: preferences,
                    updatedAt: new Date()
                })
                .where(eq(chatSessions.sessionId, sessionId));

            return JSON.stringify({
                success: true,
                message: `Noted! I'll remember you prefer ${params.value} in ${params.preferenceType}.`
            });
        }

        return JSON.stringify({ success: true, message: 'Preference noted.' });
    } catch (error) {
        console.error('Save preference error:', error);
        return JSON.stringify({ success: false, error: 'Failed to save preference' });
    }
}

// ============================================
// CHAT SESSION MANAGEMENT
// ============================================

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

/**
 * Get or create chat session
 */
export async function getOrCreateSession(sessionId: string): Promise<{
    id: string;
    messages: ChatMessage[];
    preferences: Record<string, string>;
    negotiatedDiscounts: Record<string, number>;
}> {
    try {
        const result = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, sessionId));

        if (result.length > 0) {
            const session = result[0];
            return {
                id: session.id,
                messages: (session.messages as ChatMessage[]) || [],
                preferences: (session.customerPreferences as Record<string, string>) || {},
                negotiatedDiscounts: (session.negotiatedDiscounts as Record<string, number>) || {}
            };
        }

        // Create new session
        const newId = uuidv4();
        await db.insert(chatSessions).values({
            id: newId,
            sessionId: sessionId,
            messages: [],
            customerPreferences: {},
            negotiatedDiscounts: {}
        });

        return {
            id: newId,
            messages: [],
            preferences: {},
            negotiatedDiscounts: {}
        };
    } catch (error) {
        console.error('Session error:', error);
        return {
            id: uuidv4(),
            messages: [],
            preferences: {},
            negotiatedDiscounts: {}
        };
    }
}

/**
 * Save messages to session
 */
export async function saveSessionMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
    try {
        await db.update(chatSessions)
            .set({
                messages: messages,
                updatedAt: new Date()
            })
            .where(eq(chatSessions.sessionId, sessionId));
    } catch (error) {
        console.error('Failed to save session messages:', error);
    }
}

/**
 * Calculate discount from formula
 */
export function calculateDiscount(originalPrice: number, discountPercent: number): number {
    return Math.round(originalPrice * (1 - discountPercent / 100));
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
    return `৳${price.toLocaleString()}`;
}
