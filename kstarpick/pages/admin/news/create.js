import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { Calendar, FileText, User, Settings, ArrowLeft, Image as ImageIcon, ChevronLeft, Save, Tag, AlertCircle, Eye, Globe, Trash2, Link as LinkIcon, Plus, Upload, X, CheckCircle } from 'lucide-react';
import AdminLayout from '../../../components/AdminLayout';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'react-hot-toast';

// Import ReactQuill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-64 border rounded-md flex items-center justify-center bg-gray-50">
    <p className="text-gray-500">에디터 로딩 중...</p>
  </div>
});

// Import Quill styles using useEffect to avoid SSR issues
const QuillStyles = () => {
  useEffect(() => {
    import('react-quill/dist/quill.snow.css');
  }, []);
  return null;
};

// Quill editor modules and formats
const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['link', 'image'],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'indent',
  'align',
  'link', 'image'
];

const NEWS_CATEGORIES = [
  { value: 'kpop', label: 'K-POP' },
  { value: 'kdrama', label: 'K-Drama' },
  { value: 'entertainment', label: '엔터테인먼트' },
  { value: 'celebrity', label: '셀러브리티' },
  { value: 'interview', label: '인터뷰' },
  { value: 'culture', label: '문화' }
];

// 카테고리 옵션
const categoryOptions = [
  { value: 'drama', label: 'Drama' },
  { value: 'kpop', label: 'K-POP' },
  { value: 'celeb', label: 'Celebrity' },
  { value: 'movie', label: 'Movie' },
  { value: 'variety', label: 'Variety Show' },
  { value: 'other', label: 'Other' },
];

// 초기값
const initialFormData = {
  title: '',
  summary: '',
  content: '',
  category: 'drama',
  featured: false,
  tags: [],
};

