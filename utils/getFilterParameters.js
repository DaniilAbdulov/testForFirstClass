export const getFilterParameters = (data, typeOfData) => {
    const res = {};

    if (!data?.length || !typeOfData) {
        return res;
    }

    const range = data.split(',').map((item) => item.trim());

    if (range.length === 1) {
        res.singleParametr = range[0];

        return res;
    }

    if (range.length === 2) {
        let sortedRange;

        switch(typeOfData) {
            case 'numbers':
                sortedRange = sortNumbers(range);
                break;
            case 'date':
                sortedRange = sortDates(range);
                break;
            default:
                break;
        }

        const [min, max] = sortedRange || [];

        res.min = min;
        res.max = max;

        return res;
    }

    return res;
}

const sortDates = (arrOfDates) => arrOfDates.sort((a, b) => new Date(a) - new Date(b));
const sortNumbers = (arrOfNumbers) => arrOfNumbers.sort((a, b) => a - b);