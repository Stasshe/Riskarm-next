'use client';

import { useState } from 'react';

interface CollapsibleTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

const CollapsibleText = ({ text, maxLength, className }: CollapsibleTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const shouldCollapse = maxLength && text.length > maxLength;
  const displayedText = shouldCollapse && !isExpanded ? `${text.substring(0, maxLength)}...` : text;

  return (
    <div>
      <p className={`mb-2 whitespace-pre-wrap ${className}`}>{displayedText}</p>
      {shouldCollapse && (
        <button
          onClick={toggleExpanded}
          className="text-link-DEFAULT hover:text-link-hover hover:underline focus:outline-none"
        >
          {isExpanded ? '折りたたむ' : 'もっと見る'}
        </button>
      )}
    </div>
  );
};

export default CollapsibleText;
