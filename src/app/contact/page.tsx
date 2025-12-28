'use client';

import { useEffect, useState } from 'react';
import CustomerNav from '@/components/CustomerNav';
import { MessageCircle, Send, Loader2, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export default function ContactPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hello! 👋 Welcome to our store! I'm your AI sales assistant. How can I help you today? Feel free to ask about our products, prices, or anything else!",
            timestamp: new Date().toISOString()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: uuidv4(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.content,
                    conversationHistory: messages
                })
            });

            const data = await response.json();

            const assistantMessage: Message = {
                id: uuidv4(),
                role: 'assistant',
                content: data.message || "I'm sorry, I couldn't process that. Could you try again?",
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                id: uuidv4(),
                role: 'assistant',
                content: "I'm having trouble connecting. Please try again in a moment.",
                timestamp: new Date().toISOString()
            }]);
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
                            Chat with our AI assistant for instant help, or use the contact information below.
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
                                    <h3 className="text-white font-semibold text-sm md:text-base">AI Sales Assistant</h3>
                                    <p className="text-white/70 text-xs md:text-sm">Online • Ready to help</p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="h-[300px] sm:h-[350px] md:h-[400px] overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] sm:max-w-[80%] p-3 md:p-4 rounded-xl md:rounded-2xl ${msg.role === 'user'
                                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                                                : 'bg-[#374151] text-white rounded-bl-md'
                                                }`}
                                        >
                                            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-[#374151] p-3 md:p-4 rounded-xl md:rounded-2xl rounded-bl-md">
                                            <Loader2 size={18} className="animate-spin text-indigo-400" />
                                        </div>
                                    </div>
                                )}
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
                                            <p className="text-white">contact@aistore.com</p>
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
                                        <p className="text-white">AI Support: 24/7</p>
                                        <p className="text-sm text-gray-500">Human Support: 9AM - 9PM</p>
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
