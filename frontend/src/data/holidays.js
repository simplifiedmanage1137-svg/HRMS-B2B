// Holiday data for the company
// Format: { date: 'DD-MMM-YYYY', name: 'Holiday Name', region: 'India/USA/Global' }

export const holidays = [
    { date: '01-Jan-2026', name: "New Year's Day", region: 'Global' },
    { date: '19-Jan-2026', name: "Martin Luther King Jr. Day", region: 'USA' },
    { date: '26-Jan-2026', name: "Republic Day", region: 'India' },
    { date: '16-Feb-2026', name: "Presidents' Day", region: 'USA' },
    { date: '04-Mar-2026', name: "Holi", region: 'India' },
    { date: '21-Mar-2026', name: "Eid-ul-Fitr", region: 'India' },
    { date: '25-May-2026', name: "Memorial Day", region: 'USA' },
    { date: '27-May-2026', name: "Eid-ul-Adha", region: 'India' },
    { date: '19-Jun-2026', name: "Juneteenth", region: 'USA' },
    { date: '03-Jul-2026', name: "US Independence Day", region: 'USA' },
    { date: '15-Aug-2026', name: "Independence Day", region: 'India' },
    { date: '07-Sep-2026', name: "Labor Day", region: 'USA' },
    { date: '14-Sep-2026', name: "Ganesh Chaturthi", region: 'India' },
     { date: '02-Oct-2026', name: "Gandhi Jayanti", region: 'India' },
    { date: '12-Oct-2026', name: "Columbus Day", region: 'USA' },
    { date: '08-Nov-2026', name: "Diwali", region: 'India' },
    { date: '26-Nov-2026', name: "Thanksgiving", region: 'USA' },
    { date: '25-Dec-2026', name: "Christmas", region: 'Global' }
];

// Group holidays by month for better organization
export const holidaysByMonth = () => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const grouped = {};
    
    holidays.forEach(holiday => {
        const date = new Date(holiday.date);
        const monthName = months[date.getMonth()];
        
        if (!grouped[monthName]) {
            grouped[monthName] = [];
        }
        grouped[monthName].push(holiday);
    });
    
    return grouped;
};

// Get holidays for specific year
export const getHolidaysByYear = (year) => {
    return holidays.filter(holiday => {
        const holidayYear = new Date(holiday.date).getFullYear();
        return holidayYear === year;
    });
};

// Get holidays for specific region
export const getHolidaysByRegion = (region) => {
    if (region === 'All') return holidays;
    return holidays.filter(holiday => holiday.region === region || holiday.region === 'Global');
};

// Count total holidays per year
export const getTotalHolidaysPerYear = (year) => {
    return getHolidaysByYear(year).length;
};