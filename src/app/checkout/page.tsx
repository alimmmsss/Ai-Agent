'use client';

import { useState, useEffect } from 'react';
import CustomerNav from '@/components/CustomerNav';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, CreditCard, Truck, CheckCircle, Loader2 } from 'lucide-react';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    image?: string | null;
}

export default function CheckoutPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const productId = searchParams.get('product');
    const quantityParam = searchParams.get('qty') || '1';

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [orderId, setOrderId] = useState('');

    const [quantity, setQuantity] = useState(parseInt(quantityParam));
    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        area: '',
        notes: ''
    });
    const [paymentMethod, setPaymentMethod] = useState('cod');

    useEffect(() => {
        if (productId) {
            fetchProduct(productId);
        } else {
            setLoading(false);
        }
    }, [productId]);

    const fetchProduct = async (id: string) => {
        try {
            const res = await fetch(`/api/products?id=${id}`);
            const data = await res.json();
            if (data && !data.error) {
                setProduct(Array.isArray(data) ? data.find((p: Product) => p.id === id) : data);
            }
        } catch (error) {
            console.error('Error fetching product:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        setSubmitting(true);

        try {
            const orderData = {
                id: `ORD-${Date.now()}`,
                totalAmount: product.price * quantity,
                discountAmount: 0,
                finalAmount: product.price * quantity,
                status: 'pending_approval',
                paymentMethod: paymentMethod,
                paymentStatus: 'pending',
            };

            const customerData = {
                id: `CUST-${Date.now()}`,
                ...customerInfo,
            };

            const itemsData = [{
                id: `ITEM-${Date.now()}`,
                productId: product.id,
                productName: product.name,
                quantity: quantity,
                originalPrice: product.price,
                finalPrice: product.price,
                discountPercent: 0,
            }];

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderData, customerData, itemsData }),
            });

            if (response.ok) {
                const result = await response.json();
                setOrderId(result.id || orderData.id);
                setOrderComplete(true);
            } else {
                alert('Failed to place order. Please try again.');
            }
        } catch (error) {
            console.error('Error placing order:', error);
            alert('Failed to place order. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-[#111827] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </main>
        );
    }

    if (!product) {
        return (
            <main className="min-h-screen bg-[#111827]">
                <CustomerNav />
                <div className="pt-32 pb-20 px-4 text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">No Product Selected</h1>
                    <p className="text-gray-400 mb-6">Please select a product to checkout.</p>
                    <Link href="/products" className="text-indigo-400 hover:text-indigo-300">
                        ← Browse Products
                    </Link>
                </div>
            </main>
        );
    }

    if (orderComplete) {
        return (
            <main className="min-h-screen bg-[#111827]">
                <CustomerNav />
                <div className="pt-32 pb-20 px-4">
                    <div className="max-w-lg mx-auto text-center">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={40} className="text-green-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-4">Order Placed Successfully!</h1>
                        <p className="text-gray-400 mb-2">Your order ID is:</p>
                        <p className="text-xl font-mono text-indigo-400 mb-6">{orderId}</p>
                        <div className="bg-[#1f2937] rounded-xl p-6 mb-8 text-left">
                            <h3 className="text-white font-semibold mb-4">What's Next?</h3>
                            <ul className="space-y-3 text-gray-400 text-sm">
                                <li className="flex items-start gap-3">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    <span>Our team will review and confirm your order</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    <span>You'll receive a confirmation call/SMS</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    <span>Your order will be dispatched within 24-48 hours</span>
                                </li>
                                {paymentMethod === 'cod' && (
                                    <li className="flex items-start gap-3">
                                        <span className="text-yellow-400 mt-0.5">💵</span>
                                        <span>Pay ৳{(product.price * quantity).toLocaleString()} on delivery</span>
                                    </li>
                                )}
                            </ul>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/"
                                className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
                            >
                                Back to Home
                            </Link>
                            <Link
                                href="/products"
                                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
                            >
                                Continue Shopping
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    const total = product.price * quantity;

    return (
        <main className="min-h-screen bg-[#111827]">
            <CustomerNav />

            <section className="pt-24 md:pt-32 pb-12 md:pb-20 px-4 md:px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Back Link */}
                    <Link
                        href={`/products/${product.id}`}
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Back to Product
                    </Link>

                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-8">Checkout</h1>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column - Forms */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Customer Information */}
                            <div className="bg-[#1f2937] rounded-xl p-6 border border-gray-700">
                                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Package size={20} className="text-indigo-400" />
                                    Delivery Information
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Full Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={customerInfo.name}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#374151] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Phone Number *</label>
                                        <input
                                            type="tel"
                                            required
                                            value={customerInfo.phone}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#374151] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="01XXX-XXXXXX"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm text-gray-400 mb-1">Email (Optional)</label>
                                        <input
                                            type="email"
                                            value={customerInfo.email}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#374151] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="your@email.com"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm text-gray-400 mb-1">Full Address *</label>
                                        <textarea
                                            required
                                            value={customerInfo.address}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#374151] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                            rows={2}
                                            placeholder="House no, Road, Area"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">City *</label>
                                        <input
                                            type="text"
                                            required
                                            value={customerInfo.city}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#374151] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Dhaka"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Area</label>
                                        <input
                                            type="text"
                                            value={customerInfo.area}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, area: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#374151] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Mirpur, Dhanmondi, etc."
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm text-gray-400 mb-1">Order Notes (Optional)</label>
                                        <textarea
                                            value={customerInfo.notes}
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                                            className="w-full px-4 py-3 bg-[#374151] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                            rows={2}
                                            placeholder="Any special instructions..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="bg-[#1f2937] rounded-xl p-6 border border-gray-700">
                                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <CreditCard size={20} className="text-indigo-400" />
                                    Payment Method
                                </h2>
                                <div className="space-y-3">
                                    <label className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-600 hover:border-gray-500'}`}>
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="cod"
                                            checked={paymentMethod === 'cod'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-4 h-4 text-indigo-600"
                                        />
                                        <div className="flex-1">
                                            <p className="text-white font-medium">Cash on Delivery</p>
                                            <p className="text-gray-400 text-sm">Pay when you receive</p>
                                        </div>
                                        <span className="text-2xl">💵</span>
                                    </label>
                                    <label className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${paymentMethod === 'bkash' ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-600 hover:border-gray-500'}`}>
                                        <input
                                            type="radio"
                                            name="payment"
                                            value="bkash"
                                            checked={paymentMethod === 'bkash'}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-4 h-4 text-indigo-600"
                                        />
                                        <div className="flex-1">
                                            <p className="text-white font-medium">bKash</p>
                                            <p className="text-gray-400 text-sm">Mobile payment</p>
                                        </div>
                                        <span className="text-2xl">📱</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Order Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-[#1f2937] rounded-xl p-6 border border-gray-700 sticky top-24">
                                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Truck size={20} className="text-indigo-400" />
                                    Order Summary
                                </h2>

                                {/* Product */}
                                <div className="flex gap-4 pb-4 border-b border-gray-700">
                                    <div className="w-20 h-20 bg-[#374151] rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {product.image && product.image !== '/products/default.jpg' ? (
                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-3xl">📦</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-medium text-sm line-clamp-2">{product.name}</h3>
                                        <p className="text-gray-400 text-sm mt-1">৳{product.price.toLocaleString()}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className="w-7 h-7 bg-[#374151] rounded text-white hover:bg-[#4b5563]"
                                            >
                                                -
                                            </button>
                                            <span className="text-white text-sm w-8 text-center">{quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                                                className="w-7 h-7 bg-[#374151] rounded text-white hover:bg-[#4b5563]"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Totals */}
                                <div className="py-4 space-y-2">
                                    <div className="flex justify-between text-gray-400 text-sm">
                                        <span>Subtotal</span>
                                        <span>৳{total.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-400 text-sm">
                                        <span>Delivery</span>
                                        <span className="text-green-400">Free</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-700">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-white font-semibold">Total</span>
                                        <span className="text-2xl font-bold text-indigo-400">৳{total.toLocaleString()}</span>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                Place Order
                                                <CheckCircle size={20} />
                                            </>
                                        )}
                                    </button>

                                    <p className="text-gray-500 text-xs text-center mt-4">
                                        By placing this order, you agree to our Terms of Service
                                    </p>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </section>
        </main>
    );
}
