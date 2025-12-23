'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Save, Upload, Loader2 } from 'lucide-react';
import type { Product } from '@/lib/types';

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [uploading, setUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '',
        maxDiscount: '15',
        image: ''
    });

    // Close modal function
    const closeModal = useCallback(() => {
        setShowModal(false);
        setEditingProduct(null);
        setImagePreview('');
        setFormData({
            name: '',
            description: '',
            price: '',
            stock: '',
            category: '',
            maxDiscount: '15',
            image: ''
        });
    }, []);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showModal) {
                closeModal();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [showModal, closeModal]);

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        try {
            const res = await fetch('/api/products');
            setProducts(await res.json());
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }

    function openModal(product?: Product) {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                description: product.description,
                price: product.price.toString(),
                stock: product.stock.toString(),
                category: product.category,
                maxDiscount: product.maxDiscount.toString(),
                image: product.image || ''
            });
            setImagePreview(product.image || '');
        } else {
            setEditingProduct(null);
            setFormData({ name: '', description: '', price: '', stock: '', category: '', maxDiscount: '15', image: '' });
            setImagePreview('');
        }
        setShowModal(true);
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview immediately
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to server
        setUploading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formDataUpload
            });

            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({ ...prev, image: data.imageUrl }));
            } else {
                alert(data.error || 'Upload failed');
                setImagePreview('');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image');
            setImagePreview('');
        } finally {
            setUploading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const productData = {
            name: formData.name,
            description: formData.description,
            price: parseInt(formData.price),
            stock: parseInt(formData.stock),
            category: formData.category,
            maxDiscount: parseInt(formData.maxDiscount),
            currency: 'BDT',
            image: formData.image || '/products/default.jpg'
        };

        try {
            if (editingProduct) {
                await fetch('/api/products', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId: editingProduct.id, updates: productData })
                });
            } else {
                await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
            }

            await fetchProducts();
            closeModal();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function deleteProduct(id: string) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
            await fetchProducts();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // Handle click outside modal
    function handleBackdropClick(e: React.MouseEvent) {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            closeModal();
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Products</h1>
                    <p className="text-gray-400">Manage your product catalog</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                    <Plus size={18} />
                    Add Product
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                    <div key={product.id} className="bg-[#1f2937] rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-colors">
                        <div className="w-full h-40 bg-[#374151] rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                            {product.image && product.image !== '/products/default.jpg' ? (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-4xl">📦</span>
                            )}
                        </div>
                        <span className="text-xs text-purple-400">{product.category}</span>
                        <h3 className="text-lg font-semibold text-white mt-1">{product.name}</h3>
                        <p className="text-gray-400 text-sm mt-2 line-clamp-2">{product.description}</p>

                        <div className="flex items-center justify-between mt-4">
                            <span className="text-xl font-bold text-indigo-400">৳{product.price.toLocaleString()}</span>
                            <span className={`text-sm ${product.stock < 10 ? 'text-red-400' : 'text-gray-400'}`}>
                                {product.stock} in stock
                            </span>
                        </div>

                        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
                            <button
                                onClick={() => openModal(product)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#374151] hover:bg-[#4b5563] text-white rounded-lg text-sm"
                            >
                                <Edit2 size={14} />
                                Edit
                            </button>
                            <button
                                onClick={() => deleteProduct(product.id)}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Product Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto"
                    onClick={handleBackdropClick}
                >
                    <div
                        ref={modalRef}
                        className="bg-[#1f2937] rounded-xl border border-gray-700 p-6 max-w-lg w-full my-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">
                                {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#374151] transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Image Upload Section */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Product Image</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative w-full h-48 bg-[#374151] border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors flex items-center justify-center overflow-hidden"
                                >
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-2 text-gray-400">
                                            <Loader2 size={32} className="animate-spin text-indigo-500" />
                                            <span>Uploading...</span>
                                        </div>
                                    ) : imagePreview ? (
                                        <>
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-sm">Click to change</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 text-gray-400">
                                            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center">
                                                <Upload size={24} />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium">Click to upload image</p>
                                                <p className="text-xs text-gray-500">JPG, PNG, WEBP up to 5MB</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Product Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white resize-none h-20 focus:outline-none focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Price (BDT)</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Stock</label>
                                    <input
                                        type="number"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Category</label>
                                    <input
                                        type="text"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Max Discount %</label>
                                    <input
                                        type="number"
                                        value={formData.maxDiscount}
                                        onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                                        className="w-full px-4 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                                        max="50"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                            >
                                <Save size={18} />
                                {editingProduct ? 'Save Changes' : 'Add Product'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
