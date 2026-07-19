import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  closeOnOutsideClick?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  closeOnOutsideClick = true,
  title,
  children,
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = () => {
    if (closeOnOutsideClick) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-24"
      onMouseDown={handleBackdropClick}
    >
      <div
        className={`bg-bg-main border border-border-main rounded shadow-lg w-full max-w-lg ${className}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {title && (
          <div className="px-4 py-3 border-b border-border-main">
            <h2 className="text-text-main font-medium">{title}</h2>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
};
