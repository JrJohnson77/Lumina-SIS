import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { AppFooter } from '../components/AppFooter';

const Section = ({ title, children }) => (
    <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">{title}</h2>
        <div className="text-sm leading-relaxed text-muted-foreground space-y-2">{children}</div>
    </section>
);

export default function TermsOfUsePage() {
    const lastUpdated = 'January 2025';
    return (
        <div className="min-h-screen flex flex-col bg-background" data-testid="terms-page">
            <div className="flex-1">
                <div className="max-w-3xl mx-auto px-6 py-10">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
                        data-testid="terms-back-link"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Terms of Use</h1>
                    </div>
                    <p className="text-xs text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

                    <div className="space-y-7">
                        <Section title="1. Acceptance of Terms">
                            <p>
                                These Terms of Use ("Terms") govern your access to and use of the Lumina-SIS
                                Student Information System (the "Service"). By accessing or using the Service,
                                you agree to be bound by these Terms. If you do not agree, you must not use
                                the Service.
                            </p>
                        </Section>

                        <Section title="2. Eligibility &amp; Accounts">
                            <p>
                                Access to the Service is provided to staff, teachers, administrators, and
                                parents authorised by a participating School. Accounts are created and managed
                                by your School administrator. You are responsible for keeping your credentials
                                confidential and for all activity occurring under your account.
                            </p>
                        </Section>

                        <Section title="3. Acceptable Use">
                            <p>You agree NOT to:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Use the Service in violation of any law or School policy.</li>
                                <li>Access data or features outside your assigned role and permissions.</li>
                                <li>Attempt to interfere with, compromise, or reverse-engineer the Service.</li>
                                <li>Upload malicious code, harmful content, or content that infringes the rights of others.</li>
                                <li>Use the Service to harass, abuse, or harm another person.</li>
                            </ul>
                        </Section>

                        <Section title="4. School Data">
                            <p>
                                All student, staff, and academic records entered into the Service ("School Data")
                                remain the property of the School. We process School Data solely to provide the
                                Service and in accordance with our Privacy Policy and the School's instructions.
                            </p>
                        </Section>

                        <Section title="5. Intellectual Property">
                            <p>
                                The Service, including its software, design, logos, and content (excluding School
                                Data), is owned by Lumina-SIS and its licensors and is protected by intellectual
                                property laws. You are granted a limited, non-exclusive, non-transferable right to
                                access and use the Service for its intended purpose.
                            </p>
                        </Section>

                        <Section title="6. Availability &amp; Modifications">
                            <p>
                                We strive to provide reliable access to the Service but do not guarantee that it
                                will be uninterrupted or error-free. We may modify, suspend, or discontinue
                                features at any time without prior notice.
                            </p>
                        </Section>

                        <Section title="7. Disclaimers">
                            <p>
                                The Service is provided on an "AS IS" and "AS AVAILABLE" basis, without warranties
                                of any kind, express or implied, including merchantability, fitness for a
                                particular purpose, and non-infringement, to the maximum extent permitted by law.
                            </p>
                        </Section>

                        <Section title="8. Limitation of Liability">
                            <p>
                                To the maximum extent permitted by law, Lumina-SIS and its affiliates shall not
                                be liable for any indirect, incidental, special, consequential, or punitive
                                damages, or any loss of profits or data, arising out of or relating to your use
                                of the Service.
                            </p>
                        </Section>

                        <Section title="9. Termination">
                            <p>
                                We or your School may suspend or terminate your access to the Service at any
                                time, with or without cause. Upon termination, your right to use the Service
                                ceases immediately.
                            </p>
                        </Section>

                        <Section title="10. Governing Law">
                            <p>
                                These Terms are governed by the laws of the jurisdiction in which your School is
                                established, without regard to its conflict of laws principles.
                            </p>
                        </Section>

                        <Section title="11. Changes to these Terms">
                            <p>
                                We may update these Terms from time to time. Continued use of the Service after
                                changes constitutes acceptance of the revised Terms. The "Last updated" date above
                                indicates when these Terms were last revised.
                            </p>
                        </Section>

                        <Section title="12. Contact">
                            <p>
                                Questions about these Terms should be directed to your School administrator.
                            </p>
                        </Section>
                    </div>
                </div>
            </div>
            <AppFooter variant="auth" />
        </div>
    );
}
