import requests
from datetime import datetime, timedelta
import json
import os
from typing import List, Dict, Optional
import pycountry
from unidecode import unidecode
from dotenv import load_dotenv
from pathlib import Path
import hashlib

class TechPolicyAnalyzer:
    def __init__(self, country: str):
        """
        Initialize the analyzer for any country with fallback to regional sources.
        
        Args:
            country: Any country name in English
        """
        # Load environment variables
        load_dotenv()
        self.api_key = os.environ.get('NEWS_API_KEY')
        if not self.api_key:
            raise ValueError("NEWS_API_KEY not found in environment variables")
        self.base_url = 'https://newsapi.org/v2/everything'
        self.headers = {
            'X-Api-Key': self.api_key
        }
        
        try:
            country_obj = None
            country_normalized = unidecode(country).lower().strip()
            stop_words = {'the', 'of', 'and', 'a'}

            # 1. Exact match against name or common_name
            for c in pycountry.countries:
                if country_normalized == unidecode(c.name).lower():
                    country_obj = c
                    break
                if hasattr(c, 'common_name') and country_normalized == unidecode(c.common_name).lower():
                    country_obj = c
                    break

            # 2. pycountry fuzzy search
            if not country_obj:
                try:
                    results = pycountry.countries.search_fuzzy(country)
                    country_obj = results[0] if results else None
                except LookupError:
                    pass

            # 3. Word-intersection match for reordered names
            #    e.g. "Democratic Republic of Congo" → "Congo, The Democratic Republic of the"
            if not country_obj:
                search_words = set(country_normalized.split()) - stop_words
                best, best_score = None, 0
                for c in pycountry.countries:
                    name_words = set(unidecode(c.name).lower().replace(',', '').split()) - stop_words
                    if not name_words:
                        continue
                    overlap = len(search_words & name_words)
                    # Only accept if all search words are covered and it's a better match
                    if search_words.issubset(name_words) and overlap > best_score:
                        best, best_score = c, overlap
                country_obj = best

            if not country_obj:
                raise ValueError(f"Country '{country}' not found")

            self.country = country_obj.name
            self.country_alpha2 = country_obj.alpha_2.lower()

        except ValueError:
            raise
        except Exception:
            raise ValueError(f"Invalid country name: {country}")
        
        self.policy_keywords = {
            'AI Regulation': ['AI regulation', 'artificial intelligence law', 'AI governance', 
                            'AI policy', 'AI ethics', 'AI legislation', 'machine learning regulation'],
            'Data Privacy': ['tech privacy law', 'digital privacy regulation', 'data protection tech', 
                           'tech data governance', 'privacy technology'],
            'Cybersecurity': ['cybersecurity law', 'cyber regulation', 'tech security policy',
                            'cyber defense policy', 'information security regulation'],
            'Digital Markets': ['tech antitrust', 'digital competition law', 'tech monopoly',
                              'platform regulation', 'tech market regulation'],
            'Tech Content Moderation': ['online content law', 'digital content regulation', 
                                     'social media law', 'platform content rules', 'tech censorship'],
            'Digital Infrastructure': ['tech infrastructure policy', 'digital infrastructure law', 
                                    'internet regulation', '5G policy', 'broadband regulation'],
            'Digital Innovation': ['technology innovation policy', 'digital transformation law',
                                'tech startup regulation', 'innovation framework', 'tech development policy']
        }
        
        # Add cache directory setup
        self.cache_dir = Path('.news_cache')
        self.cache_dir.mkdir(exist_ok=True)

    def _get_cache_key(self, query: str, from_date: str) -> str:
        """Generate a unique cache key for the query"""
        cache_string = f"{query}_{from_date}"
        return hashlib.md5(cache_string.encode()).hexdigest()
    
    def _get_cached_response(self, cache_key: str) -> Optional[Dict]:
        """Retrieve cached response if it exists and is not expired"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        if cache_file.exists():
            with open(cache_file, 'r') as f:
                cached_data = json.load(f)
                # Check if cache is less than 6 hours old
                cache_time = datetime.fromisoformat(cached_data['cache_time'])
                if datetime.now() - cache_time < timedelta(hours=6):
                    return cached_data['response']
        return None
    
    def _save_to_cache(self, cache_key: str, response: Dict):
        """Save API response to cache"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        cache_data = {
            'cache_time': datetime.now().isoformat(),
            'response': response
        }
        with open(cache_file, 'w') as f:
            json.dump(cache_data, f)

    def fetch_news(self, days_back: int = 15, include_regional: bool = True) -> Dict[str, List[Dict]]:
        """
        Fetch tech policy news with fallback to regional sources.
        
        Args:
            days_back: Number of days of news to fetch
            include_regional: Whether to include regional sources if no national news found
            
        Returns:
            Dictionary with 'national' and 'regional' news articles
        """
        from_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')
        national_articles = []
        regional_articles = []
        
        # Make country terms more strict and explicit
        country_terms = [
            f'"{self.country}"', # Exact match with quotes
            f'"{self.country} government"',
            f'"{self.country} parliament"',
            f'"{self.country} federal"'
        ]
        
        # Fetch national news
        for category, keywords in self.policy_keywords.items():
            for keyword in keywords:
                try:
                    # Search for national policy news
                    query = f'({keyword}) AND ({" OR ".join(country_terms)})'
                    
                    # Check cache first
                    cache_key = self._get_cache_key(query, from_date)
                    cached_response = self._get_cached_response(cache_key)
                    
                    if cached_response:
                        articles = cached_response.get('articles', [])
                    else:
                        params = {
                            'q': query,
                            'from': from_date,
                            'sortBy': 'publishedAt',
                            'language': 'en',
                        }
                        
                        response = requests.get(self.base_url, params=params, headers=self.headers)
                        response.raise_for_status()
                        response_data = response.json()
                        
                        # Save to cache
                        self._save_to_cache(cache_key, response_data)
                        articles = response_data.get('articles', [])
                    
                    def is_important_policy(article):
                        """Filter for important policy decisions"""
                        important_indicators = [
                            'law', 'legislation', 'regulation', 'bill', 'act', 
                            'passed', 'approved', 'enacted', 'announced', 'mandated',
                            'policy framework', 'regulatory framework'
                        ]
                        
                        # Safely handle None values by using empty string as default
                        title = article.get('title', '') or ''
                        description = article.get('description', '') or ''
                        text = (title + ' ' + description).lower()
                        return any(indicator in text for indicator in important_indicators)
                    
                    for article in articles:
                        if is_important_policy(article):
                            pub_date = datetime.strptime(article.get('publishedAt', '')[:19], 
                                                       '%Y-%m-%dT%H:%M:%S')
                            
                            processed_article = {
                                'title': article.get('title'),
                                'date': pub_date,
                                'source': article.get('source', {}).get('name'),
                                'url': article.get('url'),
                                'summary': article.get('description'),
                                'category': category
                            }
                            national_articles.append(processed_article)
                        
                    # If no national news and regional news requested, search regional sources
                    if include_regional and not national_articles:
                        # Get region information
                        region_terms = self._get_region_terms()
                        
                        if region_terms:
                            query = f'({keyword}) AND ({" OR ".join(region_terms)})'
                            cache_key = self._get_cache_key(query, from_date)
                            cached_response = self._get_cached_response(cache_key)
                            
                            if cached_response:
                                articles = cached_response.get('articles', [])
                            else:
                                params['q'] = query
                                response = requests.get(self.base_url, params=params, headers=self.headers)
                                response.raise_for_status()
                                response_data = response.json()
                                
                                # Save to cache
                                self._save_to_cache(cache_key, response_data)
                                articles = response_data.get('articles', [])
                            
                            for article in articles:
                                pub_date = datetime.strptime(article.get('publishedAt', '')[:19],
                                                           '%Y-%m-%dT%H:%M:%S')
                                
                                processed_article = {
                                    'title': article.get('title'),
                                    'date': pub_date,
                                    'source': article.get('source', {}).get('name'),
                                    'url': article.get('url'),
                                    'summary': article.get('description'),
                                    'category': category,
                                    'regional': True
                                }
                                regional_articles.append(processed_article)
                        
                except requests.exceptions.RequestException as e:
                    print(f"Error fetching news for {keyword}: {str(e)}")
                    continue
        
        # Remove duplicates and sort by date
        national_articles = self._deduplicate_articles(national_articles)
        regional_articles = self._deduplicate_articles(regional_articles)
        
        return {
            'national': sorted(national_articles, key=lambda x: x['date'], reverse=True),
            'regional': sorted(regional_articles, key=lambda x: x['date'], reverse=True)
        }

    def _deduplicate_articles(self, articles: List[Dict]) -> List[Dict]:
        """Remove duplicate articles based on URL"""
        seen_urls = set()
        unique_articles = []
        
        for article in articles:
            if article['url'] not in seen_urls:
                seen_urls.add(article['url'])
                unique_articles.append(article)
                
        return unique_articles

    def _get_region_terms(self) -> List[str]:
        """Get search terms for the country's region"""
        # Define regions and their countries
        regions = {
            'Southeast Asia': ['ASEAN', 'Southeast Asia'],
            'European Union': ['European Union', 'EU regulation'],
            'Africa': ['African Union', 'ECOWAS', 'SADC'],
            'South America': ['MERCOSUR', 'UNASUR'],
            'Middle East': ['GCC', 'Middle East'],
            'Pacific': ['Pacific Islands', 'APEC']
        }
        
        # Map countries to their regions (simplified example)
        country_to_region = {
            # Add mappings based on your needs
            'GB': 'European Union',
            'FR': 'European Union',
            'VN': 'Southeast Asia',
            'ID': 'Southeast Asia',
            'NG': 'Africa',
            'BR': 'South America',
            'SA': 'Middle East',
            'AU': 'Pacific'
        }
        
        region = country_to_region.get(self.country_alpha2.upper())
        return regions.get(region, [])


    def fetch_top_headlines(self) -> List[Dict]:
        """Fetch top 10 tech policy headlines for the country"""
        cache_key = self._get_cache_key(f"top_headlines_{self.country}", datetime.now().strftime('%Y-%m-%d'))
        cached_response = self._get_cached_response(cache_key)

        if cached_response:
            return cached_response.get('articles', [])[:10]

        params = {
            'country': self.country_alpha2,
            'category': 'technology',
            'pageSize': 10
        }

        try:
            response = requests.get(
                'https://newsapi.org/v2/top-headlines',
                params=params,
                headers=self.headers
            )
            response.raise_for_status()
            response_data = response.json()
            
            # Save to cache
            self._save_to_cache(cache_key, response_data)
            
            return response_data.get('articles', [])
        
        except requests.exceptions.RequestException as e:
            print(f"Error fetching top headlines: {str(e)}")
            return []

    def generate_summary(self) -> str:
        """Generate a summary of top tech policy headlines"""
        articles = self.fetch_top_headlines()
        
        if not articles:
            return "No major tech policy updates found for this period."

        current_date = datetime.now()
        
        summary = f"""Important Tech Policy Decisions - {self.country.title()}
Period: {(current_date - timedelta(days=1)).strftime('%B %d, %Y')} to {current_date.strftime('%B %d, %Y')}
Generated on: {current_date.strftime('%B %d, %Y at %I:%M %p')}

MAJOR POLICY UPDATES
==================

"""
        # Add each article to the summary
        for i, article in enumerate(articles, 1):
            title = article.get('title', '').strip()
            description = article.get('description', '').strip()
            source = article.get('source', {}).get('name', 'Unknown Source')
            published_at = article.get('publishedAt', '')
            
            if published_at:
                try:
                    date = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
                    published_at = date.strftime('%B %d, %Y')
                except ValueError:
                    published_at = 'Date unknown'

            if title:
                summary += f"\n{i}. {title}\n"
                if description:
                    summary += f"   {description}\n"
                summary += f"   Source: {source} | Published: {published_at}\n"

        return summary

