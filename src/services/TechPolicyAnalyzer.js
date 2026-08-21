import axios from 'axios';

class TechPolicyAnalyzer {
    constructor(apiKey, country) {
        this.apiKey = apiKey;
        this.country = country;
        this.baseUrl = 'https://newsapi.org/v2/top-headlines';
        this.axiosInstance = axios.create({
            headers: {
                'X-Api-Key': this.apiKey
            }
        });
    }

    async fetchTopHeadlines() {
        try {
            const params = {
                country: this.country.toLowerCase(),
                category: 'technology',
                pageSize: 10
            };

            const response = await this.axiosInstance.get(this.baseUrl, { params });
            return response.data.articles || [];
        } catch (error) {
            console.error("Error fetching headlines:", error);
            throw error;
        }
    }

    async generateReport() {
        try {
            console.log(`Fetching policy info for: ${this.country}`, 'Request Initiated');
            const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/policy-info?country=${encodeURIComponent(this.country)}`;
            
            const response = await fetch(apiUrl);
            console.debug('Raw Response:', response);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`API Error ${response.status}`, {
                    status: response.status,
                    headers: [...response.headers.entries()],
                    body: errorBody
                });
                throw new Error(`Server responded with ${response.status}: ${errorBody.slice(0, 100)}`);
            }

            const rawData = await response.text();
            console.debug('Raw API Response:', rawData);
            
            if (!rawData.trim()) {
                throw new Error('Empty response from server');
            }

            return JSON.parse(rawData);

        } catch (error) {
            console.error('Full Error Details:', {
                errorName: error.name,
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            throw new Error(`Policy analysis failed: ${error.message}`);
        }
    }
}

export default TechPolicyAnalyzer; 