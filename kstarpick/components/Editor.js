import React from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Import ReactQuill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-64 border rounded-md flex items-center justify-center bg-gray-50">
    <p className="text-gray-500">에디터 로딩 중...</p>
  </div>
});

// Quill editor modules and formats
const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['link', 'image', 'video'],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'indent',
  'link', 'image', 'video'
];

const Editor = ({ value, onChange, readOnly = false }) => {
  return (
    <ReactQuill
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      formats={formats}
      readOnly={readOnly}
      style={{ height: '350px' }}
    />
  );
};

export default Editor; 