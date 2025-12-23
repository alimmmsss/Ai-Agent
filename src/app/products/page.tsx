import CustomerNav from '@/components/CustomerNav';
import ChatWidget from '@/components/ChatWidget';
import Link from 'next/link';

async function getProducts() {
    try {
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'src', 'data', 'products.json');
        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data).products;
    } catch {
        return [];
    }
}

export default async function ProductsPage() {
    const products = await getProducts();

    return (
        <main className="min-h-screen bg-[#111827]">
            <CustomerNav />

            {/* Hero Section */}
            <section className="pt-32 pb-12 px-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Our Products
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl">
                        Browse our collection of premium products. Need help choosing? Our AI assistant is here to guide you!
                    </p>
                </div>
            </section>

            {/* Products Grid */}
            <section className="pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product: {
                            id: string;
                            name: string;
                            description: string;
                            price: number;
                            stock: number;
                            category: string;
                            image?: string
                        }) => (
                            <div
                                key={product.id}
                                className="bg-[#1f2937] rounded-2xl p-5 border border-gray-700 hover:border-indigo-500/50 transition-all duration-300 group"
                            >
                                <div className="w-full h-48 bg-[#374151] rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                                    {product.image && product.image !== '/products/default.jpg' ? (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <span className="text-6xl">📦</span>
                                    )}
                                </div>
                                <span className="text-xs text-indigo-400 font-medium uppercase tracking-wide">
                                    {product.category}
                                </span>
                                <h3 className="text-lg font-semibold text-white mt-1 mb-2">
                                    {product.name}
                                </h3>
                                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                    {product.description}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-bold text-indigo-400">
                                        ৳{product.price.toLocaleString()}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${product.stock > 10
                                            ? 'bg-green-500/20 text-green-400'
                                            : product.stock > 0
                                                ? 'bg-yellow-500/20 text-yellow-400'
                                                : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {products.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-gray-400 text-lg">No products available yet.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 px-6 bg-[#1f2937]">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Need Help Choosing?
                    </h2>
                    <p className="text-gray-400 mb-8">
                        Our AI assistant can help you find the perfect product and even negotiate special deals!
                    </p>
                    <Link
                        href="/contact"
                        className="inline-block px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300"
                    >
                        Chat with AI Assistant
                    </Link>
                </div>
            </section>

            <ChatWidget />
        </main>
    );
}
