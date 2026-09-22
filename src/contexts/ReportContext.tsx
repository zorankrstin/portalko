import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ReportModalTarget } from '../types';
import { ReportModal } from '../components/ReportModal';

interface ReportContextType {
  openReportModal: (target: ReportModalTarget) => void;
  closeReportModal: () => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [modalTarget, setModalTarget] = useState<ReportModalTarget | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openReportModal = (target: ReportModalTarget) => {
    setModalTarget(target);
    setIsModalOpen(true);
  };

  const closeReportModal = () => {
    setIsModalOpen(false);
  };

  return (
    <ReportContext.Provider value={{ openReportModal, closeReportModal }}>
      {children}
      <ReportModal 
        target={modalTarget} 
        isOpen={isModalOpen} 
        onClose={closeReportModal} 
      />
    </ReportContext.Provider>
  );
}

export function useReportModal(): ReportContextType {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReportModal must be used within a ReportProvider');
  }
  return context;
}
