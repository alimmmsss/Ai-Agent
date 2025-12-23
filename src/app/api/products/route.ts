import { NextRequest, NextResponse } from 'next/server';
import type { Product } from '@/lib/types';
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

// GET all products
export async function GET() {
    try {
        const data = readJsonFile<{ products: Product[] }>('products.json');
        return NextResponse.json(data.products);
    } catch (error) {
        console.error('Error reading products:', error);
        return NextResponse.json([], { status: 200 });
    }
}

// POST - Add new product
export async function POST(request: NextRequest) {
    try {
        const product = await request.json();
        const data = readJsonFile<{ products: Product[] }>('products.json');

        // Generate ID if not provided
        if (!product.id) {
            product.id = `prod_${Date.now()}`;
        }

        data.products.push(product);
        writeJsonFile('products.json', data);

        return NextResponse.json(product, { status: 201 });
    } catch (error) {
        console.error('Error creating product:', error);
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}

// PATCH - Update product
export async function PATCH(request: NextRequest) {
    try {
        const { productId, updates } = await request.json();
        const data = readJsonFile<{ products: Product[] }>('products.json');

        const productIndex = data.products.findIndex(p => p.id === productId);
        if (productIndex === -1) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        data.products[productIndex] = {
            ...data.products[productIndex],
            ...updates
        };

        writeJsonFile('products.json', data);
        return NextResponse.json(data.products[productIndex]);
    } catch (error) {
        console.error('Error updating product:', error);
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}

// DELETE product
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('id');

        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        const data = readJsonFile<{ products: Product[] }>('products.json');
        data.products = data.products.filter(p => p.id !== productId);
        writeJsonFile('products.json', data);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
