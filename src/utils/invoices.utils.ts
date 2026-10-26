export const numberToWords = (num: number): string => {
    const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF', 'DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
    const tens = ['', '', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX'];

    const convertLessThanHundred = (n: number): string => {
        if (n < 20) return units[n];
        const ten = Math.floor(n / 10);
        const unit = n % 10;
        if (ten === 7 || ten === 9) {
            return tens[ten] + (unit > 0 ? '-' + units[unit + 10] : '');
        }
        return tens[ten] + (unit > 0 ? (ten === 8 && unit === 0 ? '' : '-') + units[unit] : '');
    };

    const convertLessThanThousand = (n: number): string => {
        if (n < 100) return convertLessThanHundred(n);
        const hundred = Math.floor(n / 100);
        const rest = n % 100;
        if (hundred === 1) {
            return 'CENT' + (rest > 0 ? ' ' + convertLessThanHundred(rest) : '');
        }
        return units[hundred] + ' CENT' + (rest > 0 ? ' ' + convertLessThanHundred(rest) : '');
    };

    const convert = (n: number): string => {
        if (n === 0) return 'ZÉRO';
        if (n < 1000) return convertLessThanThousand(n);

        const thousand = Math.floor(n / 1000);
        const rest = n % 1000;

        let result = '';
        if (thousand === 1) {
            result = 'MILLE';
        } else if (thousand < 1000) {
            result = convertLessThanThousand(thousand) + ' MILLE';
        } else {
            const million = Math.floor(thousand / 1000);
            const thousandRest = thousand % 1000;
            if (million === 1) {
                result = 'UN MILLION';
            } else {
                result = convertLessThanThousand(million) + ' MILLIONS';
            }
            if (thousandRest > 0) {
                result += ' ' + (thousandRest === 1 ? 'MILLE' : convertLessThanThousand(thousandRest) + ' MILLE');
            }
        }

        if (rest > 0) {
            result += ' ' + convertLessThanThousand(rest);
        }

        return result;
    };

    const wholePart = Math.floor(num);
    const cents = Math.round((num - wholePart) * 100);

    return convert(wholePart) + ' DIRHAMS ' + (cents < 10 ? '0' : '') + cents + ' CTS';
};