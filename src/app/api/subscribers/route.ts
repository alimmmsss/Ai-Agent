import { NextRequest, NextResponse } from 'next/server';
import { db, subscribers } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET all subscribers
export async function GET() {
    try {
        const allSubscribers = await db
            .select()
            .from(subscribers)
            .orderBy(desc(subscribers.subscribedAt));
        return NextResponse.json(allSubscribers);
    } catch (error) {
        console.error('Error reading subscribers:', error);
        return NextResponse.json([], { status: 200 });
    }
}

// POST - Subscribe new email
export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json(
                { error: 'Valid email is required' },
                { status: 400 }
            );
        }

        // Check if already subscribed
        const existing = await db
            .select()
            .from(subscribers)
            .where(eq(subscribers.email, email.toLowerCase()));

        if (existing.length > 0) {
            if (existing[0].status === 'active') {
                return NextResponse.json(
                    { message: 'Already subscribed!' },
                    { status: 200 }
                );
            }
            // Reactivate subscription
            await db
                .update(subscribers)
                .set({ status: 'active', unsubscribedAt: null })
                .where(eq(subscribers.email, email.toLowerCase()));

            return NextResponse.json(
                { message: 'Welcome back! Subscription reactivated.' },
                { status: 200 }
            );
        }

        // Create new subscriber
        const newSubscriber = {
            id: `sub_${uuidv4().slice(0, 8)}`,
            email: email.toLowerCase(),
            status: 'active',
        };

        await db.insert(subscribers).values(newSubscriber);

        return NextResponse.json(
            { message: 'Successfully subscribed!' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error subscribing:', error);
        return NextResponse.json(
            { error: 'Failed to subscribe' },
            { status: 500 }
        );
    }
}

// DELETE - Unsubscribe
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');
        const id = searchParams.get('id');

        if (!email && !id) {
            return NextResponse.json(
                { error: 'Email or ID required' },
                { status: 400 }
            );
        }

        if (id) {
            await db
                .update(subscribers)
                .set({ status: 'unsubscribed', unsubscribedAt: new Date() })
                .where(eq(subscribers.id, id));
        } else if (email) {
            await db
                .update(subscribers)
                .set({ status: 'unsubscribed', unsubscribedAt: new Date() })
                .where(eq(subscribers.email, email.toLowerCase()));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error unsubscribing:', error);
        return NextResponse.json(
            { error: 'Failed to unsubscribe' },
            { status: 500 }
        );
    }
}