export default function CreateNews() {
  const router = useRouter();
  const { data: session, status } = useSession({ required: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for form data
  const [formData, setFormData] = useState(initialFormData);
  const [tagInput, setTagInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [useImageUrl, setUseImageUrl] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 인증 체크를 최소화하고 개발 환경에서는 생략
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/admin/news/create');
    }
  }, [status, router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear any error when user changes any field
    setError('');
  };

  // Handle tag input changes
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  // Add tag to form data
  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  // Handle tag input key press (Enter)
  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Remove tag from form data
  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    console.log('[Client] Starting file upload:', file.name, file.type, file.size);
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      console.error('[Client] Invalid file type:', file.type);
      setError('지원되는 이미지 형식은 JPEG, PNG, WebP, GIF입니다.');
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('[Client] File too large:', file.size);
      setError('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }
    
    setFile(file);
    
    try {
      // 파일 미리보기 설정
      setFilePreview(URL.createObjectURL(file));
      
      // Clear any existing error message
      setError('');
      
      // Set form data
      setFormData(prev => ({
        ...prev,
        coverImage: file
      }));
      
      toast.success('이미지가 성공적으로 선택되었습니다.');
    } catch (error) {
      console.error('[Client] Error handling file:', error);
      setError('파일 처리 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };
  
  // Handle image URL input
  const handleImageUrlChange = (e) => {
    setImageUrl(e.target.value);
    // Clear any existing error when user types
    setError('');
  };
  
  // Set image from URL
  const setImageFromUrl = () => {
    if (imageUrl.trim()) {
      // URL에서 '@' 문자가 포함되어 있다면 제거
      const cleanUrl = imageUrl.trim().replace(/^@/, '');
      console.log('[Client] Setting image from URL:', cleanUrl);
      
      // 이미지 URL 유효성 검사 (기본적인 검사)
      if (!cleanUrl.match(/^(http|https):\/\//)) {
        setError('URL은 http:// 또는 https://로 시작해야 합니다.');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        coverImage: cleanUrl
      }));
      
      // 이미지 미리보기 설정
      setFilePreview(cleanUrl);
      
      // 파일 초기화 (URL 사용 시 파일은 null로 설정)
      setFile(null);
      
      // Clear any error message
      setError('');
      
      toast.success('이미지 URL이 설정되었습니다.');
    } else {
      setError('이미지 URL을 입력해주세요.');
    }
  };
  
  // Handle image URL input key press (Enter)
  const handleImageUrlKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setImageFromUrl();
    }
  };

  // Toggle preview mode
  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Handle editor content change
  const handleEditorChange = (content) => {
    setFormData({
      ...formData,
      content
    });
    
    // Clear any error when content changes
    setError('');
  };

  // Handle drag over for file upload
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  // Handle drag leave for file upload
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  // Handle drop for file upload
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    setIsSubmitting(true);
    
    try {
      // 필수 필드 확인
      const requiredFields = ['title', 'summary', 'content', 'category'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      // 이미지 확인 (파일 또는 URL 중 하나는 제공되어야 함)
      if (!formData.coverImage && !useImageUrl && !imageUrl) {
        setError('커버 이미지는 필수입니다. 파일을 업로드하거나 이미지 URL을 입력해주세요.');
        setIsSubmitting(false);
        return;
      }
      
      if (missingFields.length > 0) {
        setError(`필수 항목을 모두 입력해주세요: ${missingFields.join(', ')}`);
        setIsSubmitting(false);
        return;
      }
      
      // 폼 데이터 준비
      const finalFormData = new FormData();
      finalFormData.append('title', formData.title);
      finalFormData.append('summary', formData.summary);
      finalFormData.append('content', formData.content);
      finalFormData.append('category', formData.category);
      finalFormData.append('featured', formData.featured);
      
      // 태그 추가
      if (formData.tags && formData.tags.length > 0) {
        finalFormData.append('tags', JSON.stringify(formData.tags));
      } else {
        finalFormData.append('tags', JSON.stringify([]));
      }
      
      // 이미지 처리
      if (useImageUrl && imageUrl) {
        // URL을 통한 이미지 등록
        console.log('Using image URL:', imageUrl);
        // URL이 http:// 또는 https://로 시작하는지 확인
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          setError('이미지 URL은 http:// 또는 https://로 시작해야 합니다.');
          setIsSubmitting(false);
          return;
        }
        
        // URL에서 '@' 문자 제거 (이 문자는 일부 시스템에서 문제를 일으킬 수 있음)
        const cleanedUrl = imageUrl.replace(/@/g, '');
        finalFormData.append('coverImageUrl', cleanedUrl);
      } else if (formData.coverImage) {
        // 파일 업로드
        finalFormData.append('file', formData.coverImage);
      }
      
      console.log('Form data being submitted:', Object.fromEntries(finalFormData.entries()));
      
      // API 요청
      const response = await fetch('/api/news', {
        method: 'POST',
        body: finalFormData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '뉴스 등록 중 오류가 발생했습니다.');
      }
      
      // 성공 메시지 표시
      toast.success('뉴스가 성공적으로 등록되었습니다.');
      
      // 폼 초기화
      setFormData({
        title: '',
        summary: '',
        content: '',
        category: '',
        tags: [],
        featured: false
      });
      setTagInput('');
      setImageUrl('');
      setUseImageUrl(false);
      setFile(null);
      setFilePreview(null);
      
      // 1초 후 목록 페이지로 이동
      setTimeout(() => {
        router.push('/admin/news');
      }, 1000);
      
    } catch (error) {
      console.error('뉴스 등록 오류:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Toggle between upload and URL input
  const toggleImageInputMethod = () => {
    const newUseImageUrl = !useImageUrl;
    setUseImageUrl(newUseImageUrl);
    
    // Reset file or URL based on new input method
    if (newUseImageUrl) {
      // Switching to URL input mode
      setFile(null);
      setFilePreview(null);
    } else {
      // Switching to file upload mode
      setImageUrl('');
    }
    
    // Clear error
    setError('');
  };

  // 간소화된 로딩 상태 표시
  if (status === 'loading') {
    return (
      <AdminLayout>
        <Head>
          <title>Create News Article | Admin</title>
        </Head>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Create News Article | Admin</title>
      </Head>
      <QuillStyles />
      
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Create News Article</h1>
            <p className="text-gray-500">Create a new news article to publish on your site</p>
          </div>
        </div>
        
        <div className="flex items-center mt-4 md:mt-0 space-x-3">
          <button
            type="button"
            onClick={togglePreviewMode}
            className={`px-4 py-2 flex items-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors`}
          >
            <Eye size={18} className="mr-2" />
            {previewMode ? 'Edit Mode' : 'Preview'}
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 flex items-center bg-[#ff3e8e] text-white rounded-lg hover:bg-[#e02e7c] transition-colors"
          >
            <Save size={18} className="mr-2" />
            {isSubmitting ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 flex items-center p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
          <AlertCircle size={24} className="text-red-500 mr-3" />
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-6 flex items-center p-4 bg-green-50 border-l-4 border-green-500 rounded-md">
          <CheckCircle size={24} className="text-green-500 mr-3" />
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {previewMode ? (
          <div className="p-6">
            <div className="mb-8">
              {formData.coverImage ? (
                <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={formData.coverImage}
                    alt={formData.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <ImageIcon size={48} className="mx-auto mb-2" />
                    <p>No cover image</p>
                  </div>
                </div>
              )}
              
              <div className="mt-6 mb-4">
                {formData.category && (
                  <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded">
                    {NEWS_CATEGORIES.find(c => c.value === formData.category)?.label || formData.category}
                  </span>
                )}
                {formData.featured && (
                  <span className="inline-block bg-green-100 text-green-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded">
                    Featured
                  </span>
                )}
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {formData.title || 'Untitled Article'}
              </h1>
              
              <p className="text-xl text-gray-600 mb-8">
                {formData.summary || 'No summary provided'}
              </p>
              
              <div className="flex items-center text-sm text-gray-500 mb-8">
                <Globe size={16} className="mr-2" />
                <span>Published: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              
              <div className="prose prose-lg max-w-none">
                {formData.content ? (
                  <div dangerouslySetInnerHTML={{ __html: formData.content.replace(/\n/g, '<br>') }} />
                ) : (
                  <p className="text-gray-400">No content provided</p>
                )}
              </div>
              
              {formData.tags.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e] outline-none transition-colors"
                    placeholder="Enter article title"
                    required
                  />
                </div>
                
                {/* Summary */}
                <div>
                  <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">
                    Summary <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="summary"
                    name="summary"
                    value={formData.summary}
                    onChange={handleChange}
                    rows="3"
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e] outline-none transition-colors"
                    placeholder="Enter a brief summary of the article"
                    required
                  ></textarea>
                </div>
                
                {/* Content - Rich Text Editor */}
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-200 rounded-lg" style={{ height: '400px' }}>
                    <ReactQuill
                      theme="snow"
                      value={formData.content}
                      onChange={handleEditorChange}
                      modules={modules}
                      formats={formats}
                      placeholder="Write your article content here..."
                      style={{ height: '358px' }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Use the formatting toolbar to style your content, add links, and insert images.
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cover Image <span className="text-red-500">*</span>
                  </label>
                  
                  <div className="flex justify-between mb-3">
                    <button
                      type="button"
                      onClick={toggleImageInputMethod}
                      className={`px-3 py-1.5 text-sm rounded-md ${useImageUrl ? 'bg-[#ff3e8e] text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {useImageUrl ? <Upload size={16} /> : <LinkIcon size={16} />}
                    </button>
                  </div>
                  
                  {useImageUrl ? (
                    <div className="space-y-2">
                      <div className="flex">
                        <input
                          type="text"
                          value={imageUrl}
                          onChange={handleImageUrlChange}
                          onKeyPress={handleImageUrlKeyPress}
                          placeholder="Enter image URL"
                          className="flex-1 p-3 border rounded-l-md border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={setImageFromUrl}
                          className="px-4 py-3 bg-gray-100 text-gray-700 border border-gray-300 rounded-r-md hover:bg-gray-200"
                        >
                          적용
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        외부 URL을 입력하세요 (예: https://example.com/image.jpg). '@' 문자가 앞에 있다면 자동으로 제거됩니다.
                      </p>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center ${
                        isDragging ? 'border-[#ff3e8e] bg-[#ff3e8e]/5' : 'border-gray-300'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="flex flex-col items-center justify-center space-y-3">
                        {filePreview ? (
                          <div className="relative w-full max-w-xs">
                            <img
                              src={filePreview}
                              alt="Preview"
                              className="w-full h-48 object-cover rounded-md"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFile(null);
                                setFilePreview('');
                                setFormData({
                                  ...formData,
                                  coverImage: ''
                                });
                              }}
                              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="p-3 rounded-full bg-gray-100 text-gray-400">
                              <ImageIcon size={24} />
                            </div>
                            <div className="text-center">
                              <p className="text-gray-700 mb-1">이미지를 여기에 끌어다 놓거나</p>
                              <label className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-md cursor-pointer hover:bg-gray-200">
                                컴퓨터에서 이미지 선택
                                <input
                                  type="file"
                                  onChange={handleFileInputChange}
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <p className="text-xs text-gray-500">지원 형식: JPEG, PNG, WebP, GIF (최대 5MB)</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e] outline-none transition-colors"
                  >
                    {categoryOptions.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Tags */}
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex mb-2">
                    <input
                      type="text"
                      id="tagInput"
                      value={tagInput}
                      onChange={handleTagInputChange}
                      onKeyPress={handleTagKeyPress}
                      className="flex-1 p-3 border border-gray-200 rounded-l-lg focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e] outline-none transition-colors"
                      placeholder="Add a tag"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-3 bg-gray-100 text-gray-700 rounded-r-lg hover:bg-gray-200 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="inline-flex items-center bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            removeTag(tag);
                          }}
                          className="ml-1 text-gray-500 hover:text-gray-700"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Featured */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="featured"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#ff3e8e] border-gray-300 rounded focus:ring-[#ff3e8e]"
                  />
                  <label htmlFor="featured" className="ml-2 block text-sm text-gray-700">
                    Featured Article
                  </label>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
} 