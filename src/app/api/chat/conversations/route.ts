'use server';

import { NextRequest, NextResponse } from 'next/server';
import { db, conversations, chatMessages } from '@/lib/db';
import { desc, eq, sql } from 'drizzle-orm';

// Get all conversations for admin dashboard  
export async function GET(request: NextRequest) {
    try {
        // Get all conversations with their message counts
        const allConversations = await db.query.conversations.findMany({
            orderBy: [desc(conversations.lastMessageAt)],
        });

        // Get last message for each conversation
        const conversationsWithDetails = await Promise.all(
            allConversations.map(async (conv) => {
                const lastMessage = await db.query.chatMessages.findFirst({
                    where: eq(chatMessages.conversationId, conv.id),
                    orderBy: [desc(chatMessages.createdAt)],
                });

                const messageCount = await db.select({ count: sql<number>`count(*)` })
                    .from(chatMessages)
                    .where(eq(chatMessages.conversationId, conv.id));

                return {
                    ...conv,
                    lastMessage: lastMessage?.content || '',
                    lastMessageRole: lastMessage?.role || 'customer',
                    messageCount: messageCount[0]?.count || 0,
                };
            })
        );

        return NextResponse.json({ conversations: conversationsWithDetails });

    } catch (error) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }
}

// Get total unread count for badge
export async function HEAD(request: NextRequest) {
    try {
        const result = await db.select({ total: sql<number>`sum(unread_count)` })
            .from(conversations)
            .where(eq(conversations.status, 'open'));

        const unreadCount = result[0]?.total || 0;

        return new NextResponse(null, {
            headers: {
                'X-Unread-Count': String(unreadCount),
            },
        });
    } catch (error) {
        return new NextResponse(null, {
            headers: {
                'X-Unread-Count': '0',
            },
        });
    }
}
