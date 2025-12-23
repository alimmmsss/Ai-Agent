import CustomerNav from '@/components/CustomerNav';
import ChatWidget from '@/components/ChatWidget';
import Link from 'next/link';
import { ShoppingBag, Users, Award, Heart } from 'lucide-react';

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-[#111827]">
            <CustomerNav />

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        About <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">AI Store</span>
                    </h1>
                    <p className="text-xl text-gray-400 leading-relaxed">
                        We're revolutionizing online shopping with AI-powered assistance, making your shopping experience smarter, faster, and more personalized than ever before.
                    </p>
                </div>
            </section>

            {/* Story Section */}
            <section className="py-20 px-6 bg-[#1f2937]">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-6">Our Story</h2>
                            <div className="space-y-4 text-gray-400 leading-relaxed">
                                <p>
                                    Founded with a vision to transform e-commerce, AI Store combines cutting-edge artificial intelligence with exceptional customer service. We believe shopping should be effortless, enjoyable, and tailored to your unique needs.
                                </p>
                                <p>
                                    Our AI-powered sales assistant is available 24/7 to answer your questions, help you find the perfect products, and even negotiate the best deals on your behalf. It's like having a personal shopping expert in your pocket!
                                </p>
                                <p>
                                    We're committed to quality, authenticity, and customer satisfaction. Every product in our catalog is carefully selected to meet our high standards, and our team works tirelessly to ensure you have the best shopping experience possible.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#111827] rounded-2xl p-6 text-center border border-gray-700">
                                <div className="text-4xl font-bold text-indigo-400 mb-2">1000+</div>
                                <div className="text-gray-400">Happy Customers</div>
                            </div>
                            <div className="bg-[#111827] rounded-2xl p-6 text-center border border-gray-700">
                                <div className="text-4xl font-bold text-purple-400 mb-2">500+</div>
                                <div className="text-gray-400">Products</div>
                            </div>
                            <div className="bg-[#111827] rounded-2xl p-6 text-center border border-gray-700">
                                <div className="text-4xl font-bold text-green-400 mb-2">24/7</div>
                                <div className="text-gray-400">AI Support</div>
                            </div>
                            <div className="bg-[#111827] rounded-2xl p-6 text-center border border-gray-700">
                                <div className="text-4xl font-bold text-yellow-400 mb-2">100%</div>
                                <div className="text-gray-400">Authentic</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">What We Stand For</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: ShoppingBag,
                                title: 'Quality Products',
                                desc: 'Every item is vetted for quality and authenticity before being added to our catalog.',
                                color: 'indigo'
                            },
                            {
                                icon: Users,
                                title: 'Customer First',
                                desc: 'Your satisfaction is our priority. We go above and beyond to make you happy.',
                                color: 'purple'
                            },
                            {
                                icon: Award,
                                title: 'Best Prices',
                                desc: 'Competitive pricing with AI-powered negotiation to get you the best deals.',
                                color: 'green'
                            },
                            {
                                icon: Heart,
                                title: 'Trust & Care',
                                desc: 'We build lasting relationships based on trust, transparency, and genuine care.',
                                color: 'red'
                            }
                        ].map((value, i) => (
                            <div
                                key={i}
                                className="bg-[#1f2937] rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
                            >
                                <div className={`w-12 h-12 bg-${value.color}-500/20 rounded-xl flex items-center justify-center mb-4`}>
                                    <value.icon size={24} className={`text-${value.color}-400`} />
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
                                <p className="text-gray-400 text-sm">{value.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Ready to Experience Smart Shopping?
                    </h2>
                    <p className="text-gray-400 mb-8">
                        Start a conversation with our AI assistant and discover a new way to shop.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/products"
                            className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                        >
                            Browse Products
                        </Link>
                        <Link
                            href="/contact"
                            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300"
                        >
                            Chat with AI
                        </Link>
                    </div>
                </div>
            </section>

            <ChatWidget />
        </main>
    );
}
