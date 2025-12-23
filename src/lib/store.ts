import { create } from 'zustand';
import type { ChatMessage, Order, Product, ApprovalRequest, Settings } from './types';

interface StoreState {
    // Chat
    messages: ChatMessage[];
    isTyping: boolean;
    conversationId: string | null;

    // Orders
    orders: Order[];
    currentOrder: Order | null;

    // Approvals
    pendingApprovals: ApprovalRequest[];

    // Products
    products: Product[];

    // Settings
    settings: Settings | null;

    // Notifications
    unreadApprovals: number;

    // Actions
    addMessage: (message: ChatMessage) => void;
    setTyping: (typing: boolean) => void;
    setOrders: (orders: Order[]) => void;
    setCurrentOrder: (order: Order | null) => void;
    updateOrderStatus: (orderId: string, status: Order['status']) => void;
    setApprovals: (approvals: ApprovalRequest[]) => void;
    addApproval: (approval: ApprovalRequest) => void;
    setProducts: (products: Product[]) => void;
    setSettings: (settings: Settings) => void;
    clearMessages: () => void;
    decrementUnread: () => void;
}

export const useStore = create<StoreState>((set) => ({
    // Initial state
    messages: [],
    isTyping: false,
    conversationId: null,
    orders: [],
    currentOrder: null,
    pendingApprovals: [],
    products: [],
    settings: null,
    unreadApprovals: 0,

    // Actions
    addMessage: (message) => set((state) => ({
        messages: [...state.messages, message]
    })),

    setTyping: (typing) => set({ isTyping: typing }),

    setOrders: (orders) => set({ orders }),

    setCurrentOrder: (order) => set({ currentOrder: order }),

    updateOrderStatus: (orderId, status) => set((state) => ({
        orders: state.orders.map(o =>
            o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o
        ),
        currentOrder: state.currentOrder?.id === orderId
            ? { ...state.currentOrder, status, updatedAt: new Date().toISOString() }
            : state.currentOrder
    })),

    setApprovals: (approvals) => set({
        pendingApprovals: approvals,
        unreadApprovals: approvals.filter(a => a.status === 'pending').length
    }),

    addApproval: (approval) => set((state) => ({
        pendingApprovals: [...state.pendingApprovals, approval],
        unreadApprovals: state.unreadApprovals + 1
    })),

    setProducts: (products) => set({ products }),

    setSettings: (settings) => set({ settings }),

    clearMessages: () => set({ messages: [], conversationId: null, currentOrder: null }),

    decrementUnread: () => set((state) => ({
        unreadApprovals: Math.max(0, state.unreadApprovals - 1)
    }))
}));
