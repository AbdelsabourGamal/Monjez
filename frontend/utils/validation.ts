
import type { Quote, Contract, ContractTemplate, GenericDocument, DocumentTemplate } from '../types';

/**
 * Validates the entire quote object.
 * @param quote The quote object to validate.
 * @param t The translations function (react-i18next).
 * @returns An object containing validation errors, with keys matching field names.
 */
export const validateQuote = (quote: Quote, t: (key: string) => string): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (quote.validityType === 'temporary' && quote.expiryDate && quote.expiryDate < quote.issueDate) {
    errors.expiryDate = t('quotes:expiryDateError');
  }
  
  const discountNum = Number(quote.discount);
  if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      errors.discount = t('quotes:percentageError');
  }

  const taxNum = Number(quote.tax);
  if (isNaN(taxNum) || taxNum < 0 || taxNum > 100) {
      errors.tax = t('quotes:percentageError');
  }

  quote.items.forEach((item, index) => {
    if (item.qty <= 0) {
      errors[`items.${index}.qty`] = t('quotes:positiveQtyError');
    }
    if (item.price < 0) {
      errors[`items.${index}.price`] = t('quotes:nonNegativePriceError');
    }
  });

  return errors;
};

/**
 * Validates the contract data based on its template.
 * @param contract The contract object to validate.
 * @param template The contract template defining the validation rules. Can be undefined for custom contracts.
 * @param t The translations function (react-i18next).
 * @returns An object containing validation errors.
 */
export const validateContract = (contract: Contract, template: ContractTemplate | undefined, t: (key: string) => string): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (contract.templateId === 'custom') {
        // All fields are optional
        return errors;
    }

    if (!template) return errors;

    for (const key in template.variables) {
        const config = template.variables[key];
        const value = contract.data[key];

        // Context-aware validation for switchable parties
        const groupKey = key.split('.')[0];
        const partyType = contract.data[`${groupKey}.partyType`] || 'company';
        if (template.switchableParties?.includes(groupKey) && config.context && config.context !== partyType) {
            continue; // Skip validation for hidden fields
        }

        const isFilled = value !== undefined && value !== null && String(value).trim() !== '';
        
        // If a field is filled, proceed with type-specific validation.
        if (isFilled && config.type === 'number') {
            const numValue = Number(value);
            if (isNaN(numValue)) {
                errors[key] = t('common:invalidNumberError');
            } else {
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('days') || lowerKey.includes('years') || lowerKey.includes('term')) {
                    if (!Number.isInteger(numValue) || numValue <= 0) {
                        errors[key] = t('common:positiveIntegerError');
                    }
                } else if (lowerKey.includes('share') || lowerKey.includes('percentage')) {
                    if (numValue < 0 || numValue > 100) {
                        errors[key] = t('common:percentageError');
                    }
                } else if (numValue < 0) {
                     errors[key] = t('common:nonNegativeNumberError');
                }
            }
        }
    }
    return errors;
}

/**
 * Validates the document data based on its template.
 * @param document The document object to validate.
 * @param template The document template defining the validation rules. Can be undefined for custom documents.
 * @param t The translations function (react-i18next).
 * @returns An object containing validation errors.
 */
export const validateDocument = (document: GenericDocument, template: DocumentTemplate | undefined, t: (key: string) => string): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (document.templateId === 'custom') {
       // All fields are optional
        return errors;
    }

    if (!template) return errors;

    for (const key in template.variables) {
        const config = template.variables[key];
        const value = document.data[key];

        const isFilled = value !== undefined && value !== null && String(value).trim() !== '';

        if (isFilled && config.type === 'number') {
            const numValue = Number(value);
            if (isNaN(numValue)) {
                errors[key] = t('common:invalidNumberError');
            } else if (numValue < 0) {
                errors[key] = t('common:nonNegativeNumberError');
            }
        }
    }
    return errors;
};
