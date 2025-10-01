import { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';

const ShareModal = ({ isOpen, onClose, title, url, description, image }) => {
  const [copied, setCopied] = useState(false);
  const [canUseWebShare, setCanUseWebShare] = useState(false);

  useEffect(() => {
    // Check if Web Share API is supported
    setCanUseWebShare(
      typeof navigator !== 'undefined' && 
      navigator.share && 
      navigator.canShare && 
      navigator.canShare({
        title,
        text: description,
        url
      })
    );
  }, [title, description, url]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title,
        text: description,
        url
      });
      onClose();
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const shareToInstagram = () => {
    // Instagram doesn't have a direct web share API
    // Usually we'd redirect to Instagram app with a deeplink
    // For now, we'll show an alert with instructions
    alert('Instagram sharing: Copy the link and share it on Instagram manually, or take a screenshot and share it on your story.');
  };

  const shareToTikTok = () => {
    // TikTok doesn't have a direct web share API yet
    // For now, we'll open TikTok's website
    window.open('https://www.tiktok.com/', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-md p-6 mx-4 bg-white rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
        
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Share this drama</h3>
          <p className="text-sm text-gray-500 mt-1">{title}</p>
        </div>
        
        {/* Share options */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {canUseWebShare && (
            <button 
              onClick={handleNativeShare} 
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-pink-50 hover:bg-pink-100 transition-colors col-span-4 mb-2"
            >
              <div className="flex items-center justify-center mb-1">
                <ExternalLink className="w-5 h-5 mr-2 text-pink-600" />
                <span className="font-medium text-pink-600">Use device sharing</span>
              </div>
              <p className="text-xs text-gray-500">Use your device's native share menu</p>
            </button>
          )}
          
          <button 
            onClick={shareToFacebook} 
            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1877F2] text-white mb-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96C18.34 21.21 22 17.06 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
              </svg>
            </div>
            <span className="text-xs text-gray-600">Facebook</span>
          </button>
          
          <button 
            onClick={shareToTwitter} 
            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1DA1F2] text-white mb-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
              </svg>
            </div>
            <span className="text-xs text-gray-600">Twitter</span>
          </button>
          
          <button 
            onClick={shareToInstagram} 
            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400 text-white mb-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
              </svg>
            </div>
            <span className="text-xs text-gray-600">Instagram</span>
          </button>
          
          <button 
            onClick={shareToTikTok} 
            className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-black text-white mb-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
            </div>
            <span className="text-xs text-gray-600">TikTok</span>
          </button>
        </div>
        
        {/* Copy link */}
        <div className="border-t pt-4">
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={url} 
              readOnly 
              className="w-full py-2 pl-3 pr-16 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gray-50"
            />
            <button
              onClick={handleCopyLink}
              className={`absolute right-2 p-1.5 rounded-md ${copied ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} transition-colors`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="mt-2 text-xs text-center text-gray-500">
            {copied ? 'Link copied to clipboard!' : 'Copy link to share anywhere'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareModal; 