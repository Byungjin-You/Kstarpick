import React from 'react';

const IconText = ({ icon, text, className = '' }) => {
  const Icon = icon;
  
  return (
    <div className={`flex items-center ${className}`}>
      {Icon && <Icon size={16} className="mr-2" />}
      <span>{text}</span>
    </div>
  );
};

export default IconText; 