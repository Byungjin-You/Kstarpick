import Link from 'next/link';
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-[#b20505] to-[#ff5f6d] text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          {/* Logo and About */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <span className="text-[#b20505] font-bold text-sm">K</span>
              </div>
              <span className="text-xl font-bold">K-Pop News Portal</span>
            </Link>
            <p className="text-white text-opacity-90 mb-4 text-sm">
              Your source for K-Pop, K-Drama, and Korean entertainment news.
            </p>
            {/* SNS 링크 영역 - 임시 주석처리 */}
            {/*
            <div className="flex gap-3 mb-4">
              <a href="#" className="text-white hover:text-gray-200 transition-colors duration-200">
                <Facebook size={16} />
              </a>
              <a href="#" className="text-white hover:text-gray-200 transition-colors duration-200">
                <Twitter size={16} />
              </a>
              <a href="#" className="text-white hover:text-gray-200 transition-colors duration-200">
                <Instagram size={16} />
              </a>
              <a href="#" className="text-white hover:text-gray-200 transition-colors duration-200">
                <Youtube size={16} />
              </a>
            </div>
            */}
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-base font-semibold mb-4">Categories</h3>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              <li>
                <Link href="/drama" className="text-white text-opacity-90 hover:text-opacity-100">
                  Drama
                </Link>
              </li>
              <li>
                <Link href="/tvfilm" className="text-white text-opacity-90 hover:text-opacity-100">
                  TV/Film
                </Link>
              </li>
              <li>
                <Link href="/music" className="text-white text-opacity-90 hover:text-opacity-100">
                  Music
                </Link>
              </li>
              <li>
                <Link href="/celeb" className="text-white text-opacity-90 hover:text-opacity-100">
                  Celebrity
                </Link>
              </li>
              <li>
                <Link href="/ranking" className="text-white text-opacity-90 hover:text-opacity-100">
                  Rankings
                </Link>
              </li>
              <li>
                <Link href="/features" className="text-white text-opacity-90 hover:text-opacity-100">
                  Features
                </Link>
              </li>
            </ul>
          </div>

          {/* Company 영역 - 임시 주석처리 */}
          {/*
          <div>
            <h3 className="text-base font-semibold mb-4">Company</h3>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              <li>
                <Link href="/about" className="text-white text-opacity-90 hover:text-opacity-100">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-white text-opacity-90 hover:text-opacity-100">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/advertise" className="text-white text-opacity-90 hover:text-opacity-100">
                  Advertise
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white text-opacity-90 hover:text-opacity-100">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-white text-opacity-90 hover:text-opacity-100">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
          */}
        </div>
        
        {/* Copyright */}
        <div className="border-t border-white border-opacity-20 pt-4 text-center text-sm text-white text-opacity-90">
          <p>© {currentYear} K-Pop News Portal. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
} 