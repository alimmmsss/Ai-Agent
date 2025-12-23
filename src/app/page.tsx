import ChatWidget from '@/components/ChatWidget';
import CustomerNav from '@/components/CustomerNav';
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

export default async function Home() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-[#111827]">
      <CustomerNav />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-2 bg-indigo-500/20 rounded-full text-indigo-300 text-sm mb-6">
            🤖 Powered by AI Sales Agent
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Shop Smarter with
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"> AI Assistance</span>
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Our AI sales assistant is ready to help you find the perfect products,
            answer questions, and even negotiate the best deals for you.
          </p>
          <Link
            href="/contact"
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 inline-block"
          >
            Start Chatting →
          </Link>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-white mb-10 text-center">
            Featured Products
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product: { id: string; name: string; description: string; price: number; stock: number; category: string; image?: string }) => (
              <div
                key={product.id}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:scale-105"
              >
                <div className="w-full h-48 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
                  {product.image && product.image !== '/products/default.jpg' ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl">📦</span>
                  )}
                </div>
                <span className="text-xs text-purple-400 font-medium">{product.category}</span>
                <h4 className="text-xl font-semibold text-white mt-1 mb-2">{product.name}</h4>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-indigo-400">৳{product.price.toLocaleString()}</span>
                  <span className="text-sm text-gray-500">{product.stock} in stock</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-[#1f2937]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: '💬', title: 'AI-Powered Chat', desc: 'Get instant answers to all your product questions' },
            { icon: '💰', title: 'Smart Deals', desc: 'Our AI can negotiate special discounts just for you' },
            { icon: '🚚', title: 'Fast Delivery', desc: 'Quick processing and reliable shipping options' }
          ].map((feature, i) => (
            <div key={i} className="text-center">
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h4 className="text-xl font-semibold text-white mb-2">{feature.title}</h4>
              <p className="text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Chat Widget */}
      <ChatWidget />
    </main>
  );
}
