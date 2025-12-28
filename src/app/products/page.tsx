import CustomerNav from '@/components/CustomerNav';
import ChatWidget from '@/components/ChatWidget';
import Link from 'next/link';
import { db, products as productsTable } from '@/lib/db';

async function getProducts() {
    try {
        const allProducts = await db.select().from(productsTable);
        return allProducts;
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

export default async function ProductsPage() {
    const productsList = await getProducts();

    return (
        <main className="min-h-screen bg-[#111827]">
            <CustomerNav />

            {/* Hero Section */}
            <section className="pt-24 md:pt-32 pb-12 px-4 md:px-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                        Our Products
                    </h1>
                    <p className="text-base md:text-xl text-gray-400 max-w-2xl">
                        Browse our collection of premium products. Need help choosing? Our AI assistant is here to guide you!
                    </p>
                </div>
            </section>

            {/* Products Grid */}
            <section className="pb-20 px-4 md:px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {productsList.map((product) => (
                            <Link
                                key={product.id}
                                href={`/products/${product.id}`}
                                className="bg-[#1f2937] rounded-xl md:rounded-2xl p-3 md:p-5 border border-gray-700 hover:border-indigo-500/50 transition-all duration-300 group block cursor-pointer"
                            >
                                <div className="w-full h-32 md:h-48 bg-[#374151] rounded-lg md:rounded-xl mb-3 md:mb-4 flex items-center justify-center overflow-hidden">
                                    {product.image && product.image !== '/products/default.jpg' ? (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <span className="text-4xl md:text-6xl">📦</span>
                                    )}
                                </div>
                                <span className="text-[10px] md:text-xs text-indigo-400 font-medium uppercase tracking-wide">
                                    {product.category}
                                </span>
                                <h3 className="text-sm md:text-lg font-semibold text-white mt-1 mb-1 md:mb-2 line-clamp-1">
                                    {product.name}
                                </h3>
                                <p className="text-gray-400 text-xs md:text-sm mb-2 md:mb-4 line-clamp-2 hidden md:block">
                                    {product.description}
                                </p>
                                <div className="flex items-center justify-between flex-wrap gap-1">
                                    <span className="text-lg md:text-2xl font-bold text-indigo-400">
                                        ৳{product.price.toLocaleString()}
                                    </span>
                                    <span className={`text-[10px] md:text-xs px-2 py-1 rounded-full ${product.stock > 10
                                        ? 'bg-green-500/20 text-green-400'
                                        : product.stock > 0
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {productsList.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-gray-400 text-lg">No products available yet.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-12 md:py-16 px-4 md:px-6 bg-[#1f2937]">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                        Need Help Choosing?
                    </h2>
                    <p className="text-gray-400 mb-8">
                        Our AI assistant can help you find the perfect product and even negotiate special deals!
                    </p>
                    <Link
                        href="/contact"
                        className="inline-block px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300"
                    >
                        Chat with AI Assistant
                    </Link>
                </div>
            </section>

            <ChatWidget />
        </main>
    );
}
