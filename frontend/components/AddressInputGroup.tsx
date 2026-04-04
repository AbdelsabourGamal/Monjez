import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ContractData, Language, ContractTemplate } from '../types';

interface AddressInputGroupProps {
  baseKey: string;
  data: ContractData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: Record<string, string>;
  templateVariables?: ContractTemplate['variables'];
}

export const AddressInputGroup: React.FC<AddressInputGroupProps> = ({ baseKey, data, onChange, errors, templateVariables }) => {
  const { t, i18n } = useTranslation();
  const language = (i18n.language || 'en') as Language;
  const fields = ['country', 'block', 'street', 'building'];
  
  if (!templateVariables) return null;

  return (
    <div className="space-y-4 p-4 border rounded-md bg-gray-50/50 dark:bg-gray-800/20 dark:border-gray-700">
      {fields.map(field => {
        const key = `${baseKey}.${field}`;
        const config = templateVariables[key];
        if (!config) return null;
        
        const value = data[key] || '';
        
        // Handle both new 'labelKey' and legacy 'label' object format
        let labelStr = '';
        if ((config as any).labelKey) {
            labelStr = t((config as any).labelKey);
        } else if ((config as any).label) {
            labelStr = (config as any).label[language] || (config as any).label.en;
        }

        const label = labelStr;
        const error = errors[key];

        return (
          <div key={key}>
            <label htmlFor={key} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {label}
            </label>
            <input
              type="text"
              name={key}
              id={key}
              value={value}
              onChange={onChange}
              placeholder={label}
              className={`w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-sm ${error ? 'border-red-500' : ''}`}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
        );
      })}
    </div>
  );
};