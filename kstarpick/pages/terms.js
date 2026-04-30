import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import MainLayout from '../components/MainLayout';

export default function TermsPage() {
  return (
    <MainLayout>
      <Seo
        title="Terms of Service"
        description="KstarPick terms of service governing your use of our K-Pop news portal, including user content, intellectual property, and acceptable use policies."
        url="/terms"
      />
      <Header />
      <div className="min-h-screen bg-[#FAFAFA]">
        <main className="max-w-[900px] mx-auto px-4 lg:px-10 pt-[68px] lg:pt-[100px] pb-12">
          <article className="bg-white rounded-2xl border border-[#F3F4F6] p-6 lg:p-12 shadow-card">
            <h1 className="text-[28px] lg:text-[36px] font-black text-[#101828] mb-2">
              <span style={{ color: '#2B7FFF' }}>Terms</span> of Service
            </h1>
            <p className="text-sm text-ksp-meta mb-8">Last updated: April 30, 2026</p>

            <div className="prose prose-lg max-w-none text-[#374151] leading-relaxed space-y-5">
              <p>
                These Terms of Service (&quot;Terms&quot;) govern your access to and use of KstarPick (&quot;the Service&quot;). By using the Service, you agree to these Terms. If you do not agree, do not use the Service.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">1. Use of the Service</h2>
              <p>
                You may browse the Service for personal, non-commercial use. You agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Scrape, mass-download, or systematically extract content without our written permission.</li>
                <li>Attempt to bypass security measures, rate limits, or authentication.</li>
                <li>Submit content that is unlawful, defamatory, harassing, or infringes any third-party rights.</li>
                <li>Use the Service to transmit malware, spam, or unsolicited advertising.</li>
                <li>Impersonate another person or entity, or misrepresent your affiliation.</li>
              </ul>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">2. User Accounts</h2>
              <p>
                To post comments or use certain features, you may need to register an account. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. Notify us immediately of any unauthorized use.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">3. User-Generated Content</h2>
              <p>
                Comments, reactions, and other content you submit remain your property. By submitting content, you grant KstarPick a non-exclusive, royalty-free, worldwide license to use, display, and distribute that content within the Service. We reserve the right to remove content that violates these Terms or applicable law.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">4. Intellectual Property</h2>
              <p>
                Editorial articles produced by KstarPick are protected by copyright. You may share short excerpts with attribution and a link to the original article. Republication of full articles without permission is prohibited.
              </p>
              <p>
                Photos, videos, and other media may be sourced from third parties and remain the property of their respective owners. KstarPick does not claim ownership of third-party media used under fair use, official embeds, or licensed agreements.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">5. Third-Party Content</h2>
              <p>
                The Service may include links to or excerpts from third-party sources. We do not endorse and are not responsible for third-party content. When we attribute content to an outside source, please refer to the original publication for full context.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">6. DMCA &amp; Copyright</h2>
              <p>
                If you believe content on this Service infringes your copyright, send a takedown request to <a href="mailto:copyright@kstarpick.com" className="text-ksp-accent font-semibold hover:underline">copyright@kstarpick.com</a> with: (a) your contact information, (b) the URL of the infringing content, (c) proof of ownership, and (d) a good-faith statement. We respond within 72 hours.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">7. Disclaimers</h2>
              <p>
                The Service is provided &quot;as is&quot;. We do not warrant that the Service will be uninterrupted, error-free, or that information is always accurate. Use of the Service is at your own risk.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, KstarPick is not liable for any indirect, incidental, or consequential damages arising from your use of the Service.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">9. Termination</h2>
              <p>
                We may suspend or terminate accounts that violate these Terms. You may delete your account at any time by contacting us.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">10. Changes to Terms</h2>
              <p>
                We may update these Terms periodically. Continued use after changes are posted constitutes acceptance of the revised Terms.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">11. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the Republic of Korea. Disputes shall be resolved in the courts of Seoul, Republic of Korea.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">12. Contact</h2>
              <p>
                Questions about these Terms: <a href="mailto:contact@kstarpick.com" className="text-ksp-accent font-semibold hover:underline">contact@kstarpick.com</a>
              </p>
            </div>
          </article>
        </main>
        <Footer />
      </div>
    </MainLayout>
  );
}
