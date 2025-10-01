import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import AdminLayout from '../../../../components/AdminLayout';
import { AlertCircle, ArrowLeft, Image as ImageIcon, Save, Eye, Globe, Trash2, Link as LinkIcon } from 'lucide-react';

// Dynamic import for ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => (
    <div className="border border-gray-200 rounded-lg h-64 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  ),
});

// Import ReactQuill styles
const QuillStyles = () => {
  useEffect(() => {
    import('react-quill/dist/quill.snow.css');
  }, []);
  return null;
};

export default function EditNews() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    category: 'K-POP',
    tags: [],
    coverImage: '',
    featured: false
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [formError, setFormError] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageInput, setImageInput] = useState('');
  const [isUploadMode, setIsUploadMode] = useState(true);
  
  // Categories for selection
  const categories = [
    { value: 'kpop', label: 'K-POP' },
    { value: 'drama', label: 'K-Drama' },
    { value: 'movie', label: 'Movie' },
    { value: 'variety', label: 'Variety Show' },
    { value: 'celeb', label: 'Celebrity' },
    { value: 'other', label: 'Other' },
  ];

  // Quill editor modules and formats
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
    ],
    clipboard: {
      // HTML 필터링 없이 그대로 유지
      matchVisual: false
    }
  };
  
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'align',
    'link', 'image', 'video'
  ];
  
  // Fetch news data
  useEffect(() => {
    if (!id) return;
    
    const fetchNewsData = async () => {
      setIsLoading(true);
      try {
        console.log(`Fetching news data for ID: ${id}`);
        const response = await fetch(`/api/news/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch news data');
        }
        
        const result = await response.json();
        const data = result.data; // Extract the news data from the response
        console.log('Received news data:', data);
        
        if (!data) {
          throw new Error('No data found in the response');
        }
        
        // Transform tags from string to array if necessary
        let tagsArray = [];
        if (data.tags) {
          tagsArray = Array.isArray(data.tags) ? data.tags : data.tags.split(',').map(tag => tag.trim());
        }
        
        setFormData({
          title: data.title || '',
          summary: data.summary || '',
          content: data.content || '',
          category: data.category || 'K-POP',
          tags: tagsArray,
          coverImage: data.coverImage || '',
          featured: data.featured || false
        });
        
        if (data.coverImage) {
          setUploadedImage({
            url: data.coverImage,
            name: data.coverImage.split('/').pop(),
            size: 0 // Not available from API
          });
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        setFormError(`Error loading news article: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNewsData();
  }, [id]);
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle rich text editor changes
  const handleEditorChange = (content) => {
    setFormData(prev => ({
      ...prev,
      content
    }));
  };
  
  // Handle tag input changes
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };
  
  // Add a tag
  const addTag = (e) => {
    e.preventDefault();
    
    if (!tagInput.trim()) return;
    
    // Check if tag already exists
    if (formData.tags.includes(tagInput.trim())) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, tagInput.trim()]
    }));
    
    setTagInput('');
  };
  
  // Remove a tag
  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    
    // Validate form
    if (!formData.title || !formData.summary || !formData.content) {
      setFormError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }
    
    try {
      console.log(`Submitting update for news ID: ${id}`);
      console.log('Form data being sent:', formData);
      
      const response = await fetch(`/api/news/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update news article');
      }
      
      console.log('Update successful:', result);
      
      // Show success message
      alert('News article updated successfully');
      
      // Redirect to news list
      router.push('/admin/news');
    } catch (error) {
      console.error('Error updating news:', error);
      setFormError(error.message);
      // Scroll to top to show error
      window.scrollTo(0, 0);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    console.log('[Client] Starting file upload:', file.name, file.type, file.size);
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      console.error('[Client] Invalid file type:', file.type);
      setFormError('Invalid file type. Only JPEG, PNG, WebP and GIF are allowed');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error('[Client] File too large:', file.size);
      setFormError('File too large. Maximum size is 5MB');
      return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('image', file);
    console.log('[Client] FormData created, appended "image" field');
    
    try {
      console.log('[Client] Sending upload request to /api/news/upload');
      const response = await fetch('/api/news/upload', {
        method: 'POST',
        body: formData
      });
      
      console.log('[Client] Upload response status:', response.status);
      const responseText = await response.text();
      console.log('[Client] Upload response text:', responseText);
      
      // Parse the response as JSON
      const data = JSON.parse(responseText);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload image');
      }
      
      console.log('[Client] Upload successful, image URL:', data.data.url);
      
      // Set image URL and preview
      setFormData(prev => ({
        ...prev,
        coverImage: data.data.url
      }));
      
      setUploadedImage({
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size
      });
    } catch (error) {
      console.error('[Client] Error uploading image:', error);
      setFormError(error.message);
    }
  };

  // Handle URL image submission
  const handleImageUrlSubmit = (e) => {
    e.preventDefault();
    if (!imageInput.trim()) return;
    
    const isValidUrl = (url) => {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return false;
      }
    };
    
    if (!isValidUrl(imageInput)) {
      setFormError('Please enter a valid URL');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      coverImage: imageInput
    }));
    
    setUploadedImage({
      url: imageInput,
      name: imageInput.split('/').pop(),
      size: 0
    });
    
    setImageInput('');
  };
  
  // Handle file selection
  const handleFileChange = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    handleFileUpload(file);
  };
  
  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };
  
  // Handle image removal
  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      coverImage: ''
    }));
    
    setUploadedImage(null);
  };
  
  // Toggle input method (upload or URL)
  const toggleInputMethod = () => {
    setIsUploadMode(!isUploadMode);
  };
  
  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  // Toggle preview mode
  const togglePreview = () => {
    setPreviewMode(!previewMode);
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <AdminLayout>
        <Head>
          <title>Edit News Article | Admin</title>
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
        <title>Edit News Article | Admin</title>
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
            <h1 className="text-2xl font-bold text-gray-800">Edit News Article</h1>
            <p className="text-gray-500">Update the news article details</p>
          </div>
        </div>
        
        <div className="flex items-center mt-4 md:mt-0 space-x-3">
          <button
            type="button"
            onClick={togglePreview}
            className="px-4 py-2 flex items-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye size={18} className="mr-2" />
            {previewMode ? 'Edit Mode' : 'Preview'}
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 flex items-center bg-[#ff3e8e] text-white rounded-lg hover:bg-[#e02e7c] transition-colors disabled:opacity-50"
          >
            <Save size={18} className="mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      
      {formError && (
        <div className="mb-6 flex items-center p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
          <AlertCircle size={24} className="text-red-500 mr-3" />
          <p className="text-red-700">{formError}</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {previewMode ? (
          <div className="p-6">
            <div className="mb-8">
              {formData.coverImage ? (
                <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={uploadedImage?.url || formData.coverImage}
                    alt={formData.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/images/placeholder.jpg';
                    }}
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
                    {formData.category}
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
                  <div dangerouslySetInnerHTML={{ __html: formData.content }} />
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
                    onChange={handleInputChange}
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
                    onChange={handleInputChange}
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
                      onClick={toggleInputMethod}
                      className={`px-3 py-1.5 text-sm rounded-md ${isUploadMode ? 'bg-[#ff3e8e] text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      Upload Image
                    </button>
                    <button
                      type="button"
                      onClick={toggleInputMethod}
                      className={`px-3 py-1.5 text-sm rounded-md ${!isUploadMode ? 'bg-[#ff3e8e] text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      Image URL
                    </button>
                  </div>
                  
                  {uploadedImage ? (
                    <div className="relative">
                      <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={uploadedImage.url}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/placeholder.jpg';
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors"
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        <p>{uploadedImage.name}</p>
                        {uploadedImage.size > 0 && <p>{formatFileSize(uploadedImage.size)}</p>}
                      </div>
                    </div>
                  ) : isUploadMode ? (
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center ${
                        isDragging ? 'border-[#ff3e8e] bg-[#ff3e8e]/5' : 'border-gray-300'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <ImageIcon size={36} className="mx-auto text-gray-400 mb-3" />
                      <p className="text-sm text-gray-600 mb-2">
                        Drag & drop an image here, or{' '}
                        <label htmlFor="file-upload" className="text-[#ff3e8e] cursor-pointer">
                          browse
                          <input
                            id="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleFileChange}
                          />
                        </label>
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, WEBP or GIF (max. 5MB)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex">
                        <input
                          type="text"
                          value={imageInput}
                          onChange={(e) => setImageInput(e.target.value)}
                          placeholder="Enter image URL"
                          className="block w-full px-4 py-2 border border-gray-200 rounded-l-lg focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e] outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={handleImageUrlSubmit}
                          className="px-4 py-2 bg-[#ff3e8e] text-white rounded-r-lg"
                        >
                          <LinkIcon size={18} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Enter a direct link to an image (https://example.com/image.jpg)
                      </p>
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
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e] outline-none transition-colors"
                  >
                    {categories.map(category => (
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
                      className="block w-full px-4 py-3 border border-gray-200 rounded-l-lg focus:ring-2 focus:ring-[#ff3e8e]/50 focus:border-[#ff3e8e] outline-none transition-colors"
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
                          onClick={() => removeTag(tag)}
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
                    onChange={handleInputChange}
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