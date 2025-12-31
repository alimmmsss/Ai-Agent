'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, chatMessages } from '@/lib/db';
import { eq } from 'drizzle-orm';

// Get single conversation with all messages
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const conversation = await db.query.conversations.findFirst({
            where: eq(conversations.id, id),
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        const messages = await db.query.chatMessages.findMany({
            where: eq(chatMessages.conversationId, id),
            orderBy: [chatMessages.createdAt],
        });

        // Mark all messages as read and reset unread count
        await db.update(chatMessages)
            .set({ isRead: true })
            .where(eq(chatMessages.conversationId, id));

        await db.update(conversations)
            .set({ unreadCount: 0 })
            .where(eq(conversations.id, id));

        return NextResponse.json({
            conversation,
            messages,
        });

    } catch (error) {
        console.error('Error fetching conversation:', error);
        return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
    }
}

// Update conversation status (close/reopen)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        if (!status || !['open', 'closed'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        await db.update(conversations)
            .set({ status })
            .where(eq(conversations.id, id));

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error updating conversation:', error);
        return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
    }
}
