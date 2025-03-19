// leetcode-scraper.js - Bridge between Python scraper and Node.js backend

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

/**
 * Scrape LeetCode contests using the Python script
 * @returns {Promise<Array>} Array of contest objects
 */
async function scrapeLeetcode() {
  return new Promise(async (resolve, reject) => {
    try {
      // Path to the Python script
      const pythonScriptPath = path.join(__dirname, 'leetcode_scraper.py');
      
      // Check if Python script exists
      try {
        await fs.access(pythonScriptPath);
      } catch (error) {
        // If script doesn't exist, create it from the content
        const pythonScriptContent = await fs.readFile(
          path.join(__dirname, 'python_scripts', 'leetcode_scraper.py'),
          'utf8'
        );
        await fs.writeFile(pythonScriptPath, pythonScriptContent);
      }
      
      // Spawn Python process
      const pythonProcess = spawn('python3', [pythonScriptPath]);
      
      let dataString = '';
      let errorString = '';
      
      // Collect data from stdout
      pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });
      
      // Collect any errors
      pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
      });
      
      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python process exited with code ${code}`);
          console.error(`Error: ${errorString}`);
          
          // Fall back to hardcoded data if Python fails
          resolve(getFallbackContests());
          return;
        }
        
        try {
          // Parse JSON output from Python script
          const contests = JSON.parse(dataString);
          console.log(`Successfully scraped ${contests.length} LeetCode contests`);

        //   console.log(contests);
          
          
          // Convert ISO date strings back to Date objects for JS
          const processedContests = contests.map(contest => ({
            ...contest,
            startTime: new Date(contest.startTime),
            endTime: new Date(contest.endTime)
          }));
          
          resolve(processedContests);
        } catch (error) {
          console.error('Error parsing Python output:', error);
          resolve(getFallbackContests());
        }
      });
      
      // Handle process errors
      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        resolve(getFallbackContests());
      });
    } catch (error) {
      console.error('Error in scrapeLeetcode:', error);
      resolve(getFallbackContests());
    }
  });
}

/**
 * Fallback function that returns hardcoded contest data
 * @returns {Array} Array of hardcoded contest objects
 */
function getFallbackContests() {
  console.log('Using fallback contest data');
  const now = new Date();
  const nextSaturday = new Date(now);
  nextSaturday.setDate(now.getDate() + (6 - now.getDay() + 7) % 7);
  nextSaturday.setHours(17, 30, 0, 0); // 17:30 UTC
  
  const results = [];
  
  // Generate upcoming weekly contests
  for (let i = 0; i < 3; i++) {
    const contestDate = new Date(nextSaturday);
    contestDate.setDate(contestDate.getDate() + i * 7);
    
    results.push({
      name: `Weekly Contest ${440 + i}`,
      platform: "LeetCode",
      url: `https://leetcode.com/contest/weekly-contest-${440 + i}`,
      startTime: contestDate,
      endTime: new Date(contestDate.getTime() + 90 * 60 * 1000),
      duration: 90,
      status: "upcoming"
    });
    
    // Add biweekly contest every two weeks
    if (i % 2 === 0) {
      const biweeklyDate = new Date(contestDate);
      biweeklyDate.setDate(biweeklyDate.getDate() - 3); // Typically Wednesday
      
      results.push({
        name: `Biweekly Contest ${126 + Math.floor(i/2)}`,
        platform: "LeetCode",
        url: `https://leetcode.com/contest/biweekly-contest-${126 + Math.floor(i/2)}`,
        startTime: biweeklyDate,
        endTime: new Date(biweeklyDate.getTime() + 90 * 60 * 1000),
        duration: 90,
        status: "upcoming"
      });
    }
  }
  
  // Add some past contests
  for (let i = 1; i <= 5; i++) {
    const contestDate = new Date(nextSaturday);
    contestDate.setDate(contestDate.getDate() - i * 7);
    
    results.push({
      name: `Weekly Contest ${440 - i}`,
      platform: "LeetCode",
      url: `https://leetcode.com/contest/weekly-contest-${440 - i}`,
      startTime: contestDate,
      endTime: new Date(contestDate.getTime() + 90 * 60 * 1000),
      duration: 90,
      status: "past"
    });
    
    // Add past biweekly contests
    if (i % 2 === 0) {
      const biweeklyDate = new Date(contestDate);
      biweeklyDate.setDate(biweeklyDate.getDate() - 3);
      
      results.push({
        name: `Biweekly Contest ${126 - Math.floor(i/2)}`,
        platform: "LeetCode",
        url: `https://leetcode.com/contest/biweekly-contest-${126 - Math.floor(i/2)}`,
        startTime: biweeklyDate,
        endTime: new Date(biweeklyDate.getTime() + 90 * 60 * 1000),
        duration: 90,
        status: "past"
      });
    }
  }
  
  return results;
}

module.exports = scrapeLeetcode;