import { parseDate, formatDateTime } from './services/dataService.ts';

// Helper wrapper to add Z
const parseDateForceUTC = (dateStr: string) => {
    let toParse = dateStr;
    if (!toParse.endsWith('Z')) {
        toParse = `${toParse}Z`;
    }
    return parseDate(toParse);
}

const testDate2 = "2026-02-26 08:42:05";

console.log("--- Forced UTC ---");
console.log(`Original: ${testDate2}`);
console.log(`Parsed result: ${formatDateTime(testDate2)}`); // Should be local
// Reformat it with a T so Date.parse accepts the Z
console.log(`Forced result: ${formatDateTime(new Date(parseDateForceUTC(testDate2.replace(' ', 'T'))).toISOString())}`);
