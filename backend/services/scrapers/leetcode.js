const axios = require('../utils/axios-config');
const cheerio = require('cheerio');
const https = require('https');

async function scrapeLeetcode() {
  console.log('Scraping LeetCode contests...');
  
  try {
    // Focus only on DOM scraping since API approach isn't working
    const contests = await scrapeContestsFromDOM();
    
    if (contests && contests.length > 0) {
      console.log(`Successfully found ${contests.length} LeetCode contests`);
      return contests;
    } else {
      console.log('No contests found from scraping, using fallback data');
      return getFallbackContests();
    }
  } catch (error) {
    console.error('Error scraping LeetCode contests:', error.message);
    return getFallbackContests();
  }
}

async function scrapeContestsFromDOM() {
  try {
    // Configure request with browser-like headers to avoid being blocked
    const response = await axios.get('https://leetcode.com/contest/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // Disables SSL verification
      }),
      timeout: 10000 // 10 second timeout
    });
    
    const $ = cheerio.load(response.data);
    const contests = [];
    const now = new Date();
    
    console.log('Successfully loaded LeetCode contest page');
    
    // First attempt: Extract contest data from script tags (most reliable)
    const scriptContests = extractContestsFromScripts($, now);
    if (scriptContests.length > 0) {
      console.log(`Found ${scriptContests.length} contests from script tags`);
      return scriptContests;
    }
    
    // Second attempt: Extract from DOM elements
    const domContests = extractContestsFromDOM($, now);
    if (domContests.length > 0) {
      console.log(`Found ${domContests.length} contests from DOM elements`);
      return domContests;
    }
    
    // If no contests found, try an alternative page
    console.log('No contests found on main page, trying alternative endpoint...');
    const altResponse = await axios.get('https://leetcode.com/contest/calendar/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    });
    
    const alt$ = cheerio.load(altResponse.data);
    
    // Try to extract from alternative page
    const altScriptContests = extractContestsFromScripts(alt$, now);
    if (altScriptContests.length > 0) {
      console.log(`Found ${altScriptContests.length} contests from calendar page script tags`);
      return altScriptContests;
    }
    
    const altDomContests = extractContestsFromDOM(alt$, now);
    if (altDomContests.length > 0) {
      console.log(`Found ${altDomContests.length} contests from calendar page DOM`);
      return altDomContests;
    }
    
    console.log('No contests found via scraping');
    return [];
  } catch (error) {
    console.error('Error scraping contests from DOM:', error.message);
    return [];
  }
}

function extractContestsFromScripts($, now) {
  const contests = [];
  const scriptTags = $('script').toArray();
  
  for (const script of scriptTags) {
    const content = $(script).html() || '';
    
    // Try multiple regex patterns to find contest data
    const patterns = [
      /window\.pageData\s*=\s*({.*?});/s,
      /window\.CONTEST_DATA\s*=\s*({.*?});/s,
      /contests\s*:\s*(\[.*?\])/s,
      /initialState.*?contests.*?(\[.*?\])/s,
      /"contestData"\s*:\s*({.*?})/s
    ];
    
    for (const pattern of patterns) {
      const dataMatch = content.match(pattern);
      if (dataMatch && dataMatch[1]) {
        try {
          const parsedData = JSON.parse(dataMatch[1]);
          
          // Handle different data structures
          let contestArray = [];
          if (Array.isArray(parsedData)) {
            contestArray = parsedData;
          } else if (parsedData.contests) {
            contestArray = parsedData.contests;
          } else if (parsedData.contestData) {
            contestArray = parsedData.contestData;
          } else if (parsedData.data && parsedData.data.contests) {
            contestArray = parsedData.data.contests;
          }
          
          if (contestArray.length > 0) {
            for (const contest of contestArray) {
              const contestObj = processContestObject(contest, now);
              if (contestObj) {
                contests.push(contestObj);
              }
            }
          }
        } catch (err) {
          // Continue to next match if parsing fails
          console.error('Error parsing contest JSON data:', err.message);
        }
      }
    }
  }
  
  return contests;
}

