import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { AppFooter } from '../components/AppFooter';

const Section = ({ title, children }) => (
    <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground tracking-tight">{title}</h2>
        <div className="text-sm leading-relaxed text-muted-foreground space-y-2">{children}</div>
    </section>
);

export default function PrivacyPolicyPage() {
    const lastUpdated = 'January 2025';
    return (
        <div className="min-h-screen flex flex-col bg-background" data-testid="privacy-page">
            <div className="flex-1">
                <div className="max-w-3xl mx-auto px-6 py-10">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
                        data-testid="privacy-back-link"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Privacy Policy</h1>
                    </div>
                    <p className="text-xs text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

                    <div className="space-y-7">
                        <Section title="1. Introduction">
                            <p>
                                Lumina-SIS ("we", "our", or "us") is a Student Information System used by
                                schools to manage student records, attendance, grades, reports, and related
                                school administration functions. This Privacy Policy explains how we collect,
                                use, store, and protect personal information when you use our services.
                            </p>
                            <p>
                                Your school (the "School") is the data controller of the personal information
                                processed in Lumina-SIS. We act as a data processor on behalf of the School.
                            </p>
                        </Section>

                        <Section title="2. Information We Collect">
                            <p>We may collect and process the following categories of information:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Account data:</strong> name, username, role, email, school code.</li>
                                <li><strong>Student records:</strong> demographic details, enrollment, class assignments, guardians.</li>
                                <li><strong>Academic data:</strong> attendance, grades, gradebook entries, report cards, teacher comments.</li>
                                <li><strong>Health &amp; discipline records:</strong> information entered by authorised staff where applicable.</li>
                                <li><strong>Usage data:</strong> log-in events, audit logs, IP address, browser type, and device information.</li>
                            </ul>
                        </Section>

                        <Section title="3. How We Use Information">
                            <ul className="list-disc pl-5 space-y-1">
                                <li>To provide and operate the Lumina-SIS service.</li>
                                <li>To authenticate users and enforce role-based access control.</li>
                                <li>To enable schools to manage admissions, attendance, gradebooks and reports.</li>
                                <li>To maintain audit logs for security, compliance and accountability.</li>
                                <li>To respond to support requests and improve the service.</li>
                            </ul>
                        </Section>

                        <Section title="4. Legal Basis for Processing">
                            <p>
                                We process personal information on behalf of the School pursuant to a contract
                                with the School and, where applicable, the School's legitimate interests and
                                legal obligations relating to the provision of education.
                            </p>
                        </Section>

                        <Section title="5. Sharing of Information">
                            <p>
                                We do not sell personal information. Information is shared only with:
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Authorised users within the School (administrators, teachers, parents) based on their role.</li>
                                <li>Service sub-processors strictly necessary to operate Lumina-SIS (e.g. cloud hosting, email delivery), under appropriate contractual protections.</li>
                                <li>Authorities, where required by law.</li>
                            </ul>
                        </Section>

                        <Section title="6. Data Retention">
                            <p>
                                We retain personal information for as long as the School's account is active or
                                as needed to provide the service. The School may request export or deletion of
                                its data at any time, subject to applicable laws and record-keeping requirements.
                            </p>
                        </Section>

                        <Section title="7. Security">
                            <p>
                                We implement reasonable administrative, technical, and physical safeguards
                                designed to protect personal information, including encrypted transport (HTTPS),
                                hashed passwords, role-based access, and audit logging. No method of transmission
                                or storage is 100% secure, however.
                            </p>
                        </Section>

                        <Section title="8. Children's Privacy">
                            <p>
                                Lumina-SIS is used by schools and contains information about students who may be
                                minors. Such information is provided by the School and processed under the
                                School's authority. Parents and guardians should contact their School for any
                                inquiries regarding their child's information.
                            </p>
                        </Section>

                        <Section title="9. Your Rights">
                            <p>
                                Depending on your jurisdiction, you may have rights to access, correct, delete,
                                or restrict processing of your personal information. To exercise these rights,
                                please contact your School administrator. Requests submitted directly to us will
                                generally be forwarded to your School.
                            </p>
                        </Section>

                        <Section title="10. Changes to this Policy">
                            <p>
                                We may update this Privacy Policy from time to time. Material changes will be
                                communicated through the application or by notice to schools. The "Last updated"
                                date above indicates when this policy was last revised.
                            </p>
                        </Section>

                        <Section title="11. Contact">
                            <p>
                                For questions about this Privacy Policy or our data practices, please contact
                                your School administrator, who can escalate inquiries to the Lumina-SIS team.
                            </p>
                        </Section>
                    </div>
                </div>
            </div>
            <AppFooter variant="auth" />
        </div>
    );
}
