

import type { QuoteCurrency } from '../types';

/**
 * Converts a numeric value into a localized word presentation.
 * Refactored to be language-agnostic using i18next translation keys.
 * 
 * @param num The number to convert
 * @param currency The currency code
 * @param t The i18next translation function
 */
export function numberToWords(num: number, currency: QuoteCurrency = 'KWD', t: any): string {
    const lang = (t.language || (typeof t.i18n === 'object' ? t.i18n.language : 'ar')).split('-')[0];
    
    if (num === 0) return t('numbers:zero');

    const currencies = t('numbers:currencies', { returnObjects: true });
    const c = currencies[currency] || currencies['KWD'];
    const intPart = Math.floor(num);
    const fracPart = Math.round((num - intPart) * c.fraction);

    let result = "";

    if (lang === 'ar') {
        result = convertFullAr(intPart, t);
        
        // Handle Arabic Currency Plurals/Duals
        const mainCurrency = (intPart === 1 ? c.main[0] : intPart === 2 ? c.main[1] : (intPart > 2 && intPart < 11) ? c.main[2] : c.main[0]);
        if (intPart > 0) result += " " + mainCurrency;
        
        if (fracPart > 0) {
            const subCurrency = (fracPart === 1 ? c.sub[0] : fracPart === 2 ? c.sub[1] : (fracPart > 2 && fracPart < 11) ? c.sub[2] : c.sub[0]);
            if (result !== "") result += " " + t('numbers:and') + " ";
            result += convertThreeDigitsAr(fracPart, t) + " " + subCurrency;
        }
        
        const prefix = t('numbers:onlyPrefix');
        return (prefix ? prefix + " " : "") + result.trim() + " " + t('numbers:only');
    } else {
        result = convertFullEn(intPart, t);
        
        // Handle English Currency Plurals
        const mainCurrency = intPart === 1 ? c.main[0] : c.main[1];
        if (intPart > 0) result += " " + mainCurrency;

        if (fracPart > 0) {
            const subCurrency = fracPart === 1 ? c.sub[0] : c.sub[1];
            if (result !== "") result += " " + t('numbers:and') + " ";
            result += convertFullEn(fracPart, t) + " " + subCurrency;
        }

        return result.trim() + " " + t('numbers:only');
    }
}

function convertThreeDigitsAr(num: number, t: any): string {
    const units = t('numbers:units', { returnObjects: true });
    const teens = t('numbers:teens', { returnObjects: true });
    const tens = t('numbers:tens', { returnObjects: true });
    const hundreds = t('numbers:hundreds', { returnObjects: true });

    let str = "";
    const h = Math.floor(num / 100);
    const t_val = Math.floor((num % 100) / 10);
    const u = num % 10;

    if (h > 0) str += hundreds[h];

    if (t_val > 0 || u > 0) {
        if (h > 0) str += " " + t('numbers:and') + " ";

        if (t_val === 1 && u > 0) {
            str += teens[u];
        } else {
            if (u > 0) str += units[u];
            if (t_val > 0) {
                if (u > 0) str += " " + t('numbers:and') + " ";
                str += tens[t_val];
            }
        }
    }
    return str;
}

function convertFullAr(num: number, t: any): string {
    const billionL = t('numbers:billion', { returnObjects: true });
    const millionL = t('numbers:million', { returnObjects: true });
    const thousandL = t('numbers:thousand', { returnObjects: true });
    
    const b = Math.floor(num / 1000000000);
    const m = Math.floor((num % 1000000000) / 1000000);
    const k = Math.floor((num % 1000000) / 1000);
    const r = num % 1000;

    let res = "";
    if (b > 0) {
        res += (b === 1 ? billionL[0] : b === 2 ? billionL[1] : (b > 2 && b < 11) ? convertThreeDigitsAr(b, t) + " " + billionL[2] : convertThreeDigitsAr(b, t) + " " + billionL[0]);
    }

    if (m > 0) {
        if (res !== "") res += " " + t('numbers:and') + " ";
        res += (m === 1 ? millionL[0] : m === 2 ? millionL[1] : (m > 2 && m < 11) ? convertThreeDigitsAr(m, t) + " " + millionL[2] : convertThreeDigitsAr(m, t) + " " + millionL[0]);
    }
    
    if (k > 0) {
        if (res !== "") res += " " + t('numbers:and') + " ";
        res += (k === 1 ? thousandL[0] : k === 2 ? thousandL[1] : (k > 2 && k < 11) ? convertThreeDigitsAr(k, t) + " " + thousandL[2] : convertThreeDigitsAr(k, t) + " " + thousandL[0]);
    }
    
    if (r > 0) {
        if (res !== "") res += " " + t('numbers:and') + " ";
        res += convertThreeDigitsAr(r, t);
    }

    return res;
}

function convertThreeDigitsEn(num: number, t: any): string {
    const units = t('numbers:units', { returnObjects: true });
    const teens = t('numbers:teens', { returnObjects: true });
    const tens = t('numbers:tens', { returnObjects: true });
    const hundred = t('numbers:hundred');

    let str = "";
    if (num >= 100) {
        str += units[Math.floor(num / 100)] + " " + hundred;
        num %= 100;
        if (num > 0) str += " " + t('numbers:and') + " ";
    }
    if (num >= 10 && num <= 19) {
        str += teens[num - 10];
    } else {
        if (num >= 20) {
            str += tens[Math.floor(num / 10)];
            num %= 10;
            if (num > 0) str += "-";
        }
        if (num > 0) str += units[num];
    }
    return str;
}

function convertFullEn(num: number, t: any): string {
    const b = Math.floor(num / 1000000000);
    const m = Math.floor((num % 1000000000) / 1000000);
    const k = Math.floor((num % 1000000) / 1000);
    const r = num % 1000;

    let res = "";
    if (b > 0) res += convertThreeDigitsEn(b, t) + " " + t('numbers:billion') + " ";
    if (m > 0) res += convertThreeDigitsEn(m, t) + " " + t('numbers:million') + " ";
    if (k > 0) res += convertThreeDigitsEn(k, t) + " " + t('numbers:thousand') + " ";
    if (r > 0) res += convertThreeDigitsEn(r, t);

    return res.trim();
}
