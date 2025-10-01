import React, { useState } from 'react';
import { Plus, X, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import Image from 'next/image';

const CastEditor = ({ value = [], onChange, disabled = false }) => {
  const [newCastMember, setNewCastMember] = useState({
    name: '',
    role: '',
    image: '',
  });
  const [showImageInput, setShowImageInput] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewCastMember(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const addCastMember = () => {
    if (!newCastMember.name.trim()) {
      setError('Cast member name is required');
      return;
    }

    const updatedCast = [
      ...value,
      {
        ...newCastMember,
        order: value.length
      }
    ];

    onChange(updatedCast);
    setNewCastMember({
      name: '',
      role: '',
      image: '',
    });
    setShowImageInput(false);
  };

  const removeCastMember = (index) => {
    const updatedCast = value.filter((_, i) => i !== index);
    // Update order for each cast member
    const reorderedCast = updatedCast.map((member, idx) => ({
      ...member,
      order: idx
    }));
    onChange(reorderedCast);
  };

  const moveCastMember = (index, direction) => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === value.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedCast = [...value];
    
    // Swap the items
    [updatedCast[index], updatedCast[newIndex]] = [updatedCast[newIndex], updatedCast[index]];
    
    // Update order for each cast member
    const reorderedCast = updatedCast.map((member, idx) => ({
      ...member,
      order: idx
    }));
    
    onChange(reorderedCast);
  };

  const toggleImageInput = () => {
    setShowImageInput(!showImageInput);
  };

  // 이미지 URL이 외부 URL인지 확인하는 함수
  const isExternalImage = (url) => {
    return url && (url.startsWith('http://') || url.startsWith('https://'));
  };

  return (
    <div className="space-y-4">
      {value.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {value.map((member, index) => (
            <div key={index} className="flex items-center border rounded-md p-3 bg-white">
              <div className="flex-shrink-0 mr-4">
                {member.image ? (
                  <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-100">
                    {isExternalImage(member.image) ? (
                      // 외부 URL 이미지
                      <img 
                        src={member.image} 
                        alt={member.name}
                        className="w-12 h-12 object-cover"
                        onError={(e) => {
                          console.log(`Cast image error for ${member.name}:`, member.image);
                          e.target.onerror = null; // 무한 루프 방지
                          e.target.src = '/images/placeholder-tvfilm.svg';
                        }}
                      />
                    ) : (
                      // 내부 이미지
                      <Image 
                        src={member.image} 
                        alt={member.name} 
                        width={48} 
                        height={48} 
                        className="object-cover"
                        onError={(e) => {
                          console.log(`Cast image error for ${member.name}:`, member.image);
                          e.target.onerror = null; // 무한 루프 방지
                          e.target.src = '/images/placeholder-tvfilm.svg';
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                    <Upload size={20} />
                  </div>
                )}
              </div>

              <div className="flex-grow">
                <p className="font-medium">{member.name}</p>
                {member.role && (
                  <p className="text-sm text-gray-500">{member.role}</p>
                )}
              </div>

              {!disabled && (
                <div className="flex-shrink-0 flex items-center space-x-1">
                  <button 
                    type="button" 
                    onClick={() => moveCastMember(index, 'up')}
                    disabled={index === 0}
                    className={`p-1 text-gray-500 hover:text-gray-700 ${index === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => moveCastMember(index, 'down')}
                    disabled={index === value.length - 1}
                    className={`p-1 text-gray-500 hover:text-gray-700 ${index === value.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => removeCastMember(index)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="mt-4 border rounded-md p-4 bg-gray-50">
          <h4 className="text-sm font-medium mb-3">Add Cast Member</h4>
          <div className="space-y-3">
            <div>
              <input
                type="text"
                name="name"
                placeholder="Cast member name"
                value={newCastMember.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <input
                type="text"
                name="role"
                placeholder="Role/Character (optional)"
                value={newCastMember.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            {!showImageInput ? (
              <button
                type="button"
                onClick={toggleImageInput}
                className="text-blue-500 text-sm hover:text-blue-700 flex items-center"
              >
                <Plus size={16} className="mr-1" />
                Add image URL
              </button>
            ) : (
              <div>
                <input
                  type="text"
                  name="image"
                  placeholder="Image URL"
                  value={newCastMember.image}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                {newCastMember.image && (
                  <div className="mt-2 flex items-center">
                    <span className="text-xs text-gray-500 mr-2">Preview:</span>
                    {isExternalImage(newCastMember.image) ? (
                      <img 
                        src={newCastMember.image} 
                        alt="Preview"
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/images/placeholder-tvfilm.svg';
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <Upload size={12} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={addCastMember}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Cast Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CastEditor; 