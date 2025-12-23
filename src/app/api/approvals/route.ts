import { NextRequest, NextResponse } from 'next/server';
import type { Order, ApprovalRequest } from '@/lib/types';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

function readJsonFile<T>(filename: string): T {
    const filePath = path.join(process.cwd(), 'src', 'data', filename);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

function writeJsonFile(filename: string, data: unknown): void {
    const filePath = path.join(process.cwd(), 'src', 'data', filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// In-memory approval storage (would use DB in production)
let approvals: ApprovalRequest[] = [];

// GET pending approvals
export async function GET() {
    try {
        const ordersData = readJsonFile<{ orders: Order[] }>('orders.json');

        // Create approval requests from pending orders
        const pendingOrders = ordersData.orders.filter(o =>
            o.status === 'pending_approval' || o.status === 'shipping_pending'
        );

        const approvalRequests: ApprovalRequest[] = pendingOrders.map(order => ({
            id: `APR-${order.id}`,
            orderId: order.id,
            type: order.status === 'pending_approval' ? 'deal' : 'shipping',
            summary: order.status === 'pending_approval'
                ? `New order: ${order.items.map(i => i.productName).join(', ')}`
                : `Shipping for ${order.customerInfo?.name} to ${order.customerInfo?.city}`,
            items: order.items,
            totalAmount: order.finalAmount,
            discountPercent: order.items[0]?.discountPercent || 0,
            customerInfo: order.customerInfo,
            status: 'pending',
            createdAt: order.createdAt
        }));

        return NextResponse.json(approvalRequests);
    } catch (error) {
        console.error('Error getting approvals:', error);
        return NextResponse.json([], { status: 200 });
    }
}

// POST - Approve or reject
export async function POST(request: NextRequest) {
    try {
        const { orderId, action, counterOffer, notes } = await request.json();

        if (!orderId || !action) {
            return NextResponse.json(
                { error: 'orderId and action are required' },
                { status: 400 }
            );
        }

        const ordersData = readJsonFile<{ orders: Order[] }>('orders.json');
        const orderIndex = ordersData.orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const order = ordersData.orders[orderIndex];
        const now = new Date().toISOString();

        if (action === 'approve') {
            if (order.status === 'pending_approval') {
                // Deal approved - move to info collection
                ordersData.orders[orderIndex] = {
                    ...order,
                    status: 'approved',
                    approvedAt: now,
                    updatedAt: now,
                    ownerNotes: notes
                };
            } else if (order.status === 'shipping_pending') {
                // Shipping approved - move to shipped
                ordersData.orders[orderIndex] = {
                    ...order,
                    status: 'shipping_approved',
                    shippedAt: now,
                    updatedAt: now,
                    ownerNotes: notes
                };
            }
        } else if (action === 'reject') {
            ordersData.orders[orderIndex] = {
                ...order,
                status: 'rejected',
                counterOffer: counterOffer || undefined,
                updatedAt: now,
                ownerNotes: notes
            };
        }

        writeJsonFile('orders.json', ordersData);

        return NextResponse.json({
            success: true,
            order: ordersData.orders[orderIndex]
        });
    } catch (error) {
        console.error('Error processing approval:', error);
        return NextResponse.json(
            { error: 'Failed to process approval' },
            { status: 500 }
        );
    }
}
