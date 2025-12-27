'use client';

import { useState } from 'react';

export default function NewsletterForm() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !email.includes('@')) {
            setStatus('error');
            setMessage('Please enter a valid email');
            return;
        }

        setStatus('loading');

        try {
            const response = await fetch('/api/subscribers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || 'Successfully subscribed!');
                setEmail('');
            } else {
                setStatus('error');
                setMessage(data.error || 'Failed to subscribe');
            }
        } catch {
            setStatus('error');
            setMessage('Something went wrong. Please try again.');
        }

        // Reset status after 3 seconds
        setTimeout(() => {
            setStatus('idle');
            setMessage('');
        }, 3000);
    };

    return (
        <div>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    disabled={status === 'loading'}
                    className="flex-1 px-4 py-2 bg-white/5 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {status === 'loading' ? '...' : 'Subscribe'}
                </button>
            </form>

            {message && (
                <p className={`mt-2 text-sm ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {message}
                </p>
            )}
        </div>
    );
}
