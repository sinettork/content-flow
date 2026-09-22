import { getCambodiaDateParts, toCambodiaDateKey } from "@/lib/cambodia-locale";

export interface CambodiaHoliday {
  date: string;
  name: string;
  nameKhmer: string;
  kind: "public";
  sourceYear: number;
}

export const CAMBODIA_PUBLIC_HOLIDAYS_2026: CambodiaHoliday[] = [
  { date: "2026-01-01", name: "International New Year's Day", nameKhmer: "ទិវាចូលឆ្នាំសកល", kind: "public", sourceYear: 2026 },
  { date: "2026-01-07", name: "Victory Day over Genocide", nameKhmer: "ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍", kind: "public", sourceYear: 2026 },
  { date: "2026-03-08", name: "International Women's Day", nameKhmer: "ទិវាអន្តរជាតិនារី", kind: "public", sourceYear: 2026 },

  { date: "2026-04-14", name: "Khmer New Year", nameKhmer: "ពិធីបុណ្យចូលឆ្នាំថ្មី ប្រពៃណីជាតិ", kind: "public", sourceYear: 2026 },
  { date: "2026-04-15", name: "Khmer New Year", nameKhmer: "ពិធីបុណ្យចូលឆ្នាំថ្មី ប្រពៃណីជាតិ", kind: "public", sourceYear: 2026 },
  { date: "2026-04-16", name: "Khmer New Year", nameKhmer: "ពិធីបុណ្យចូលឆ្នាំថ្មី ប្រពៃណីជាតិ", kind: "public", sourceYear: 2026 },

  {
    date: "2026-05-01",
    name: "International Labour Day & Visak Bochea Day",
    nameKhmer: "ទិវាពលកម្មអន្តរជាតិ និងពិធីបុណ្យវិសាខបូជា",
    kind: "public",
    sourceYear: 2026,
  },
  { date: "2026-05-05", name: "Royal Ploughing Ceremony", nameKhmer: "ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល", kind: "public", sourceYear: 2026 },
  {
    date: "2026-05-14",
    name: "King Norodom Sihamoni's Birthday",
    nameKhmer: "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះករុណាព្រះបាទ សម្ដេចព្រះបរមនាថ នរោត្តម សីហមុនី",
    kind: "public",
    sourceYear: 2026,
  },
  {
    date: "2026-06-18",
    name: "Queen Mother Norodom Monineath Sihanouk's Birthday",
    nameKhmer: "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម សម្ដេចព្រះមហាក្សត្រី នរោត្តម មុនិនាថ សីហនុ",
    kind: "public",
    sourceYear: 2026,
  },
  { date: "2026-09-24", name: "Constitution Day", nameKhmer: "ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ", kind: "public", sourceYear: 2026 },

  { date: "2026-10-10", name: "Pchum Ben Festival", nameKhmer: "ពិធីបុណ្យភ្ជុំបិណ្ឌ", kind: "public", sourceYear: 2026 },
  { date: "2026-10-11", name: "Pchum Ben Festival", nameKhmer: "ពិធីបុណ្យភ្ជុំបិណ្ឌ", kind: "public", sourceYear: 2026 },
  { date: "2026-10-12", name: "Pchum Ben Festival", nameKhmer: "ពិធីបុណ្យភ្ជុំបិណ្ឌ", kind: "public", sourceYear: 2026 },

  {
    date: "2026-10-15",
    name: "Commemoration Day of King Father Norodom Sihanouk",
    nameKhmer: "ទិវាប្រារព្ធពិធីគោរពព្រះវិញ្ញាណក្ខន្ធ ព្រះករុណាព្រះបាទ សម្ដេចវររាជបិតា",
    kind: "public",
    sourceYear: 2026,
  },
  {
    date: "2026-10-29",
    name: "King Norodom Sihamoni's Coronation Day",
    nameKhmer: "ព្រះរាជពិធីគ្រងព្រះបរមរាជសម្បត្តិរបស់ ព្រះករុណាព្រះបាទ សម្ដេចព្រះបរមនាថ នរោត្តម សីហមុនី",
    kind: "public",
    sourceYear: 2026,
  },
  { date: "2026-11-09", name: "National Independence Day", nameKhmer: "ពិធីបុណ្យឯករាជ្យជាតិ", kind: "public", sourceYear: 2026 },

  { date: "2026-11-23", name: "Water Festival", nameKhmer: "ព្រះរាជពិធីបុណ្យអុំទូក បណ្ដែតប្រទីប និងសំពះព្រះខែ អកអំបុក", kind: "public", sourceYear: 2026 },
  { date: "2026-11-24", name: "Water Festival", nameKhmer: "ព្រះរាជពិធីបុណ្យអុំទូក បណ្ដែតប្រទីប និងសំពះព្រះខែ អកអំបុក", kind: "public", sourceYear: 2026 },
  { date: "2026-11-25", name: "Water Festival", nameKhmer: "ព្រះរាជពិធីបុណ្យអុំទូក បណ្ដែតប្រទីប និងសំពះព្រះខែ អកអំបុក", kind: "public", sourceYear: 2026 },

  { date: "2026-12-29", name: "Peace Day in Cambodia", nameKhmer: "ទិវាសន្តិភាពនៅកម្ពុជា", kind: "public", sourceYear: 2026 },
];

const HOLIDAYS_BY_DATE = new Map(CAMBODIA_PUBLIC_HOLIDAYS_2026.map((holiday) => [holiday.date, holiday]));

export function getCambodiaPublicHoliday(value: string | Date | null | undefined): CambodiaHoliday | null {
  const key = toCambodiaDateKey(value);
  return key ? HOLIDAYS_BY_DATE.get(key) ?? null : null;
}

export function isCambodiaPublicHoliday(value: string | Date | null | undefined): boolean {
  return Boolean(getCambodiaPublicHoliday(value));
}

export function getCambodiaPublicHolidays(year: number): CambodiaHoliday[] {
  if (year !== 2026) return [];
  return CAMBODIA_PUBLIC_HOLIDAYS_2026;
}

export function getCambodiaPublicHolidayYear(value: string | Date | null | undefined): number | null {
  const parts = getCambodiaDateParts(value);
  return parts?.year ?? null;
}
