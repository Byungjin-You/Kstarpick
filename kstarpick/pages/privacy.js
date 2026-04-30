import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import MainLayout from '../components/MainLayout';

export default function PrivacyPage() {
  return (
    <MainLayout>
      <Seo
        title="Privacy Policy"
        description="KstarPick privacy policy explaining how we collect, use, and protect personal information from visitors and registered users on our K-Pop news portal."
        url="/privacy"
      />
      <Header />
      <div className="min-h-screen bg-[#FAFAFA]">
        <main className="max-w-[900px] mx-auto px-4 lg:px-10 pt-[68px] lg:pt-[100px] pb-12">
          <article className="bg-white rounded-2xl border border-[#F3F4F6] p-6 lg:p-12 shadow-card">
            <h1 className="text-[28px] lg:text-[36px] font-black text-[#101828] mb-2">
              <span style={{ color: '#2B7FFF' }}>Privacy</span> Policy
            </h1>
            <p className="text-sm text-ksp-meta mb-8">Last updated: April 30, 2026</p>

            <div className="prose prose-lg max-w-none text-[#374151] leading-relaxed space-y-5">
              <p>
                KstarPick (&quot;we&quot;, &quot;our&quot;, &quot;the Service&quot;) respects your privacy. This policy explains what data we collect, how we use it, and your rights regarding it.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">1. Information We Collect</h2>
              <p>We collect the following categories of data:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account information:</strong> Email address, display name, and password (hashed) when you register.</li>
                <li><strong>Usage data:</strong> Page views, articles read, time spent, and referring URLs, collected via cookies and analytics tools.</li>
                <li><strong>Device data:</strong> Browser type, operating system, device category, and IP address (used for geolocation at country level).</li>
                <li><strong>Comments &amp; reactions:</strong> Content you post on articles, comments, and any reactions or votes you submit.</li>
              </ul>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">2. How We Use Your Data</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To deliver content and personalize recommendations based on your interests.</li>
                <li>To improve site performance and prioritize editorial coverage based on aggregate readership patterns.</li>
                <li>To respond to your inquiries, comments, and support requests.</li>
                <li>To detect abuse, spam, and security threats.</li>
                <li>To comply with legal obligations.</li>
              </ul>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">3. Third-Party Services</h2>
              <p>We use the following third-party tools:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Google Analytics</strong> — to understand site usage. Data is anonymized at the IP level.</li>
                <li><strong>Google AdSense</strong> — to display advertising. AdSense may use cookies to personalize ads. You can opt out at <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-ksp-accent hover:underline">adssettings.google.com</a>.</li>
                <li><strong>YouTube embeds</strong> — videos embedded on our pages set cookies controlled by YouTube/Google.</li>
              </ul>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">4. Cookies</h2>
              <p>
                We use first-party cookies for authentication and session management, and third-party cookies for analytics and advertising. You can disable cookies in your browser settings, but some site features may not work without them.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">5. Data Retention</h2>
              <p>
                Account data is retained as long as your account is active. Comments remain on the site unless you request removal. Aggregate analytics data is retained for up to 26 months.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access the personal data we hold about you.</li>
                <li>Request correction of inaccurate data.</li>
                <li>Request deletion of your account and associated data.</li>
                <li>Object to processing for marketing purposes.</li>
                <li>Lodge a complaint with the relevant data protection authority.</li>
              </ul>
              <p>
                To exercise any of these rights, email <a href="mailto:contact@kstarpick.com" className="text-ksp-accent font-semibold hover:underline">contact@kstarpick.com</a>.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">7. Children&apos;s Privacy</h2>
              <p>
                The Service is not directed at children under 13. We do not knowingly collect data from children under 13. If you believe we have, please contact us so we can delete it.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">8. Changes to This Policy</h2>
              <p>
                We may update this policy from time to time. Material changes will be announced on the homepage. Continued use of the Service after changes constitutes acceptance of the updated policy.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">9. Contact</h2>
              <p>
                Questions about this policy: <a href="mailto:contact@kstarpick.com" className="text-ksp-accent font-semibold hover:underline">contact@kstarpick.com</a>
              </p>
            </div>
          </article>
        </main>
        <Footer />
      </div>
    </MainLayout>
  );
}
