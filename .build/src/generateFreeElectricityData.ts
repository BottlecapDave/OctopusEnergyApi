import axios from 'axios';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { join } from 'path';
// import simpleGit from 'simple-git';

// const git = simpleGit();

// const freeElectricityPath = 'src/free_electricity.json';

// const targetBranch = `feat/free-electricity-data-update`;

const outputSchema = {
  "name": "data_schema",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "data": {
        "type": "array",
        "description": "An array of objects containing start and end properties.",
        "items": {
          "type": "object",
          "properties": {
            "start": {
              "type": "string",
              "description": "The starting point or value."
            },
            "end": {
              "type": "string",
              "description": "The ending point or value."
            }
          },
          "required": [
            "start",
            "end"
          ],
          "additionalProperties": false
        }
      }
    },
    "required": [
      "data"
    ],
    "additionalProperties": false
  }
}

async function generateFreeElectricityData() {
  try {
    // Fetch the HTML of the page
    const { data } = await axios.get("https://octopus.energy/free-electricity/");

    // Get our upcoming block
    const $ = cheerio.load(data);
    const upcomingSessionsSection = $('b:contains("Upcoming Free Electricity Sessions")')
      .parent()
      .parent()
      .html();

    const client = new OpenAI({
      apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
    });

    const chatCompletion = await client.chat.completions.create({
      messages: [{ role: 'user', content: `output the datetimes in ISO format including UK timezone\n${upcomingSessionsSection}` }],
      model: 'gpt-4o-mini',
      response_format: {
        type: 'json_schema',
        json_schema: outputSchema
      }
    });

    const result = JSON.parse(chatCompletion.choices[0].message.content || '');
    result.data.sort((a: any, b: any) => a.start.localeCompare(b.start))
    let code = 1
    for (const item of result.data) {
      item.code = `${code}`;
      code++;
    }

    fs.writeFileSync(join(__dirname, '../../src/free_electricity.json'), JSON.stringify(result, undefined, 2))

    // const status = await git.status();
    // const changedFiles = status.files.map(file => file.path);
    // if (changedFiles.includes(freeElectricityPath)) {
    //   const branches = await git.branch();
    //   if (branches.all.includes(targetBranch) == false) {
    //     await git.checkoutLocalBranch(targetBranch);
    //     await git.commit('chore: Updated free electricity data', [freeElectricityPath]);
    //     await git.push(`origin`, targetBranch);
    //   }
    // }
} catch (error) {
    console.error('Error fetching data:', error);
}
}

generateFreeElectricityData();