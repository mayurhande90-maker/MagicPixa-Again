
import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { Page, View, AuthProps } from './types';

interface PrivacyPolicyPageProps {
    navigateTo: (page: Page, view?: View, sectionId?: string) => void;
    auth: AuthProps;
}

const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ navigateTo, auth }) => {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            <Header navigateTo={navigateTo} auth={auth} />
            <main className="flex-grow max-w-4xl mx-auto px-6 py-16">
                <h1 className="text-4xl font-bold text-slate-900 mb-8 tracking-tight">Privacy Policy</h1>
                <p className="text-sm text-slate-400 mb-10 font-medium italic">Last Updated: October 2024</p>

                <div className="space-y-12 prose prose-slate max-w-none">
                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Introduction</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Welcome to MagicPixa. We are committed to protecting your personal data and your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our AI-powered visual production services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">2. Information We Collect</h2>
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-700">A. Personal Information</h3>
                            <p className="text-slate-600 leading-relaxed">
                                We collect information you provide directly to us, primarily through Google Authentication. This includes your name, email address, and profile picture.
                            </p>
                            <h3 className="text-lg font-bold text-slate-700">B. Visual Content (User Uploads)</h3>
                            <p className="text-slate-600 leading-relaxed">
                                To provide our services, we collect the images you upload. These images are processed by our AI models to generate the requested output.
                            </p>
                            <h3 className="text-lg font-bold text-slate-700">C. Usage & Payment Data</h3>
                            <p className="text-slate-600 leading-relaxed">
                                We track your credit balance and transaction history. Payment information is processed securely through Razorpay; we do not store your full card details or UPI PINs on our servers.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">3. AI Data Processing & Storage</h2>
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-2xl">
                            <p className="text-blue-900 font-medium leading-relaxed">
                                **Transient Storage Policy**: Images uploaded and generated on MagicPixa are stored in a secure cloud gallery for a period of **15 days**. This allows you to review and download your creations. After 15 days, these images are automatically and permanently deleted from our primary storage to ensure your privacy and maintain system performance.
                            </p>
                        </div>
                        <p className="text-slate-600 leading-relaxed mt-6">
                            Our AI processing uses industry-standard encryption. Your uploaded images are used solely to generate your requested assets and are not used to "train" public AI models in a way that would expose your private data.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">4. How We Use Your Information</h2>
                        <ul className="list-disc pl-6 space-y-2 text-slate-600">
                            <li>To provide and maintain the MagicPixa service.</li>
                            <li>To manage your account and credit balance.</li>
                            <li>To process your feedback and provide technical support.</li>
                            <li>To communicate updates, security alerts, and administrative messages.</li>
                            <li>To comply with legal obligations and prevent fraudulent use.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">5. Third-Party Services</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We share information with third-party providers only as necessary to provide our service:
                        </p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-slate-600">
                            <li><strong>Google Cloud/Firebase</strong>: For hosting, database management, and authentication.</li>
                            <li><strong>Razorpay</strong>: For secure payment processing in India.</li>
                            <li><strong>Google Gemini API</strong>: For AI image generation and analysis.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Security</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We implement robust administrative and technical security measures to protect your information from unauthorized access or disclosure. However, no internet transmission is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">7. Your Rights</h2>
                        <p className="text-slate-600 leading-relaxed">
                            You have the right to access the personal data we hold about you and to request that your account be deleted. To exercise these rights, please contact our support team through the "Help & Support" section in your dashboard.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">8. Contact Us</h2>
                        <p className="text-slate-600 leading-relaxed">
                            If you have any questions about this Privacy Policy, please contact us at: <br/>
                            <span className="font-bold text-indigo-600">support@magicpixa.com</span>
                        </p>
                    </section>
                </div>
            </main>
            <Footer navigateTo={navigateTo} />
        </div>
    );
};

export default PrivacyPolicyPage;
