import { NextRequest, NextResponse } from 'next/server';
import { db, orders, orderItems, customerInfo } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET all orders with items and customer info
export async function GET() {
    try {
        const allOrders = await db.select().from(orders);

        // Fetch items and customer info for each order
        const ordersWithDetails = await Promise.all(
            allOrders.map(async (order) => {
                const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
                const customer = await db.select().from(customerInfo).where(eq(customerInfo.orderId, order.id));

                return {
                    ...order,
                    items,
                    customerInfo: customer[0] || null,
                };
            })
        );

        return NextResponse.json(ordersWithDetails);
    } catch (error) {
        console.error('Error reading orders:', error);
        return NextResponse.json([], { status: 200 });
    }
}

// POST - Create new order
export async function POST(request: NextRequest) {
    try {
        const orderData = await request.json();

        // Insert order
        const newOrder = {
            id: orderData.id,
            totalAmount: orderData.totalAmount,
            discountAmount: orderData.discountAmount || 0,
            finalAmount: orderData.finalAmount,
            status: orderData.status || 'pending_approval',
            paymentMethod: orderData.paymentMethod,
            paymentStatus: orderData.paymentStatus || 'pending',
            trackingNumber: orderData.trackingNumber,
            courierName: orderData.courierName,
            ownerNotes: orderData.ownerNotes,
            counterOffer: orderData.counterOffer,
        };

        await db.insert(orders).values(newOrder);

        // Insert order items
        if (orderData.items && orderData.items.length > 0) {
            const itemsToInsert = orderData.items.map((item: {
                productId: string;
                productName: string;
                quantity: number;
                originalPrice: number;
                finalPrice: number;
                discountPercent?: number;
            }, index: number) => ({
                id: `${orderData.id}_item_${index}`,
                orderId: orderData.id,
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                originalPrice: item.originalPrice,
                finalPrice: item.finalPrice,
                discountPercent: item.discountPercent || 0,
            }));

            await db.insert(orderItems).values(itemsToInsert);
        }

        // Insert customer info if provided
        if (orderData.customerInfo) {
            await db.insert(customerInfo).values({
                id: `${orderData.id}_customer`,
                orderId: orderData.id,
                name: orderData.customerInfo.name,
                phone: orderData.customerInfo.phone,
                email: orderData.customerInfo.email,
                address: orderData.customerInfo.address,
                city: orderData.customerInfo.city,
                area: orderData.customerInfo.area,
                notes: orderData.customerInfo.notes,
            });
        }

        return NextResponse.json(orderData, { status: 201 });
    } catch (error) {
        console.error('Error creating order:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}

// PATCH - Update order
export async function PATCH(request: NextRequest) {
    try {
        const { orderId, updates } = await request.json();

        // Update order
        const orderUpdates: Record<string, unknown> = { updatedAt: new Date() };

        // Map fields to database columns
        const fieldMappings: Record<string, string> = {
            status: 'status',
            paymentMethod: 'paymentMethod',
            paymentStatus: 'paymentStatus',
            trackingNumber: 'trackingNumber',
            courierName: 'courierName',
            ownerNotes: 'ownerNotes',
            counterOffer: 'counterOffer',
            approvedAt: 'approvedAt',
            paidAt: 'paidAt',
            shippedAt: 'shippedAt',
        };

        for (const [key, value] of Object.entries(updates)) {
            if (fieldMappings[key]) {
                orderUpdates[fieldMappings[key]] = value;
            }
        }

        const result = await db
            .update(orders)
            .set(orderUpdates)
            .where(eq(orders.id, orderId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Update customer info if provided
        if (updates.customerInfo) {
            const existingCustomer = await db.select().from(customerInfo).where(eq(customerInfo.orderId, orderId));

            if (existingCustomer.length > 0) {
                await db.update(customerInfo)
                    .set(updates.customerInfo)
                    .where(eq(customerInfo.orderId, orderId));
            } else {
                await db.insert(customerInfo).values({
                    id: `${orderId}_customer`,
                    orderId: orderId,
                    ...updates.customerInfo,
                });
            }
        }

        // Fetch updated order with details
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
        const customer = await db.select().from(customerInfo).where(eq(customerInfo.orderId, orderId));

        return NextResponse.json({
            ...result[0],
            items,
            customerInfo: customer[0] || null,
        });
    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}
