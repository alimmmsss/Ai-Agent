'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import CustomerNav from '@/components/CustomerNav';
import { MessageCircle, Send, Loader2, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Message {
    id: string;
    role: 'customer' | 'owner';
    content: string;
    createdAt: string;
}

export default function ContactPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
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

    // Fetch existing messages
    const fetchMessages = useCallback(async () => {
        if (!sessionId) return;

        try {
            const response = await fetch(`/api/chat/send?sessionId=${sessionId}`);
            const data = await response.json();

            if (data.messages && data.messages.length > 0) {
                setMessages(data.messages);

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
        if (sessionId) {
            fetchMessages();

            // Poll for new messages every 5 seconds
            pollIntervalRef.current = setInterval(fetchMessages, 5000);
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [sessionId, fetchMessages]);

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

            if (!data.success) {
                throw new Error('Failed to send message');
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
        <main className="min-h-screen bg-[#111827]">
            <CustomerNav />

            <section className="pt-24 md:pt-32 pb-12 md:pb-20 px-4 md:px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-8 md:mb-12">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 md:mb-4">
                            Contact Us
                        </h1>
                        <p className="text-base md:text-xl text-gray-400 max-w-2xl mx-auto px-2">
                            Chat with our support team for instant help, or use the contact information below.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                        {/* Chat Section */}
                        <div className="lg:col-span-2 bg-[#1f2937] rounded-xl md:rounded-2xl border border-gray-700 overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 md:p-4 flex items-center gap-3">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                                    <MessageCircle size={18} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-white font-semibold text-sm md:text-base">Customer Support</h3>
                                    <p className="text-white/70 text-xs md:text-sm">We typically reply within minutes</p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="h-[300px] sm:h-[350px] md:h-[400px] overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                                {/* Welcome message if no messages */}
                                {messages.length === 0 && (
                                    <div className="flex justify-start">
                                        <div className="max-w-[85%] sm:max-w-[80%] p-3 md:p-4 rounded-xl md:rounded-2xl bg-[#374151] text-white rounded-bl-md">
                                            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">
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
                                            className={`max-w-[85%] sm:max-w-[80%] p-3 md:p-4 rounded-xl md:rounded-2xl ${msg.role === 'customer'
                                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                                                : 'bg-[#374151] text-white rounded-bl-md'
                                                }`}
                                        >
                                            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                            <p className={`text-xs mt-1 ${msg.role === 'customer' ? 'text-white/60' : 'text-gray-400'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {/* Waiting indicator */}
                                {isWaiting && !isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-[#374151] p-3 md:p-4 rounded-xl md:rounded-2xl rounded-bl-md flex items-center gap-2 text-gray-400">
                                            <Clock size={16} className="animate-pulse" />
                                            <span className="text-xs sm:text-sm">Waiting for reply...</span>
                                        </div>
                                    </div>
                                )}

                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-[#374151] p-3 md:p-4 rounded-xl md:rounded-2xl rounded-bl-md">
                                            <Loader2 size={18} className="animate-spin text-indigo-400" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 md:p-4 border-t border-gray-700">
                                <div className="flex gap-2 md:gap-3">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Type your message..."
                                        className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-[#374151] rounded-lg md:rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        disabled={isLoading}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={isLoading || !input.trim()}
                                        className="px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg md:rounded-xl text-white disabled:opacity-50 hover:shadow-lg transition-all flex-shrink-0"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-4 md:space-y-6">
                            <div className="bg-[#1f2937] rounded-xl md:rounded-2xl border border-gray-700 p-4 md:p-6">
                                <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Quick Contact</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                            <Phone size={18} className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Phone</p>
                                            <p className="text-white">+880 1XXX-XXXXXX</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                            <Mail size={18} className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Email</p>
                                            <p className="text-white">contact@gadgetsstore.com</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-400">
                                        <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                            <MapPin size={18} className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Address</p>
                                            <p className="text-white">Dhaka, Bangladesh</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#1f2937] rounded-2xl border border-gray-700 p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Business Hours</h3>
                                <div className="flex items-center gap-3 text-gray-400">
                                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                        <Clock size={18} className="text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-white">Live Chat: 9AM - 9PM</p>
                                        <p className="text-sm text-gray-500">We respond within minutes</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
