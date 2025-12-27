import { NextRequest, NextResponse } from 'next/server';
import { db, products } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET all products
export async function GET() {
    try {
        const allProducts = await db.select().from(products);
        return NextResponse.json(allProducts);
    } catch (error) {
        console.error('Error reading products:', error);
        return NextResponse.json([], { status: 200 });
    }
}

// POST - Add new product
export async function POST(request: NextRequest) {
    try {
        const productData = await request.json();

        const newProduct = {
            id: productData.id || `prod_${uuidv4().slice(0, 8)}`,
            name: productData.name,
            description: productData.description,
            price: productData.price,
            currency: productData.currency || 'BDT',
            stock: productData.stock || 0,
            category: productData.category,
            image: productData.image || '/products/default.jpg',
            maxDiscount: productData.maxDiscount || 15,
        };

        await db.insert(products).values(newProduct);

        return NextResponse.json(newProduct, { status: 201 });
    } catch (error) {
        console.error('Error creating product:', error);
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}

// PATCH - Update product
export async function PATCH(request: NextRequest) {
    try {
        const { productId, updates } = await request.json();

        const result = await db
            .update(products)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(products.id, productId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        return NextResponse.json(result[0]);
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

        await db.delete(products).where(eq(products.id, productId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