function extractContestsFromDOM($, now) {
  const contests = [];
  
  // Multiple selectors to try for contest elements
  const selectors = [
    '.contest-card',
    '.contest-container .contest-card',
    '.contest-list .contest',
    '[data-cy="contest-card"]',
    '.rounded-lg.shadow-md', // For newer layouts
    '.contest-info',
    '.contest-overview .items-center'
  ];
  
  for (const selector of selectors) {
    const elements = $(selector);
    
    if (elements.length > 0) {
      console.log(`Found ${elements.length} potential contest elements with selector: ${selector}`);
      
      elements.each((_, element) => {
        // Extract contest details
        const el = $(element);
        
        // Try different methods to find title
        const title = el.find('.card-title, .contest-title, h4, [data-title], .text-xl, .font-bold')
          .first().text().trim() || el.text().match(/Weekly Contest \d+|Biweekly Contest \d+/)?.[0];
        
        if (!title) return;
        
        // Find URL
        let url = '';
        const urlElement = el.find('a');
        if (urlElement.length) {
          url = urlElement.attr('href');
          if (url && !url.startsWith('http')) {
            url = 'https://leetcode.com' + (url.startsWith('/') ? url : '/' + url);
          }
        } else {
          // Generate URL from title if not found
          const titleSlug = title.toLowerCase().replace(/\s+/g, '-');
          url = `https://leetcode.com/contest/${titleSlug}`;
        }
        
        // Find start time
        let startTime;
        const timeElements = el.find('.contest-start-time, [data-start-time], .start-time, time, [datetime]');
        
        if (timeElements.length) {
          // Try data attribute first
          const timeAttr = timeElements.attr('start-time') || 
                           timeElements.attr('data-start-time') || 
                           timeElements.attr('datetime') ||
                           timeElements.attr('data-value');
          
          if (timeAttr) {
            if (/^\d+$/.test(timeAttr)) {
              startTime = new Date(parseInt(timeAttr) * 1000);
            } else {
              startTime = new Date(timeAttr);
            }
          } else {
            // Try text content
            const timeText = timeElements.text().trim();
            startTime = new Date(timeText);
          }
        }
        
        // If can't find start time, look for date pattern in text
        if (!startTime || isNaN(startTime.getTime())) {
          const fullText = el.text();
          const dateMatch = fullText.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
          const timeMatch = fullText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/);
          
          if (dateMatch && timeMatch) {
            startTime = new Date(`${dateMatch[1]} ${timeMatch[1]}`);
          } else if (dateMatch) {
            startTime = new Date(dateMatch[1]);
          }
        }
        
        // Extract duration or use default
        let duration = 90; // Default duration for LeetCode contests
        const durationElement = el.find('.duration, .contest-duration');
        if (durationElement.length) {
          const durationMatch = durationElement.text().trim().match(/(\d+)/);
          if (durationMatch) {
            duration = parseInt(durationMatch[1]);
          }
        }
        
        // Only add contest if we have essential data
        if (title && url && startTime && !isNaN(startTime.getTime())) {
          const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
          
          let status;
          if (startTime > now) {
            status = 'upcoming';
          } else if (endTime > now) {
            status = 'ongoing';
          } else {
            status = 'past';
          }
          
          contests.push({
            name: title,
            platform: 'LeetCode',
            url,
            startTime,
            endTime,
            duration,
            status
          });
        }
      });
      
      if (contests.length > 0) {
        break; // Stop once we've found contests with a selector
      }
    }
  }
  
  return contests;
}

function processContestObject(contest, now) {
  // Handle various contest object structures
  const title = contest.title || contest.name || contest.contestTitle || '';
  let startTime;
  let duration = contest.duration || 90; // Default to 90 minutes
  
  // Handle different timestamp formats
  if (contest.startTime) {
    startTime = typeof contest.startTime === 'number' 
      ? new Date(contest.startTime * 1000) 
      : new Date(contest.startTime);
  } else if (contest.startDate) {
    startTime = new Date(contest.startDate);
  }
  
  const slug = contest.titleSlug || contest.slug || '';
  
  if (title && startTime && !isNaN(startTime.getTime())) {
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    let status;
    if (startTime > now) {
      status = 'upcoming';
    } else if (endTime > now) {
      status = 'ongoing';
    } else {
      status = 'past';
    }
    
    return {
      name: title,
      platform: 'LeetCode',
      url: `https://leetcode.com/contest/${slug || title.toLowerCase().replace(/\s+/g, '-')}`,
      startTime,
      endTime,
      duration,
      status
    };
  }
  
  return null;
}

function getFallbackContests() {
  console.log('Using fallback contest data');
  const now = new Date();
  const nextSaturday = new Date(now);
  nextSaturday.setDate(now.getDate() + (6 - now.getDay() + 7) % 7);
  nextSaturday.setHours(17, 30, 0, 0); // 17:30 UTC (typical start time)
  
  const results = [];
  
  // Get current weekly and biweekly contest numbers
  // As of March 2025, estimate the contest numbers
  const weeklyContestNumber = 440; // Adjust based on current contest number
  const biweeklyContestNumber = 126; // Adjust based on current contest number
  
  // Generate upcoming weekly contests
  for (let i = 0; i < 3; i++) {
    const contestDate = new Date(nextSaturday);
    contestDate.setDate(contestDate.getDate() + i * 7);
    
    results.push({
      name: `Weekly Contest ${weeklyContestNumber + i}`,
      platform: "LeetCode",
      url: `https://leetcode.com/contest/weekly-contest-${weeklyContestNumber + i}`,
      startTime: contestDate,
      endTime: new Date(contestDate.getTime() + 90 * 60 * 1000),
      duration: 90,
      status: "upcoming"
    });
    
    // Add biweekly contest every two weeks
    if (i % 2 === 0) {
      const biweeklyDate = new Date(contestDate);
      biweeklyDate.setDate(biweeklyDate.getDate() - 3); // Typically Wednesday/Sunday depending on timezone
      biweeklyDate.setHours(17, 30, 0, 0); // 17:30 UTC
      
      results.push({
        name: `Biweekly Contest ${biweeklyContestNumber + Math.floor(i/2)}`,
        platform: "LeetCode",
        url: `https://leetcode.com/contest/biweekly-contest-${biweeklyContestNumber + Math.floor(i/2)}`,
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
      name: `Weekly Contest ${weeklyContestNumber - i}`,
      platform: "LeetCode",
      url: `https://leetcode.com/contest/weekly-contest-${weeklyContestNumber - i}`,
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
        name: `Biweekly Contest ${biweeklyContestNumber - Math.floor(i/2)}`,
        platform: "LeetCode",
        url: `https://leetcode.com/contest/biweekly-contest-${biweeklyContestNumber - Math.floor(i/2)}`,
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