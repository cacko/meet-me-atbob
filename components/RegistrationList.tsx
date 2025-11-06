import React from 'react';
import { RegistrationForm } from '../types';

interface RegistrationListProps {
  registrations: RegistrationForm[];
  currentUserUid: string;
  registrationDate: string;
}

export const RegistrationList: React.FC<RegistrationListProps> = ({ registrations, currentUserUid, registrationDate }) => {
  const otherRegistrations = registrations.filter(reg => reg.uid !== currentUserUid);

  const formattedDate = new Date(registrationDate).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mt-8 pt-6 border-t border-accent border-opacity-50">
      <h3 className="text-2xl font-heading text-primary mb-4 text-center">
        Guest List for: <span className="text-text-base">{formattedDate}</span>
      </h3>
      {otherRegistrations.length > 0 ? (
        <ul className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {otherRegistrations.map((reg) => (
            <li key={reg.uid} className="p-3 bg-bg-light rounded-md flex justify-between items-center text-text-base animate-fade-in shadow-md">
              <div className="text-left">
                <p className="text-lg font-bold text-primary">{reg.name}</p>
                <p className="text-sm text-text-base opacity-80">Arrival: {new Date(reg.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="text-right">
                 <p className="text-sm text-secondary font-sans">Drink: {reg.selectedProduct ? reg.selectedProduct.name : 'None'}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-text-base italic opacity-80">You're the first to sign up for this date!</p>
      )}
    </div>
  );
};

// CSS for custom scrollbar that can be themed with CSS variables
// This should be added to a global stylesheet or a <style> tag in index.html
/*
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgb(var(--color-bg-light)); 
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgb(var(--color-primary)); 
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--color-accent)); 
}
*/