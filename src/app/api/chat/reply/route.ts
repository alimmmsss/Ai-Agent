'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, chatMessages } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Admin sends a reply to a conversation
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { conversationId, message } = body;

        if (!conversationId || !message) {
            return NextResponse.json({ error: 'Conversation ID and message are required' }, { status: 400 });
        }

        // Verify conversation exists
        const conversation = await db.query.conversations.findFirst({
            where: eq(conversations.id, conversationId),
        });

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        // Insert the owner's reply
        const messageId = uuidv4();
        await db.insert(chatMessages).values({
            id: messageId,
            conversationId,
            role: 'owner',
            content: message,
            isRead: true, // Owner's own message is already "read"
        });

        // Update conversation last message time
        await db.update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, conversationId));

        return NextResponse.json({
            success: true,
            messageId,
        });

    } catch (error) {
        console.error('Chat reply error:', error);
        return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
    }
}
