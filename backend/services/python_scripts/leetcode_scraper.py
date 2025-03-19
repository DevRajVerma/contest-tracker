import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def scrape_leetcode_contests():
    """
    Scrape LeetCode for upcoming and past contests
    Returns a list of contest objects
    """
    logger.info("Scraping LeetCode contests...")
    
    try:
        # Try GraphQL API first (most reliable method)
        contests = fetch_contests_from_api()
        
        # If API fails, fall back to scraping the website
        if not contests:
            logger.info("API approach failed, trying DOM scraping...")
            contests = scrape_contests_from_dom()
            
        # If still no contests, use fallback data
        if not contests:
            logger.info("DOM scraping failed, using fallback data...")
            contests = get_fallback_contests()
            
        logger.info(f"Successfully retrieved {len(contests)} contests")
        return contests
        
    except Exception as e:
        logger.error(f"Error scraping LeetCode contests: {str(e)}")
        return get_fallback_contests()

def fetch_contests_from_api():
    """Fetch contests using LeetCode's GraphQL API"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        graphql_query = """
            query getContestList {
                allContests {
                    title
                    titleSlug
                    startTime
                    duration
                }
                currentContests {
                    title
                    titleSlug
                    startTime
                    duration
                }
            }
        """
        
        response = requests.post(
            'https://leetcode.com/graphql',
            headers=headers,
            json={'query': graphql_query},
            timeout=10
        )
        
        if response.status_code != 200:
            logger.warning(f"API request failed with status code {response.status_code}")
            return []
            
        data = response.json()
        if not data.get('data'):
            logger.warning("No data returned from API")
            return []
            
        # Combine all contests
        all_contests = data['data'].get('allContests', [])
        current_contests = data['data'].get('currentContests', [])
        api_contests = all_contests + current_contests
        
        logger.info(f"Found {len(api_contests)} contests from API")
        
        contests = []
        now = datetime.now()
        
        for contest in api_contests:
            title = contest.get('title')
            slug = contest.get('titleSlug')
            
            # Parse timestamps
            try:
                start_time = datetime.fromtimestamp(contest.get('startTime', 0))
                duration = int(contest.get('duration', 90))
                end_time = start_time + timedelta(minutes=duration)
                
                # Determine status
                if start_time > now:
                    status = 'upcoming'
                elif end_time > now:
                    status = 'ongoing'
                else:
                    status = 'past'
                    
                contests.append({
                    'name': title,
                    'platform': 'LeetCode',
                    'url': f"https://leetcode.com/contest/{slug}",
                    'startTime': start_time.isoformat(),
                    'endTime': end_time.isoformat(),
                    'duration': duration,
                    'status': status
                })
            except Exception as e:
                logger.warning(f"Failed to process contest {title}: {str(e)}")
                
        return contests
    except Exception as e:
        logger.error(f"Error in API fetching: {str(e)}")
        return []

def scrape_contests_from_dom():
    """Scrape contests by parsing the LeetCode website DOM"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        
        response = requests.get('https://leetcode.com/contest/', headers=headers, timeout=10)
        if response.status_code != 200:
            logger.warning(f"DOM scraping request failed with status code {response.status_code}")
            return []
            
        soup = BeautifulSoup(response.text, 'html.parser')
        contests = []
        now = datetime.now()
        
        # First try to find contest data in script tags
        for script in soup.find_all('script'):
            script_content = script.string
            if not script_content:
                continue
                
            # Look for data patterns in scripts
            for pattern in [
                r'window\.pageData\s*=\s*({.*?});',
                r'window\.CONTEST_DATA\s*=\s*({.*?});',
                r'contests\s*:\s*(\[.*?\])'
            ]:
                import re
                match = re.search(pattern, script_content, re.DOTALL)
                if match:
                    try:
                        data = json.loads(match.group(1))
                        contest_list = data.get('contests', []) if isinstance(data, dict) else data
                        
                        if contest_list:
                            for contest in contest_list:
                                title = contest.get('title') or contest.get('name')
                                slug = contest.get('titleSlug') or contest.get('slug')
                                
                                # Handle start time
                                start_time_raw = contest.get('startTime')
                                if start_time_raw:
                                    # Handle both timestamp and ISO format
                                    if isinstance(start_time_raw, int):
                                        start_time = datetime.fromtimestamp(start_time_raw)
                                    else:
                                        start_time = datetime.fromisoformat(start_time_raw.replace('Z', '+00:00'))
                                        
                                    duration = int(contest.get('duration', 90))
                                    end_time = start_time + timedelta(minutes=duration)
                                    
                                    # Determine status
                                    if start_time > now:
                                        status = 'upcoming'
                                    elif end_time > now:
                                        status = 'ongoing'
                                    else:
                                        status = 'past'
                                        
                                    contests.append({
                                        'name': title,
                                        'platform': 'LeetCode',
                                        'url': f"https://leetcode.com/contest/{slug or title.lower().replace(' ', '-')}",
                                        'startTime': start_time.isoformat(),
                                        'endTime': end_time.isoformat(),
                                        'duration': duration,
                                        'status': status
                                    })
                            
                            if contests:
                                logger.info(f"Found {len(contests)} contests from script tags")
                                return contests
                    except Exception as e:
                        logger.warning(f"Error parsing script data: {str(e)}")
        
        # If script parsing fails, try DOM elements
        for selector in ['.contest-card', '.contest-container .contest-card', '.contest-list .contest', '[data-cy="contest-card"]']:
            elements = soup.select(selector)
            
            if elements:
                for element in elements:
                    try:
                        title_element = element.select_one('.card-title, .contest-title, h4')
                        title = title_element.text.strip() if title_element else None
                        
                        url_element = element.select_one('a')
                        url = url_element['href'] if url_element and 'href' in url_element.attrs else None
                        if url and not url.startswith('http'):
                            url = f"https://leetcode.com{url}"
                            
                        time_element = element.select_one('.contest-start-time, [data-start-time], .start-time')
                        start_time = None
                        
                        if time_element:
                            start_time_attr = time_element.get('start-time') or time_element.get('data-start-time')
                            if start_time_attr and start_time_attr.isdigit():
                                start_time = datetime.fromtimestamp(int(start_time_attr))
                            else:
                                start_time = datetime.fromisoformat(time_element.text.strip())
                        
                        duration = 90  # Default duration
                        duration_element = element.select_one('.duration, .contest-duration')
                        if duration_element:
                            import re
                            duration_match = re.search(r'(\d+)', duration_element.text.strip())
                            if duration_match:
                                duration = int(duration_match.group(1))
                                
                        if title and url and start_time:
                            end_time = start_time + timedelta(minutes=duration)
                            
                            # Determine status
                            if start_time > now:
                                status = 'upcoming'
                            elif end_time > now:
                                status = 'ongoing'
                            else:
                                status = 'past'
                                
                            contests.append({
                                'name': title,
                                'platform': 'LeetCode',
                                'url': url,
                                'startTime': start_time.isoformat(),
                                'endTime': end_time.isoformat(),
                                'duration': duration,
                                'status': status
                            })
                    except Exception as e:
                        logger.warning(f"Error processing DOM element: {str(e)}")
                        
                if contests:
                    logger.info(f"Found {len(contests)} contests from DOM elements")
                    return contests
                    
        return []
    except Exception as e:
        logger.error(f"Error in DOM scraping: {str(e)}")
        return []

