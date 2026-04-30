import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import MainLayout from '../components/MainLayout';
import { Mail, AlertTriangle, Briefcase, MessageSquare } from 'lucide-react';

export default function ContactPage() {
  return (
    <MainLayout>
      <Seo
        title="Contact KstarPick"
        description="Contact KstarPick for partnership inquiries, content corrections, copyright concerns, or general feedback about our K-Pop and Korean entertainment coverage."
        url="/contact"
      />
      <Header />
      <div className="min-h-screen bg-[#FAFAFA]">
        <main className="max-w-[900px] mx-auto px-4 lg:px-10 pt-[68px] lg:pt-[100px] pb-12">
          <article className="bg-white rounded-2xl border border-[#F3F4F6] p-6 lg:p-12 shadow-card">
            <h1 className="text-[28px] lg:text-[36px] font-black text-[#101828] mb-6">
              <span style={{ color: '#2B7FFF' }}>Contact</span> KstarPick
            </h1>

            <p className="text-[#374151] text-lg mb-8 leading-relaxed">
              We welcome partnership inquiries, content corrections, copyright requests, and reader feedback. Please use the appropriate contact channel below.
            </p>

            <div className="space-y-6">
              <div className="flex gap-4 items-start p-5 border border-[#F3F4F6] rounded-xl hover:border-ksp-accent transition-colors">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-ksp-accent" />
                </div>
                <div>
                  <h2 className="font-bold text-[18px] text-[#101828] mb-1">General Inquiries</h2>
                  <p className="text-[#374151] mb-2">For reader questions, story tips, or feedback about our coverage.</p>
                  <a href="mailto:contact@kstarpick.com" className="text-ksp-accent font-semibold hover:underline">contact@kstarpick.com</a>
                </div>
              </div>

              <div className="flex gap-4 items-start p-5 border border-[#F3F4F6] rounded-xl hover:border-ksp-accent transition-colors">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-bold text-[18px] text-[#101828] mb-1">Copyright &amp; DMCA</h2>
                  <p className="text-[#374151] mb-2">If you believe an image, photo, or text on this site has been used without proper authorization, please email us with the URL of the page in question and proof of ownership. We respond within 72 hours.</p>
                  <a href="mailto:copyright@kstarpick.com" className="text-ksp-accent font-semibold hover:underline">copyright@kstarpick.com</a>
                </div>
              </div>

              <div className="flex gap-4 items-start p-5 border border-[#F3F4F6] rounded-xl hover:border-ksp-accent transition-colors">
                <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <h2 className="font-bold text-[18px] text-[#101828] mb-1">Partnerships &amp; Advertising</h2>
                  <p className="text-[#374151] mb-2">Brand partnerships, sponsored content, and advertising inquiries.</p>
                  <a href="mailto:partners@kstarpick.com" className="text-ksp-accent font-semibold hover:underline">partners@kstarpick.com</a>
                </div>
              </div>

              <div className="flex gap-4 items-start p-5 border border-[#F3F4F6] rounded-xl hover:border-ksp-accent transition-colors">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-bold text-[18px] text-[#101828] mb-1">Corrections</h2>
                  <p className="text-[#374151] mb-2">Spotted a factual error? Send us the article URL and the correction needed. We take accuracy seriously.</p>
                  <a href="mailto:corrections@kstarpick.com" className="text-ksp-accent font-semibold hover:underline">corrections@kstarpick.com</a>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-[#E5E7EB]">
              <h2 className="font-bold text-[20px] text-[#101828] mb-3">Response Time</h2>
              <p className="text-[#374151]">
                We aim to respond to all inquiries within 2 business days. Copyright and DMCA concerns are prioritized and addressed within 72 hours.
              </p>
            </div>
          </article>
        </main>
        <Footer />
      </div>
    </MainLayout>
  );
}
