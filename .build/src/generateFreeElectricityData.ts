import axios from 'axios';
import * as cheerio from 'cheerio';
import { parse } from 'date-fns';
import { enGB } from 'date-fns/locale';
import fs from 'fs';
import { join } from 'path';

const url = 'https://octopus.energy/free-electricity/';

interface Session {
  start: string;
  end: string;
  code?: string;
}

async function getFreeElectricitySessions(): Promise<Session[]> {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    
    const sessions: Session[] = [];

    // Target upcoming sessions by locating h4 and p tags with dates
    $('h4:contains("Free Electricity"), p i').each((_, element) => {
      const text = $(element).text();

      // Updated regex to capture formats like "Thursday 15 August, 1-2pm" and "Sunday 20th October 1-2pm"
      const match = text.match(/(\w+ \d{1,2}(?:[a-z]{2})? \w+),?\s*(\d{1,2})-(\d{1,2})(am|pm)/);
      if (match) {
        const [_, datePart, startHour, endHour, ampm] = match;
        const isAm = ampm === "am";

        console.log({ datePart, startHour, endHour })

        // Parse date with UK format and add times
        const start = parse(`${datePart} ${parseInt(startHour) + (isAm ? 0 : 12)}`, 'EEEE do MMMM HH', new Date(), { locale: enGB });
        const end = parse(`${datePart} ${parseInt(endHour) + (isAm ? 0 : 12)}`, 'EEEE do MMMM HH', new Date(), { locale: enGB });

        sessions.push({ start: start.toISOString(), end: end.toISOString() });
      }
    });

    // Sort sessions by start date
    sessions.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return sessions;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

async function generateFreeElectricityData() {
  try {
    const result = await getFreeElectricitySessions();
    let code = 1
    for (const item of result) {
      item.code = `${code}`;
      code++;
    }

    fs.writeFileSync(join(__dirname, '../../src/free_electricity.json'), JSON.stringify({ data: result }, undefined, 2))
} catch (error) {
    console.error('Error fetching data:', error);
}
}

generateFreeElectricityData();