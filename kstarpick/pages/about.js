import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import MainLayout from '../components/MainLayout';

export default function AboutPage() {
  return (
    <MainLayout>
      <Seo
        title="About KstarPick"
        description="Learn about KstarPick — an English-language K-Pop and Korean entertainment news portal covering BTS, BLACKPINK, K-Drama, K-Movie, and the Korean Wave for global fans."
        url="/about"
      />
      <Header />
      <div className="min-h-screen bg-[#FAFAFA]">
        <main className="max-w-[900px] mx-auto px-4 lg:px-10 pt-[68px] lg:pt-[100px] pb-12">
          <article className="bg-white rounded-2xl border border-[#F3F4F6] p-6 lg:p-12 shadow-card">
            <h1 className="text-[28px] lg:text-[36px] font-black text-[#101828] mb-6">
              <span style={{ color: '#2B7FFF' }}>About</span> KstarPick
            </h1>

            <div className="prose prose-lg max-w-none text-[#374151] leading-relaxed space-y-5">
              <p>
                <strong>KstarPick</strong> is an English-language news portal dedicated to K-Pop, Korean drama, Korean cinema, and the broader Korean entertainment industry. We curate, translate, and republish the latest stories so global fans can follow the Korean Wave (Hallyu) without language barriers.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">What We Cover</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>K-Pop:</strong> Idol group news, comebacks, music show wins, chart performance, awards (BTS, BLACKPINK, aespa, NewJeans, IVE, SEVENTEEN, TWICE, Stray Kids, and more).</li>
                <li><strong>K-Drama:</strong> Episode reviews, casting announcements, ratings, behind-the-scenes coverage of Korean dramas.</li>
                <li><strong>K-Movie:</strong> Box office reports, festival coverage, releases of Korean films.</li>
                <li><strong>Celebrity News:</strong> Airport fashion, fan meetings, brand events, lifestyle features of Korean celebrities.</li>
                <li><strong>Schedule &amp; Rankings:</strong> Upcoming K-Pop release calendar, comeback schedule, and trending charts.</li>
              </ul>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">Editorial Approach</h2>
              <p>
                Our editorial team aggregates verified Korean-language sources and produces English coverage suited to international audiences. When we republish or translate content from third parties, we credit the original source and provide a link back. We do not claim authorship over information we have not produced ourselves.
              </p>
              <p>
                For original photography and copyrighted images, we use officially licensed materials, embeds from official channels (such as YouTube), or our own visuals. If you believe content has been used without proper authorization, please contact us using the details below and we will respond promptly.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">Our Mission</h2>
              <p>
                K-Pop and Korean entertainment have grown into a global cultural movement, but timely English coverage remains fragmented. KstarPick aims to be a one-stop reference for international fans — clear, comprehensive, and updated throughout the day.
              </p>

              <h2 className="text-[22px] font-bold text-[#101828] mt-8 mb-3">Get in Touch</h2>
              <p>
                For partnership inquiries, content corrections, copyright concerns, or general feedback, please visit our <a href="/contact" className="text-ksp-accent font-semibold hover:underline">Contact page</a>.
              </p>
            </div>
          </article>
        </main>
        <Footer />
      </div>
    </MainLayout>
  );
}
