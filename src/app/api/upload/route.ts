import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

export async function POST(request: NextRequest) {
    try {
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Please upload an image (JPG, PNG, WEBP, or GIF)' },
                { status: 400 }
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 5MB' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'jpg';
        const filename = `product_${timestamp}.${extension}`;
        const filepath = path.join(uploadsDir, filename);

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        fs.writeFileSync(filepath, buffer);

        // Return the public URL path
        const imageUrl = `/uploads/${filename}`;

        return NextResponse.json({
            success: true,
            imageUrl,
            filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}

// GET - List uploaded images
export async function GET() {
    try {
        if (!fs.existsSync(uploadsDir)) {
            return NextResponse.json([]);
        }

        const files = fs.readdirSync(uploadsDir)
            .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
            .map(f => ({
                filename: f,
                url: `/uploads/${f}`
            }));

        return NextResponse.json(files);
    } catch (error) {
        console.error('Error listing uploads:', error);
        return NextResponse.json([]);
    }
}
