import { NextRequest, NextResponse } from 'next/server';
import { db, settings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import type { Settings } from '@/lib/types';

// Default settings structure
const defaultSettings: Settings = {
    storeName: 'Your Store Name',
    storeDescription: 'Your e-commerce store powered by AI Sales Agent',
    currency: 'BDT',
    ownerEmail: '',
    ai: {
        provider: 'google',
        apiKey: '',
        model: 'claude-sonnet-4-20250514',
        maxDiscountPercent: 15,
    },
    payments: {
        cashOnDelivery: { enabled: true },
        stripe: { enabled: false, publicKey: '', secretKey: '' },
        paypal: { enabled: false, clientId: '', clientSecret: '', mode: 'sandbox' },
        bkash: { enabled: false, appKey: '', appSecret: '', username: '', password: '', mode: 'sandbox' },
    },
    courier: {
        pathao: { enabled: false, clientId: '', clientSecret: '', username: '', password: '' },
        steadfast: { enabled: false, apiKey: '', secretKey: '' },
        manual: { enabled: true },
    },
    notifications: {
        emailNotifications: false,
        soundAlerts: true,
    },
};

// GET settings
export async function GET() {
    try {
        const allSettings = await db.select().from(settings);

        // Reconstruct settings object from key-value pairs
        let currentSettings = { ...defaultSettings };

        for (const setting of allSettings) {
            const keys = setting.key.split('.');
            let obj: Record<string, unknown> = currentSettings as unknown as Record<string, unknown>;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!obj[keys[i]]) {
                    obj[keys[i]] = {};
                }
                obj = obj[keys[i]] as Record<string, unknown>;
            }

            obj[keys[keys.length - 1]] = setting.value;
        }

        // Mask sensitive keys for client
        const maskedSettings = {
            ...currentSettings,
            ai: {
                ...currentSettings.ai,
                apiKey: currentSettings.ai.apiKey ? '***configured***' : '',
            },
            payments: {
                ...currentSettings.payments,
                stripe: {
                    ...currentSettings.payments.stripe,
                    secretKey: currentSettings.payments.stripe.secretKey ? '***configured***' : '',
                },
                paypal: {
                    ...currentSettings.payments.paypal,
                    clientSecret: currentSettings.payments.paypal.clientSecret ? '***configured***' : '',
                },
                bkash: {
                    ...currentSettings.payments.bkash,
                    appSecret: currentSettings.payments.bkash.appSecret ? '***configured***' : '',
                    password: currentSettings.payments.bkash.password ? '***configured***' : '',
                },
            },
            courier: {
                ...currentSettings.courier,
                pathao: {
                    ...currentSettings.courier.pathao,
                    clientSecret: currentSettings.courier.pathao.clientSecret ? '***configured***' : '',
                    password: currentSettings.courier.pathao.password ? '***configured***' : '',
                },
                steadfast: {
                    ...currentSettings.courier.steadfast,
                    secretKey: currentSettings.courier.steadfast.secretKey ? '***configured***' : '',
                },
            },
        };

        return NextResponse.json(maskedSettings);
    } catch (error) {
        console.error('Error reading settings:', error);
        return NextResponse.json(defaultSettings, { status: 200 });
    }
}

// POST - Update settings
export async function POST(request: NextRequest) {
    try {
        const updates = await request.json();

        // Flatten updates to key-value pairs
        const flattenObject = (obj: Record<string, unknown>, prefix = ''): Array<{ key: string; value: unknown }> => {
            const result: Array<{ key: string; value: unknown }> = [];

            for (const [key, value] of Object.entries(obj)) {
                const newKey = prefix ? `${prefix}.${key}` : key;

                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    result.push(...flattenObject(value as Record<string, unknown>, newKey));
                } else {
                    result.push({ key: newKey, value });
                }
            }

            return result;
        };

        const flatUpdates = flattenObject(updates);

        // Upsert each setting
        for (const { key, value } of flatUpdates) {
            const existing = await db.select().from(settings).where(eq(settings.key, key));

            if (existing.length > 0) {
                await db.update(settings)
                    .set({ value, updatedAt: new Date() })
                    .where(eq(settings.key, key));
            } else {
                await db.insert(settings).values({ key, value, updatedAt: new Date() });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