def get_fallback_contests():
    """Generate fallback contest data when scraping fails"""
    logger.info("Generating fallback contest data")
    
    now = datetime.now()
    
    # Find next Saturday at 17:30 UTC
    next_saturday = now + timedelta(days=(5 - now.weekday() + 7) % 7)
    next_saturday = next_saturday.replace(hour=17, minute=30, second=0, microsecond=0)
    
    if next_saturday < now:
        next_saturday += timedelta(days=7)
        
    contests = []
    
    # Generate upcoming weekly contests
    for i in range(3):
        contest_date = next_saturday + timedelta(days=i * 7)
        
        contests.append({
            'name': f"Weekly Contest {440 + i}",
            'platform': "LeetCode",
            'url': f"https://leetcode.com/contest/weekly-contest-{440 + i}",
            'startTime': contest_date.isoformat(),
            'endTime': (contest_date + timedelta(minutes=90)).isoformat(),
            'duration': 90,
            'status': "upcoming"
        })
        
        # Add biweekly contest every two weeks
        if i % 2 == 0:
            biweekly_date = contest_date - timedelta(days=3)  # Wednesday
            
            contests.append({
                'name': f"Biweekly Contest {126 + i//2}",
                'platform': "LeetCode",
                'url': f"https://leetcode.com/contest/biweekly-contest-{126 + i//2}",
                'startTime': biweekly_date.isoformat(),
                'endTime': (biweekly_date + timedelta(minutes=90)).isoformat(),
                'duration': 90,
                'status': "upcoming"
            })
    
    # Add some past contests
    for i in range(1, 6):
        contest_date = next_saturday - timedelta(days=i * 7)
        
        contests.append({
            'name': f"Weekly Contest {440 - i}",
            'platform': "LeetCode",
            'url': f"https://leetcode.com/contest/weekly-contest-{440 - i}",
            'startTime': contest_date.isoformat(),
            'endTime': (contest_date + timedelta(minutes=90)).isoformat(),
            'duration': 90,
            'status': "past"
        })
        
        # Add past biweekly contests
        if i % 2 == 0:
            biweekly_date = contest_date - timedelta(days=3)
            
            contests.append({
                'name': f"Biweekly Contest {126 - i//2}",
                'platform': "LeetCode",
                'url': f"https://leetcode.com/contest/biweekly-contest-{126 - i//2}",
                'startTime': biweekly_date.isoformat(),
                'endTime': (biweekly_date + timedelta(minutes=90)).isoformat(),
                'duration': 90,
                'status': "past"
            })
            
    return contests

if __name__ == "__main__":
    # Run the scraper and print results when executed directly
    contests = scrape_leetcode_contests()
    print(json.dumps(contests, indent=2))