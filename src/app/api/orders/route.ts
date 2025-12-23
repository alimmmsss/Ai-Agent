import { NextRequest, NextResponse } from 'next/server';
import type { Order } from '@/lib/types';
import fs from 'fs';
import path from 'path';

function readJsonFile<T>(filename: string): T {
    const filePath = path.join(process.cwd(), 'src', 'data', filename);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

function writeJsonFile(filename: string, data: unknown): void {
    const filePath = path.join(process.cwd(), 'src', 'data', filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// GET all orders
export async function GET() {
    try {
        const data = readJsonFile<{ orders: Order[] }>('orders.json');
        return NextResponse.json(data.orders);
    } catch (error) {
        console.error('Error reading orders:', error);
        return NextResponse.json([], { status: 200 });
    }
}

// POST - Create new order
export async function POST(request: NextRequest) {
    try {
        const order = await request.json();
        const data = readJsonFile<{ orders: Order[] }>('orders.json');
        data.orders.push(order);
        writeJsonFile('orders.json', data);
        return NextResponse.json(order, { status: 201 });
    } catch (error) {
        console.error('Error creating order:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}

// PATCH - Update order
export async function PATCH(request: NextRequest) {
    try {
        const { orderId, updates } = await request.json();
        const data = readJsonFile<{ orders: Order[] }>('orders.json');

        const orderIndex = data.orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        data.orders[orderIndex] = {
            ...data.orders[orderIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        writeJsonFile('orders.json', data);
        return NextResponse.json(data.orders[orderIndex]);
    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}
