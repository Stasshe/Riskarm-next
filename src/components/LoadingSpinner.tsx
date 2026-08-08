'use client';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

const LoadingSpinner = ({ size = 'medium' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-4',
    large: 'h-16 w-16 border-4',
  };

  return (
    <div className="flex justify-center items-center h-full">
      <div
        className={`animate-spin rounded-full border-t-primary-DEFAULT border-b-primary-DEFAULT border-gray-200 ${sizeClasses[size]}`}
      />
    </div>
  );
};

export default LoadingSpinner;
