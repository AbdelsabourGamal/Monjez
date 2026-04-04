import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ContractData, Language, ContractTemplate } from '../types';

interface PhoneInputGroupProps {
  baseKey: string;
  data: ContractData;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errors: Record<string, string>;
  templateVariables?: ContractTemplate['variables'];
}

export const PhoneInputGroup: React.FC<PhoneInputGroupProps> = ({ baseKey, data, onChange, errors, templateVariables }) => {
  const { t, i18n } = useTranslation();
  const language = (i18n.language || 'en') as Language;
  const countryCodeKey = `${baseKey}.countryCode`;
  const numberKey = `${baseKey}.number`;

  if (!templateVariables) return null;

  const countryCodeConfig = templateVariables[countryCodeKey];
  const numberConfig = templateVariables[numberKey];

  if (!countryCodeConfig || !numberConfig) return null;

  const countryCodeValue = data[countryCodeKey] || '';
  const numberValue = data[numberKey] || '';
  
  const getLabel = (config: any) => {
    if (config.labelKey) return t(config.labelKey);
    if (config.label) return config.label[language] || config.label.en;
    return '';
  };
  
  const countryCodeLabel = getLabel(countryCodeConfig);
  const numberLabel = getLabel(numberConfig);
  
  const countryCodeError = errors[countryCodeKey];
  const numberError = errors[numberKey];

  return (
    <div>
        <div className="flex items-start gap-2">
            <div className="w-1/4">
                <label htmlFor={countryCodeKey} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {countryCodeLabel}
                </label>
                <input
                    type="text"
                    name={countryCodeKey}
                    id={countryCodeKey}
                    value={countryCodeValue}
                    onChange={onChange}
                    placeholder="+965"
                    className={`w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 ${countryCodeError ? 'border-red-500' : ''}`}
                />
                 {countryCodeError && <p className="text-red-500 text-xs mt-1">{countryCodeError}</p>}
            </div>
            <div className="flex-1">
                 <label htmlFor={numberKey} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {numberLabel}
                </label>
                <input
                    type="tel"
                    name={numberKey}
                    id={numberKey}
                    value={numberValue}
                    onChange={onChange}
                    placeholder={numberLabel}
                    className={`w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 ${numberError ? 'border-red-500' : ''}`}
                />
                 {numberError && <p className="text-red-500 text-xs mt-1">{numberError}</p>}
            </div>
        </div>
    </div>
  );
};