import { v4 as uuidv4 } from 'uuid';
import type { Product, Order, OrderItem, CustomerInfo, ApprovalRequest, Settings } from '../types';

// In-memory storage (will be replaced with file-based in API routes)
let orders: Order[] = [];
let approvals: ApprovalRequest[] = [];

// Product Tools
export function searchCatalog(query: string, products: Product[]): Product[] {
    const lowerQuery = query.toLowerCase();
    return products.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery) ||
        p.category.toLowerCase().includes(lowerQuery)
    );
}

export function getProductById(productId: string, products: Product[]): Product | undefined {
    return products.find(p => p.id === productId);
}

export function checkInventory(productId: string, quantity: number, products: Product[]): { available: boolean; stock: number } {
    const product = products.find(p => p.id === productId);
    if (!product) return { available: false, stock: 0 };
    return { available: product.stock >= quantity, stock: product.stock };
}

// Order Tools
export function createOrder(items: OrderItem[]): Order {
    const totalAmount = items.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
    const finalAmount = items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);

    const order: Order = {
        id: `ORD-${uuidv4().slice(0, 8).toUpperCase()}`,
        items,
        totalAmount,
        discountAmount: totalAmount - finalAmount,
        finalAmount,
        status: 'pending_approval',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    return order;
}

export function calculateDiscount(originalPrice: number, discountPercent: number): number {
    return Math.round(originalPrice * (1 - discountPercent / 100));
}

// Approval Tools
export function createApprovalRequest(
    order: Order,
    type: 'deal' | 'shipping'
): ApprovalRequest {
    const avgDiscount = order.items.reduce((sum, item) => sum + item.discountPercent, 0) / order.items.length;

    const approval: ApprovalRequest = {
        id: `APR-${uuidv4().slice(0, 8).toUpperCase()}`,
        orderId: order.id,
        type,
        summary: type === 'deal'
            ? `New order with ${order.items.length} item(s) - Total: ৳${order.finalAmount}`
            : `Shipping approval for order ${order.id} to ${order.customerInfo?.city}`,
        items: order.items,
        totalAmount: order.finalAmount,
        discountPercent: Math.round(avgDiscount),
        customerInfo: order.customerInfo,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    return approval;
}

// Format helpers
export function formatPrice(amount: number, currency: string = 'BDT'): string {
    if (currency === 'BDT') {
        return `৳${amount.toLocaleString()}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
}

export function formatOrderSummary(order: Order): string {
    const items = order.items.map(item =>
        `• ${item.productName} x${item.quantity} - ${formatPrice(item.finalPrice * item.quantity)}`
    ).join('\n');

    return `
📦 Order Summary
${items}

💰 Subtotal: ${formatPrice(order.totalAmount)}
🏷️ Discount: -${formatPrice(order.discountAmount)}
✅ Total: ${formatPrice(order.finalAmount)}
  `.trim();
}

export function formatProductCard(product: Product): string {
    return `
📱 **${product.name}**
${product.description}

💰 Price: ${formatPrice(product.price)}
📦 In Stock: ${product.stock} units
🏷️ Category: ${product.category}
  `.trim();
}
