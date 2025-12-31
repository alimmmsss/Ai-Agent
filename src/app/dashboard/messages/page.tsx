'use client';

import { useState, useEffect } from 'react';
import { Send, MessageCircle, Clock, User, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface Message {
    id: string;
    role: 'customer' | 'owner';
    content: string;
    createdAt: string;
    isRead: boolean;
}

interface Conversation {
    id: string;
    sessionId: string;
    customerName: string | null;
    customerEmail: string | null;
    status: 'open' | 'closed';
    unreadCount: number;
    lastMessageAt: string;
    createdAt: string;
    lastMessage: string;
    lastMessageRole: string;
    messageCount: number;
}

export default function MessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyInput, setReplyInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

    // Fetch all conversations
    const fetchConversations = async () => {
        try {
            const response = await fetch('/api/chat/conversations');
            const data = await response.json();
            setConversations(data.conversations || []);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch messages for selected conversation
    const fetchMessages = async (conversationId: string) => {
        try {
            const response = await fetch(`/api/chat/conversations/${conversationId}`);
            const data = await response.json();
            setMessages(data.messages || []);

            // Refresh conversation list to update unread counts
            fetchConversations();
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    useEffect(() => {
        fetchConversations();

        // Poll for new conversations every 10 seconds
        const interval = setInterval(fetchConversations, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages(selectedConversation);

            // Poll for new messages every 5 seconds when conversation is open
            const interval = setInterval(() => fetchMessages(selectedConversation), 5000);
            return () => clearInterval(interval);
        }
    }, [selectedConversation]);

    const handleSendReply = async () => {
        if (!replyInput.trim() || !selectedConversation || isSending) return;

        setIsSending(true);
        try {
            const response = await fetch('/api/chat/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: selectedConversation,
                    message: replyInput.trim(),
                }),
            });

            if (response.ok) {
                setReplyInput('');
                fetchMessages(selectedConversation);
            }
        } catch (error) {
            console.error('Error sending reply:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleCloseConversation = async (conversationId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'open' ? 'closed' : 'open';
        try {
            await fetch(`/api/chat/conversations/${conversationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            fetchConversations();
        } catch (error) {
            console.error('Error updating conversation:', error);
        }
    };

    const filteredConversations = conversations.filter(conv => {
        if (filter === 'all') return true;
        return conv.status === filter;
    });

    const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

    return (
        <div className="min-h-screen bg-[#111827] pt-16 lg:pt-0">
            <div className="p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <MessageCircle className="text-indigo-500" />
                            Customer Messages
                            {totalUnread > 0 && (
                                <span className="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full">
                                    {totalUnread}
                                </span>
                            )}
                        </h1>
                        <p className="text-gray-400 mt-1">Respond to customer inquiries</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('open')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'open'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            Open
                        </button>
                        <button
                            onClick={() => setFilter('closed')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'closed'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            Closed
                        </button>
                        <button
                            onClick={fetchConversations}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Conversations List */}
                    <div className="lg:col-span-1 bg-[#1f2937] rounded-xl border border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-700">
                            <h2 className="text-lg font-semibold text-white">Conversations</h2>
                        </div>
                        <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                            {isLoading ? (
                                <div className="p-8 text-center text-gray-400">
                                    Loading conversations...
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No conversations yet</p>
                                    <p className="text-sm mt-2">Customer messages will appear here</p>
                                </div>
                            ) : (
                                filteredConversations.map((conv) => (
                                    <button
                                        key={conv.id}
                                        onClick={() => setSelectedConversation(conv.id)}
                                        className={`w-full p-4 text-left border-b border-gray-700 hover:bg-gray-700/50 transition-colors ${selectedConversation === conv.id ? 'bg-gray-700/70' : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-600/20 rounded-full flex items-center justify-center">
                                                    <User size={20} className="text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">
                                                        {conv.customerName || 'Anonymous Customer'}
                                                    </p>
                                                    <p className="text-sm text-gray-400 truncate max-w-[180px]">
                                                        {conv.lastMessage || 'No messages'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {conv.unreadCount > 0 && (
                                                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                                        {conv.unreadCount}
                                                    </span>
                                                )}
                                                <span className={`text-xs px-2 py-0.5 rounded ${conv.status === 'open'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {conv.status}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                            <Clock size={12} />
                                            {new Date(conv.lastMessageAt).toLocaleString()}
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat View */}
                    <div className="lg:col-span-2 bg-[#1f2937] rounded-xl border border-gray-700 overflow-hidden flex flex-col min-h-[500px]">
                        {selectedConversation ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">
                                            {conversations.find(c => c.id === selectedConversation)?.customerName || 'Anonymous Customer'}
                                        </h2>
                                        <p className="text-sm text-gray-400">
                                            {conversations.find(c => c.id === selectedConversation)?.customerEmail || 'No email provided'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleCloseConversation(
                                            selectedConversation,
                                            conversations.find(c => c.id === selectedConversation)?.status || 'open'
                                        )}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${conversations.find(c => c.id === selectedConversation)?.status === 'open'
                                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                            }`}
                                    >
                                        {conversations.find(c => c.id === selectedConversation)?.status === 'open' ? (
                                            <>
                                                <XCircle size={16} />
                                                Close
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={16} />
                                                Reopen
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#111827]">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${msg.role === 'owner' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[70%] p-3 rounded-2xl ${msg.role === 'owner'
                                                        ? 'bg-indigo-600 text-white rounded-br-md'
                                                        : 'bg-gray-700 text-white rounded-bl-md'
                                                    }`}
                                            >
                                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                <p className={`text-xs mt-1 ${msg.role === 'owner' ? 'text-indigo-200' : 'text-gray-400'
                                                    }`}>
                                                    {msg.role === 'owner' ? 'You' : 'Customer'} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Reply Input */}
                                <div className="p-4 border-t border-gray-700">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={replyInput}
                                            onChange={(e) => setReplyInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                                            placeholder="Type your reply..."
                                            className="flex-1 px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            disabled={isSending}
                                        />
                                        <button
                                            onClick={handleSendReply}
                                            disabled={isSending || !replyInput.trim()}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <Send size={18} />
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <MessageCircle size={64} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">Select a conversation</p>
                                    <p className="text-sm mt-2">Choose a conversation from the list to view messages</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
