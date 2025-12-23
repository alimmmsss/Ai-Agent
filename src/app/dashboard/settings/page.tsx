'use client';

import { useEffect, useState } from 'react';
import { Save, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import type { Settings } from '@/lib/types';

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            const res = await fetch('/api/settings');
            setSettings(await res.json());
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!settings) return;
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    }

    function updateSettings(path: string, value: unknown) {
        if (!settings) return;

        const keys = path.split('.');
        const newSettings = { ...settings };
        let current: Record<string, unknown> = newSettings;

        for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) };
            current = current[keys[i]] as Record<string, unknown>;
        }

        current[keys[keys.length - 1]] = value;
        setSettings(newSettings as Settings);
    }

    function toggleShowKey(key: string) {
        setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!settings) return null;

    return (
        <div className="max-w-4xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Settings</h1>
                    <p className="text-gray-400">Configure your AI agent, payments, and courier services</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {/* Success/Error Message */}
            {message && (
                <div className={`flex items-center gap-2 p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            <div className="space-y-6">
                {/* Store Settings */}
                <section className="bg-[#1f2937] rounded-xl border border-gray-700 p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Store Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Store Name</label>
                            <input
                                type="text"
                                value={settings.storeName}
                                onChange={(e) => updateSettings('storeName', e.target.value)}
                                className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Owner Email</label>
                            <input
                                type="email"
                                value={settings.ownerEmail}
                                onChange={(e) => updateSettings('ownerEmail', e.target.value)}
                                className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-gray-400 mb-1">Store Description</label>
                            <textarea
                                value={settings.storeDescription}
                                onChange={(e) => updateSettings('storeDescription', e.target.value)}
                                className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white resize-none h-20"
                            />
                        </div>
                    </div>
                </section>

                {/* AI Settings */}
                <section className="bg-[#1f2937] rounded-xl border border-gray-700 p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">🤖 AI Configuration (Claude)</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Anthropic API Key</label>
                            <div className="relative">
                                <input
                                    type={showKeys.ai ? 'text' : 'password'}
                                    value={settings.ai.apiKey}
                                    onChange={(e) => updateSettings('ai.apiKey', e.target.value)}
                                    placeholder="sk-ant-..."
                                    className="w-full px-4 py-2 pr-12 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleShowKey('ai')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    {showKeys.ai ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Get your API key from console.anthropic.com</p>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Max Discount %</label>
                            <input
                                type="number"
                                value={settings.ai.maxDiscountPercent}
                                onChange={(e) => updateSettings('ai.maxDiscountPercent', parseInt(e.target.value))}
                                className="w-32 px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                max="50"
                            />
                        </div>
                    </div>
                </section>

                {/* Payment Settings */}
                <section className="bg-[#1f2937] rounded-xl border border-gray-700 p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">💳 Payment Gateways</h2>

                    {/* Cash on Delivery */}
                    <div className="mb-6 p-4 bg-[#374151]/50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-medium">Cash on Delivery</h3>
                                <p className="text-gray-400 text-sm">Accept payment when order is delivered</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.payments.cashOnDelivery.enabled}
                                    onChange={(e) => updateSettings('payments.cashOnDelivery.enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Stripe */}
                    <div className="mb-6 p-4 bg-[#374151]/50 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-white font-medium">Stripe</h3>
                                <p className="text-gray-400 text-sm">Accept credit/debit card payments</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.payments.stripe.enabled}
                                    onChange={(e) => updateSettings('payments.stripe.enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        {settings.payments.stripe.enabled && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Public Key</label>
                                    <input
                                        type="text"
                                        value={settings.payments.stripe.publicKey}
                                        onChange={(e) => updateSettings('payments.stripe.publicKey', e.target.value)}
                                        placeholder="pk_..."
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Secret Key</label>
                                    <input
                                        type={showKeys.stripe ? 'text' : 'password'}
                                        value={settings.payments.stripe.secretKey}
                                        onChange={(e) => updateSettings('payments.stripe.secretKey', e.target.value)}
                                        placeholder="sk_..."
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PayPal */}
                    <div className="mb-6 p-4 bg-[#374151]/50 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-white font-medium">PayPal</h3>
                                <p className="text-gray-400 text-sm">Accept PayPal payments</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.payments.paypal.enabled}
                                    onChange={(e) => updateSettings('payments.paypal.enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        {settings.payments.paypal.enabled && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Client ID</label>
                                    <input
                                        type="text"
                                        value={settings.payments.paypal.clientId}
                                        onChange={(e) => updateSettings('payments.paypal.clientId', e.target.value)}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Client Secret</label>
                                    <input
                                        type={showKeys.paypal ? 'text' : 'password'}
                                        value={settings.payments.paypal.clientSecret}
                                        onChange={(e) => updateSettings('payments.paypal.clientSecret', e.target.value)}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* bKash */}
                    <div className="p-4 bg-[#374151]/50 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-white font-medium">bKash</h3>
                                <p className="text-gray-400 text-sm">Accept bKash mobile payments (Bangladesh)</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.payments.bkash.enabled}
                                    onChange={(e) => updateSettings('payments.bkash.enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        {settings.payments.bkash.enabled && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">App Key</label>
                                    <input
                                        type="text"
                                        value={settings.payments.bkash.appKey}
                                        onChange={(e) => updateSettings('payments.bkash.appKey', e.target.value)}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">App Secret</label>
                                    <input
                                        type="password"
                                        value={settings.payments.bkash.appSecret}
                                        onChange={(e) => updateSettings('payments.bkash.appSecret', e.target.value)}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={settings.payments.bkash.username}
                                        onChange={(e) => updateSettings('payments.bkash.username', e.target.value)}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={settings.payments.bkash.password}
                                        onChange={(e) => updateSettings('payments.bkash.password', e.target.value)}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Courier Settings */}
                <section className="bg-[#1f2937] rounded-xl border border-gray-700 p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">🚚 Courier Services</h2>

                    {/* Manual */}
                    <div className="mb-6 p-4 bg-[#374151]/50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-medium">Manual Shipping</h3>
                                <p className="text-gray-400 text-sm">Handle shipping yourself without API integration</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.courier.manual.enabled}
                                    onChange={(e) => updateSettings('courier.manual.enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Pathao */}
                    <div className="mb-6 p-4 bg-[#374151]/50 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-white font-medium">Pathao Courier</h3>
                                <p className="text-gray-400 text-sm">Automated shipping with Pathao (Bangladesh)</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.courier.pathao.enabled}
                                    onChange={(e) => updateSettings('courier.pathao.enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        {settings.courier.pathao.enabled && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Client ID</label>
                                    <input
                                        type="text"
                                        value={settings.courier.pathao.clientId}
                                        onChange={(e) => updateSettings('courier.pathao.clientId', e.target.value)}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Client Secret</label>
                                    <input
                                        type="password"
                                        value={settings.courier.pathao.clientSecret}
                                        onChange={(e) => updateSettings('courier.pathao.clientSecret', e.target.value)}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Steadfast */}
                    <div className="p-4 bg-[#374151]/50 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-white font-medium">Steadfast Courier</h3>
                                <p className="text-gray-400 text-sm">Automated shipping with Steadfast (Bangladesh)</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.courier.steadfast.enabled}
                                    onChange={(e) => updateSettings('courier.steadfast.enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        {settings.courier.steadfast.enabled && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">API Key</label>
                                    <input
                                        type="text"
                                        value={settings.courier.steadfast.apiKey}
                                        onChange={(e) => updateSettings('courier.steadfast.apiKey', e.target.value)}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Secret Key</label>
                                    <input
                                        type="password"
                                        value={settings.courier.steadfast.secretKey}
                                        onChange={(e) => updateSettings('courier.steadfast.secretKey', e.target.value)}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
