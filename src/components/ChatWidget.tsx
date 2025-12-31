'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, MessageCircle, Loader2, Clock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Message {
    id: string;
    role: 'customer' | 'owner';
    content: string;
    createdAt: string;
}

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isWaiting, setIsWaiting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize session ID from localStorage
    useEffect(() => {
        let storedSessionId = localStorage.getItem('chatSessionId');
        if (!storedSessionId) {
            storedSessionId = uuidv4();
            localStorage.setItem('chatSessionId', storedSessionId);
        }
        setSessionId(storedSessionId);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch existing messages on mount and session ID change
    const fetchMessages = useCallback(async () => {
        if (!sessionId) return;

        try {
            const response = await fetch(`/api/chat/send?sessionId=${sessionId}`);
            const data = await response.json();

            if (data.messages && data.messages.length > 0) {
                setMessages(data.messages);
                setConversationId(data.conversationId);

                // Check if waiting for owner response
                const lastMessage = data.messages[data.messages.length - 1];
                setIsWaiting(lastMessage.role === 'customer');
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    }, [sessionId]);

    // Initial fetch and polling setup
    useEffect(() => {
        if (sessionId && isOpen) {
            fetchMessages();

            // Poll for new messages every 5 seconds
            pollIntervalRef.current = setInterval(fetchMessages, 5000);
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [sessionId, isOpen, fetchMessages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading || !sessionId) return;

        const messageContent = input.trim();

        // Optimistically add message to UI
        const tempMessage: Message = {
            id: uuidv4(),
            role: 'customer',
            content: messageContent,
            createdAt: new Date().toISOString(),
        };

        setMessages(prev => [...prev, tempMessage]);
        setInput('');
        setIsLoading(true);
        setIsWaiting(true);

        try {
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    message: messageContent,
                }),
            });

            const data = await response.json();

            if (data.conversationId) {
                setConversationId(data.conversationId);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
            setIsWaiting(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            {/* Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform duration-300 z-50"
                >
                    <MessageCircle size={28} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 w-full sm:w-96 h-full sm:h-[600px] bg-white sm:rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden sm:border sm:border-gray-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <MessageCircle size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Customer Support</h3>
                                <p className="text-white/70 text-sm">We typically reply within minutes</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/70 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {/* Welcome message if no messages */}
                        {messages.length === 0 && (
                            <div className="flex justify-start">
                                <div className="max-w-[80%] p-3 rounded-2xl bg-white text-gray-800 shadow-sm rounded-bl-md border border-gray-100">
                                    <p className="text-sm">
                                        Hello! 👋 How can we help you today? Send us a message and our team will respond as soon as possible.
                                    </p>
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'customer' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'customer'
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                                        : 'bg-white text-gray-800 shadow-sm rounded-bl-md border border-gray-100'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    <p className={`text-xs mt-1 ${msg.role === 'customer' ? 'text-white/60' : 'text-gray-400'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Waiting indicator */}
                        {isWaiting && !isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 flex items-center gap-2 text-gray-500">
                                    <Clock size={16} className="animate-pulse" />
                                    <span className="text-sm">Waiting for reply...</span>
                                </div>
                            </div>
                        )}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                                    <Loader2 size={20} className="animate-spin text-indigo-600" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message..."
                                className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 placeholder-gray-500"
                                disabled={isLoading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={isLoading || !input.trim()}
                                className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:shadow-lg transition-shadow"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
