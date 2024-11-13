export const isNumber = (str) => {
    const number = Number(str);
    return Number.isInteger(number) && !isNaN(number) && str.trim() !== '';
} 