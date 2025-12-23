import { NextRequest, NextResponse } from 'next/server';
import type { Settings } from '@/lib/types';
import fs from 'fs';
import path from 'path';

function readJsonFile<T>(filename: string): T {
    const filePath = path.join(process.cwd(), 'src', 'data', filename);
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
}

function writeJsonFile(filename: string, data: unknown): void {
    const filePath = path.join(process.cwd(), 'src', 'data', filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// GET settings
export async function GET() {
    try {
        const settings = readJsonFile<Settings>('settings.json');

        // Mask sensitive keys for client
        const maskedSettings = {
            ...settings,
            ai: {
                ...settings.ai,
                apiKey: settings.ai.apiKey ? '***configured***' : ''
            },
            payments: {
                ...settings.payments,
                stripe: {
                    ...settings.payments.stripe,
                    secretKey: settings.payments.stripe.secretKey ? '***configured***' : ''
                },
                paypal: {
                    ...settings.payments.paypal,
                    clientSecret: settings.payments.paypal.clientSecret ? '***configured***' : ''
                },
                bkash: {
                    ...settings.payments.bkash,
                    appSecret: settings.payments.bkash.appSecret ? '***configured***' : '',
                    password: settings.payments.bkash.password ? '***configured***' : ''
                }
            },
            courier: {
                ...settings.courier,
                pathao: {
                    ...settings.courier.pathao,
                    clientSecret: settings.courier.pathao.clientSecret ? '***configured***' : '',
                    password: settings.courier.pathao.password ? '***configured***' : ''
                },
                steadfast: {
                    ...settings.courier.steadfast,
                    secretKey: settings.courier.steadfast.secretKey ? '***configured***' : ''
                }
            }
        };

        return NextResponse.json(maskedSettings);
    } catch (error) {
        console.error('Error reading settings:', error);
        return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
    }
}

// POST - Update settings
export async function POST(request: NextRequest) {
    try {
        const updates = await request.json();
        const currentSettings = readJsonFile<Settings>('settings.json');

        // Deep merge settings
        const newSettings = deepMerge(
            currentSettings as unknown as Record<string, unknown>,
            updates as Record<string, unknown>
        );
        writeJsonFile('settings.json', newSettings);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}

// Helper function for deep merge
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const output = { ...target };

    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (target[key] && typeof target[key] === 'object') {
                output[key] = deepMerge(
                    target[key] as Record<string, unknown>,
                    source[key] as Record<string, unknown>
                );
            } else {
                output[key] = source[key];
            }
        } else {
            output[key] = source[key];
        }
    }

    return output;
}
