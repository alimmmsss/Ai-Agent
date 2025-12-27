// Product Types
export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    stock: number;
    category: string;
    image: string;
    maxDiscount: number;
}

// Order Types
export type OrderStatus =
    | 'pending_approval'     // Waiting for owner to approve the deal
    | 'approved'             // Owner approved, collecting customer info
    | 'info_collected'       // Customer info collected, ready for payment
    | 'payment_pending'      // Waiting for payment
    | 'paid'                 // Payment confirmed
    | 'shipping_pending'     // Waiting for shipping approval
    | 'shipping_approved'    // Owner approved shipping
    | 'shipped'              // Order shipped
    | 'delivered'            // Order delivered
    | 'cancelled'            // Order cancelled
    | 'rejected';            // Deal rejected by owner

export interface CustomerInfo {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    area?: string;
    notes?: string;
}

export interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    originalPrice: number;
    finalPrice: number;
    discountPercent: number;
}

export interface Order {
    id: string;
    items: OrderItem[];
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    status: OrderStatus;
    customerInfo?: CustomerInfo;
    paymentMethod?: 'cod' | 'stripe' | 'paypal' | 'bkash';
    paymentStatus?: 'pending' | 'completed' | 'failed';
    trackingNumber?: string;
    courierName?: string;
    ownerNotes?: string;
    counterOffer?: string;
    createdAt: string;
    updatedAt: string;
    approvedAt?: string;
    paidAt?: string;
    shippedAt?: string;
}

// Chat Types
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    metadata?: {
        productSuggestions?: Product[];
        orderSummary?: Partial<Order>;
        awaitingApproval?: boolean;
        awaitingInfo?: 'name' | 'phone' | 'address' | 'confirmation';
    };
}

export interface Conversation {
    id: string;
    messages: ChatMessage[];
    currentOrderId?: string;
    status: 'active' | 'completed' | 'abandoned';
    createdAt: string;
    updatedAt: string;
}

// Settings Types
export interface Settings {
    storeName: string;
    storeDescription: string;
    currency: string;
    ownerEmail: string;

    ai: {
        provider: 'anthropic' | 'google';
        apiKey: string;
        model: string;
        maxDiscountPercent: number;
    };

    payments: {
        cashOnDelivery: { enabled: boolean };
        stripe: {
            enabled: boolean;
            publicKey: string;
            secretKey: string;
        };
        paypal: {
            enabled: boolean;
            clientId: string;
            clientSecret: string;
            mode: 'sandbox' | 'live';
        };
        bkash: {
            enabled: boolean;
            appKey: string;
            appSecret: string;
            username: string;
            password: string;
            mode: 'sandbox' | 'live';
        };
    };

    courier: {
        pathao: {
            enabled: boolean;
            clientId: string;
            clientSecret: string;
            username: string;
            password: string;
        };
        steadfast: {
            enabled: boolean;
            apiKey: string;
            secretKey: string;
        };
        manual: {
            enabled: boolean;
        };
    };

    notifications: {
        emailNotifications: boolean;
        soundAlerts: boolean;
    };
}

// Approval Types
export interface ApprovalRequest {
    id: string;
    orderId: string;
    type: 'deal' | 'shipping';
    summary: string;
    items: OrderItem[];
    totalAmount: number;
    discountPercent: number;
    customerInfo?: CustomerInfo;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    respondedAt?: string;
    counterOffer?: string;
}
