"use client";

import { useState } from 'react';
import EditServiceModal from './EditServiceModal';

import { Service, Employee } from '@prisma/client';

interface ServiceWithEmployees extends Service {
  employees: Employee[];
}

export default function EditServiceButton({ service, employees }: { service: ServiceWithEmployees, employees: Employee[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        type="button" 
        onClick={() => setIsOpen(true)}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors mr-3"
      >
        Editar
      </button>
      
      {isOpen && (
        <EditServiceModal 
          service={service} 
          employees={employees} 
          onClose={() => setIsOpen(false)} 
        />
      )}
    </>
  );
}
