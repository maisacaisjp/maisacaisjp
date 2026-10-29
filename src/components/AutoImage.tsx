import React, { useState } from 'react';

interface AutoImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  baseName: string;
  explicitUrl?: string;
}

const extensions = ['.png', '.jpg', '.jpeg', '.webp'];

export const AutoImage: React.FC<AutoImageProps> = ({ baseName, explicitUrl, className, alt, onClick, ...props }) => {
  const [extIndex, setExtIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  // If we have an explicit URL that works, try that first.
  // But wait! The explicit URLs in menu.ts are WRONG according to the user.
  // So we should try the baseName + extension FIRST.

  const getSrc = () => {
    if (extIndex < extensions.length) {
      return `/${baseName}${extensions[extIndex]}`;
    }
    // Fallback to explicitUrl if we exhausted extensions, or just fail
    if (explicitUrl && explicitUrl !== 'none' && !explicitUrl.startsWith('/e-')) {
       return explicitUrl.startsWith('http') ? explicitUrl : (explicitUrl.startsWith('/') ? explicitUrl : `/${explicitUrl}`);
    }
    return '';
  };

  const currentSrc = getSrc();

  if (hasError || !currentSrc) {
    return null; // Or return a placeholder
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={() => {
        if (extIndex < extensions.length) {
          setExtIndex(extIndex + 1);
        } else {
          setHasError(true);
        }
      }}
      {...props}
    />
  );
};
