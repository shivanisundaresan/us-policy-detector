from flask import Flask, request, jsonify
import os
import json
import re
from datetime import datetime, timedelta
import requests
from flask_cors import CORS
import google.generativeai as genai
from news import TechPolicyAnalyzer

app = Flask(__name__)
allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, resources={r"/*": {"origins": allowed_origins}})

NEWS_API_KEY = os.environ.get('NEWS_API_KEY')
BASE_URL = 'https://newsapi.org/v2/everything'

# In-memory cache
cache = {}

@app.route('/news', methods=['GET'])
def get_news():
    country = request.args.get('country')

    if not country:
        return jsonify({"error": "Country parameter is required"}), 400

    two_weeks_ago = datetime.now() - timedelta(days=14)
    formatted_date = two_weeks_ago.strftime('%Y-%m-%d')

    cache_key = f"news-{country}-{formatted_date}"

    # Check if the data is in the cache and not expired
    if cache_key in cache and cache[cache_key]['expiry'] > datetime.now().timestamp():
        return jsonify(cache[cache_key]['data'])

    try:
        # Fetch news data from News API
        response = requests.get(
            f"{BASE_URL}?q={country}+AND+(technology+OR+tech)+AND+policy&from={formatted_date}&sortBy=relevancy&language=en&apiKey={NEWS_API_KEY}"
        )

        response.raise_for_status()
        data = response.json()

        # Cache the response with a TTL (e.g., 1 hour)
        ttl = 3600  # 1 hour in seconds
        cache[cache_key] = {
            'data': data,
            'expiry': datetime.now().timestamp() + ttl
        }

        return jsonify(data)
    except requests.RequestException as error:
        app.logger.error(f"Error fetching news: {str(error)}")
        return jsonify({"error": "Failed to fetch news"}), 500

def normalize_article(a):
    """Map raw NewsAPI fields to the shape the frontend expects."""
    return {
        "title": a.get("title"),
        "url": a.get("url"),
        "source": a.get("source", {}).get("name") if isinstance(a.get("source"), dict) else a.get("source"),
        "summary": a.get("description"),
        "date": a.get("publishedAt", "")[:10],
        "category": "Tech Policy"
    }


def generate_ai_summary(country, articles):
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key or not articles:
        return {"summary": None, "top3": [normalize_article(a) for a in articles[:3]]}

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')

    numbered = "\n\n".join([
        f"[{i}] Title: {a.get('title', 'N/A')}\nDescription: {a.get('description', 'N/A')}\nSource: {a.get('source', {}).get('name', 'N/A')}\nDate: {a.get('publishedAt', 'N/A')[:10]}"
        for i, a in enumerate(articles[:20])
    ])

    prompt = f"""You are a tech policy analyst. Your job is to identify genuine tech policy news for {country} — government actions, legislation, regulations, court rulings, or official policy decisions affecting technology, AI, data, or digital markets.

IGNORE articles about: product launches, gadget reviews, earnings reports, general business news, entertainment, or anything not directly involving a government or regulatory body.

For each article below, score it 0-10 where:
- 8-10: Confirmed government/regulatory action (law passed, fine issued, bill introduced, official framework announced)
- 4-7: Policy discussion, proposed regulation, or government statement with real implications
- 0-3: Not a policy article — product news, opinion, or unrelated content

Return a JSON object with exactly these two keys:
- "summary": a 2-3 sentence overview of the most significant tech policy developments in {country}. If there are no real policy articles, say so honestly.
- "top3": array of objects for the 3 highest-scoring articles, each with "index" (int) and "score" (int). Only include articles scoring 4 or above. Return fewer than 3 if not enough qualify. e.g. [{{"index": 4, "score": 9}}, {{"index": 11, "score": 7}}]

Return only valid JSON, no markdown.

Articles:
{numbered}"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Strip ```json ... ``` or ``` ... ``` fences if present
        fence = re.match(r'^```(?:json)?\s*(.*?)\s*```$', text, re.DOTALL)
        if fence:
            text = fence.group(1)
        result = json.loads(text)

        top3_articles = []
        for entry in result.get("top3", []):
            i = entry.get("index")
            score = entry.get("score")
            if isinstance(i, int) and i < len(articles):
                article = normalize_article(articles[i])
                article["score"] = score
                top3_articles.append(article)
        return {"summary": result.get("summary"), "top3": top3_articles}
    except Exception as e:
        app.logger.error(f"AI summary failed: {str(e)}")
        return {"summary": None, "top3": [normalize_article(a) for a in articles[:3]]}


def fetch_articles(country_name, country_code):
    """Two targeted policy-specific queries — no general tech headlines."""
    api_key = os.environ.get('NEWS_API_KEY')
    headers = {'X-Api-Key': api_key}
    from_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    articles = []

    queries = [
        # Specific tech policy actions: laws, fines, bans, frameworks
        f'"{country_name}" AND ("AI regulation" OR "data privacy law" OR "cybersecurity law" OR "tech legislation" OR "digital regulation" OR "antitrust" OR "platform regulation" OR "data protection")',
        # Government/official actions on technology
        f'"{country_name}" AND (government OR parliament OR ministry OR regulator) AND (technology OR AI OR data OR internet OR digital) AND (bill OR law OR ban OR fine OR policy OR framework OR ruling)',
    ]

    for q in queries:
        try:
            r = requests.get('https://newsapi.org/v2/everything', params={
                'q': q,
                'from': from_date,
                'sortBy': 'relevancy',
                'language': 'en',
                'pageSize': 20
            }, headers=headers, timeout=10)
            if r.ok:
                articles += r.json().get('articles', [])
        except Exception as e:
            app.logger.warning(f"News fetch failed for query: {e}")

    if not articles:
        raise RuntimeError("rate_limited")

    # Deduplicate by URL
    seen, unique = set(), []
    for a in articles:
        url = a.get('url')
        if url and url not in seen:
            seen.add(url)
            unique.append(a)

    return unique


@app.route('/api/policy-info', methods=['GET'])
def get_policy_info():
    country = request.args.get('country')

    if not country:
        return jsonify({"error": "Country parameter is required"}), 400

    try:
        # Use TechPolicyAnalyzer only for country name/code resolution
        analyzer = TechPolicyAnalyzer(country)
        articles = fetch_articles(analyzer.country, analyzer.country_alpha2)

        ai = generate_ai_summary(analyzer.country, articles)
        return jsonify({
            "summary": ai.get('summary'),
            "top3": ai.get('top3', [])
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except RuntimeError as e:
        if str(e) == "rate_limited":
            return jsonify({"error": "News API rate limit reached. Free accounts allow 100 requests per day — please try again later."}), 429
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        app.logger.error(f"Error analyzing policy: {str(e)}")
        return jsonify({"error": "Failed to analyze policy"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=False, host='0.0.0.0', port=port)
