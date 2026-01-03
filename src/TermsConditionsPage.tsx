
import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { Page, View, AuthProps } from './types';

interface TermsConditionsPageProps {
    navigateTo: (page: Page, view?: View, sectionId?: string) => void;
    auth: AuthProps;
}

const TermsConditionsPage: React.FC<TermsConditionsPageProps> = ({ navigateTo, auth }) => {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            <Header navigateTo={navigateTo} auth={auth} />
            <main className="flex-grow max-w-4xl mx-auto px-6 py-16">
                <h1 className="text-4xl font-bold text-slate-900 mb-8 tracking-tight">Terms of Service</h1>
                <p className="text-sm text-slate-400 mb-10 font-medium italic">Effective Date: December 2025</p>

                <div className="space-y-12 prose prose-slate max-w-none">
                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Acceptance of Terms</h2>
                        <p className="text-slate-600 leading-relaxed">
                            By accessing or using the MagicPixa platform ("the Service"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">2. Description of Service</h2>
                        <p className="text-slate-600 leading-relaxed">
                            MagicPixa provides AI-powered visual creation tools, including but not limited to product photography enhancement, ad creation, interior design visualization, and social media content tools.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">3. User Accounts & Responsibilities</h2>
                        <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                            <li>You must be at least 18 years old to use the Service.</li>
                            <li>You are responsible for maintaining the security of your Google account used for login.</li>
                            <li>You agree not to use the Service for any illegal or unauthorized purpose, including the generation of NSFW, defamatory, or harmful content.</li>
                            <li>You must own or have the necessary rights to the images you upload for processing.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">4. Ownership & Intellectual Property</h2>
                        <div className="bg-indigo-50 border-l-4 border-indigo-400 p-6 rounded-r-2xl">
                            <h3 className="text-indigo-900 font-bold mb-2">Usage Rights</h3>
                            <p className="text-indigo-800 leading-relaxed">
                                <strong className="font-bold">User Ownership</strong>: MagicPixa grants you full commercial usage rights to the images generated through paid credit packs. You may use these images for advertisements, websites, social media, and other business purposes.
                                <br/><br/>
                                <strong className="font-bold">AI Nature Disclosure</strong>: While you own the rights to the output, you acknowledge that the content is AI-generated. Current copyright laws regarding AI-generated works vary by jurisdiction, and MagicPixa makes no guarantee regarding the registrability of AI outputs for copyright.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">5. Credits & Payments</h2>
                        <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                            <li>MagicPixa operates on a one-time "Credit Pack" basis. Credits have no expiration date.</li>
                            <li>All sales are final. We do not offer cash refunds for purchased credits.</li>
                            <li><strong className="font-bold">Quality Refund Policy</strong>: We provide an automated "Report Issue" system. If a generation is significantly distorted or fails to meet professional standards, you may request a credit refund within the app. This is limited to one automated refund per 24-hour period per user.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Storage & Deletion</h2>
                        <p className="text-slate-600 leading-relaxed">
                            MagicPixa provides a temporary gallery for your convenience. Generated images are stored for <strong className="font-bold">15 days</strong>. It is your responsibility to download your assets within this timeframe. MagicPixa is not liable for data loss after the 15-day deletion period.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">7. Limitation of Liability</h2>
                        <p className="text-slate-600 leading-relaxed">
                            MagicPixa provides the Service "as is". We are not liable for any damages resulting from AI "hallucinations," visual inaccuracies, or the failure of generated content to meet specific marketing goals. We do not guarantee 100% uptime.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">8. Termination</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We reserve the right to suspend or terminate your account without notice if you violate these terms, engage in fraudulent activity, or misuse our AI resources.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">9. Changes to Terms</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We may update these terms from time to time. Your continued use of the Service after changes are posted constitutes your acceptance of the new terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">10. Governing Law</h2>
                        <p className="text-slate-600 leading-relaxed">
                            These terms shall be governed by and construed in accordance with the laws of India.
                        </p>
                    </section>
                </div>
            </main>
            <Footer navigateTo={navigateTo} />
        </div>
    );
};

export default TermsConditionsPage;
