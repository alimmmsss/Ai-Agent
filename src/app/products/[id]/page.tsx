import CustomerNav from '@/components/CustomerNav';
import ChatWidget from '@/components/ChatWidget';
import Link from 'next/link';
import { db, products } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

interface PageProps {
    params: Promise<{ id: string }>;
}

async function getProduct(id: string) {
    try {
        const result = await db.select().from(products).where(eq(products.id, id));
        return result[0] || null;
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

async function getRelatedProducts(category: string, excludeId: string) {
    try {
        const result = await db.select().from(products).where(eq(products.category, category));
        return result.filter(p => p.id !== excludeId).slice(0, 3);
    } catch (error) {
        console.error('Error fetching related products:', error);
        return [];
    }
}

export default async function ProductDetailPage({ params }: PageProps) {
    const { id } = await params;
    const product = await getProduct(id);

    if (!product) {
        notFound();
    }

    const relatedProducts = await getRelatedProducts(product.category, product.id);

    return (
        <main className="min-h-screen bg-[#111827]">
            <CustomerNav />

            <section className="pt-24 md:pt-32 pb-12 md:pb-20 px-4 md:px-6">
                <div className="max-w-6xl mx-auto">
                    {/* Breadcrumb */}
                    <nav className="mb-6 text-sm">
                        <Link href="/" className="text-gray-400 hover:text-white">Home</Link>
                        <span className="text-gray-600 mx-2">/</span>
                        <Link href="/products" className="text-gray-400 hover:text-white">Products</Link>
                        <span className="text-gray-600 mx-2">/</span>
                        <span className="text-indigo-400">{product.name}</span>
                    </nav>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                        {/* Product Image */}
                        <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl p-8 flex items-center justify-center min-h-[300px] md:min-h-[400px]">
                            {product.image && product.image !== '/products/default.jpg' ? (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="max-w-full max-h-[400px] object-contain rounded-xl"
                                />
                            ) : (
                                <span className="text-8xl">📦</span>
                            )}
                        </div>

                        {/* Product Info */}
                        <div className="flex flex-col">
                            <span className="text-indigo-400 text-sm font-medium uppercase tracking-wide mb-2">
                                {product.category}
                            </span>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                {product.name}
                            </h1>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                {product.description}
                            </p>

                            <div className="flex items-center gap-4 mb-6">
                                <span className="text-4xl font-bold text-indigo-400">
                                    ৳{product.price.toLocaleString()}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-sm ${product.stock > 10
                                        ? 'bg-green-500/20 text-green-400'
                                        : product.stock > 0
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-red-500/20 text-red-400'
                                    }`}>
                                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                                </span>
                            </div>

                            {/* Buy Actions */}
                            <div className="space-y-4 mb-8">
                                <Link
                                    href={`/contact?product=${encodeURIComponent(product.name)}`}
                                    className="w-full block text-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300"
                                >
                                    💬 Chat to Buy
                                </Link>
                                <p className="text-gray-500 text-sm text-center">
                                    Our AI sales assistant will help you complete your purchase and may offer special discounts!
                                </p>
                            </div>

                            {/* Features */}
                            <div className="bg-[#1f2937] rounded-xl p-6 space-y-3">
                                <div className="flex items-center gap-3 text-gray-300">
                                    <span className="text-green-400">✓</span>
                                    <span>AI-Powered Price Negotiation</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-300">
                                    <span className="text-green-400">✓</span>
                                    <span>Secure Payment Options</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-300">
                                    <span className="text-green-400">✓</span>
                                    <span>Fast Nationwide Delivery</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-300">
                                    <span className="text-green-400">✓</span>
                                    <span>24/7 Customer Support</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Related Products */}
                    {relatedProducts.length > 0 && (
                        <div className="mt-16">
                            <h2 className="text-2xl font-bold text-white mb-8">Related Products</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                {relatedProducts.map((relatedProduct) => (
                                    <Link
                                        key={relatedProduct.id}
                                        href={`/products/${relatedProduct.id}`}
                                        className="bg-[#1f2937] rounded-xl p-4 border border-gray-700 hover:border-indigo-500/50 transition-all duration-300 group"
                                    >
                                        <div className="w-full h-32 md:h-40 bg-[#374151] rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                            {relatedProduct.image && relatedProduct.image !== '/products/default.jpg' ? (
                                                <img
                                                    src={relatedProduct.image}
                                                    alt={relatedProduct.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                            ) : (
                                                <span className="text-4xl">📦</span>
                                            )}
                                        </div>
                                        <h3 className="text-white font-medium text-sm md:text-base line-clamp-1 mb-1">
                                            {relatedProduct.name}
                                        </h3>
                                        <span className="text-indigo-400 font-bold">
                                            ৳{relatedProduct.price.toLocaleString()}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <ChatWidget />
        </main>
    );
}
