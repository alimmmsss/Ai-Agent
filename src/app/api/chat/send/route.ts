'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, chatMessages } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Customer sends a message
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sessionId, message, customerName, customerEmail } = body;

        if (!sessionId || !message) {
            return NextResponse.json({ error: 'Session ID and message are required' }, { status: 400 });
        }

        // Find existing conversation or create new one
        let conversation = await db.query.conversations.findFirst({
            where: eq(conversations.sessionId, sessionId),
        });

        const conversationId = conversation?.id || uuidv4();

        if (!conversation) {
            // Create new conversation
            await db.insert(conversations).values({
                id: conversationId,
                sessionId,
                customerName: customerName || null,
                customerEmail: customerEmail || null,
                status: 'open',
                unreadCount: 1,
                lastMessageAt: new Date(),
            });
        } else {
            // Update existing conversation
            await db.update(conversations)
                .set({
                    unreadCount: (conversation.unreadCount || 0) + 1,
                    lastMessageAt: new Date(),
                    customerName: customerName || conversation.customerName,
                    customerEmail: customerEmail || conversation.customerEmail,
                })
                .where(eq(conversations.id, conversationId));
        }

        // Insert the customer's message
        const messageId = uuidv4();
        await db.insert(chatMessages).values({
            id: messageId,
            conversationId,
            role: 'customer',
            content: message,
            isRead: false,
        });

        return NextResponse.json({
            success: true,
            conversationId,
            messageId,
            message: 'Message sent! Our team will respond shortly.',
        });

    } catch (error) {
        console.error('Chat send error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}

// Customer polls for new messages
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const lastMessageId = searchParams.get('lastMessageId');

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        // Find conversation
        const conversation = await db.query.conversations.findFirst({
            where: eq(conversations.sessionId, sessionId),
        });

        if (!conversation) {
            return NextResponse.json({ messages: [] });
        }

        // Get all messages for this conversation
        const messages = await db.query.chatMessages.findMany({
            where: eq(chatMessages.conversationId, conversation.id),
            orderBy: [chatMessages.createdAt],
        });

        return NextResponse.json({
            conversationId: conversation.id,
            messages: messages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.createdAt,
            })),
        });

    } catch (error) {
        console.error('Chat fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}
