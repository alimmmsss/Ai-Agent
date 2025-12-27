import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
    return (
        <div className="min-h-screen bg-[#111827] flex items-center justify-center px-4">
            <SignIn
                appearance={{
                    elements: {
                        rootBox: "mx-auto",
                        card: "bg-[#1f2937] border border-gray-700 shadow-2xl",
                        headerTitle: "text-white",
                        headerSubtitle: "text-gray-400",
                        socialButtonsBlockButton: "bg-white/10 border-gray-600 text-white hover:bg-white/20",
                        socialButtonsBlockButtonText: "text-white",
                        dividerLine: "bg-gray-600",
                        dividerText: "text-gray-400",
                        formFieldLabel: "text-gray-300",
                        formFieldInput: "bg-[#374151] border-gray-600 text-white",
                        formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700",
                        footerActionLink: "text-indigo-400 hover:text-indigo-300",
                        identityPreviewText: "text-white",
                        identityPreviewEditButton: "text-indigo-400",
                    }
                }}
            />
        </div>
    );
}
