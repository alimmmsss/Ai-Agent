import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import DashboardSidebar from './DashboardSidebar';

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'jc6815248@gmail.com';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Server-side authentication check
    const user = await currentUser();

    // Check if user is authenticated
    if (!user) {
        redirect('/sign-in?redirect_url=/dashboard');
    }

    // Check if user is the owner
    const userEmail = user.emailAddresses[0]?.emailAddress;

    // Debug logging
    console.log('Dashboard Auth Check:', {
        userEmail,
        ownerEmail: OWNER_EMAIL,
        isOwner: userEmail === OWNER_EMAIL,
    });

    if (userEmail !== OWNER_EMAIL) {
        console.log('Unauthorized access attempt - redirecting to home');
        redirect('/?unauthorized=1');
    }

    return (
        <div className="min-h-screen bg-[#111827] lg:flex">
            <DashboardSidebar />
            {/* Main Content */}
            <main className="flex-1 p-4 pt-20 lg:pt-8 lg:p-8 overflow-auto">
                {children}
            </main>
        </div>
    );
}

