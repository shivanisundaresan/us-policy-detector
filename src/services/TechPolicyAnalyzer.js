class TechPolicyAnalyzer {
    constructor(country) {
        this.country = country;
    }

    async generateReport() {
        try {
            console.log(`Fetching policy info for: ${this.country}`, 'Request Initiated');
            const apiUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/policy-info?country=${encodeURIComponent(this.country)}`;

            const response = await fetch(apiUrl);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`API Error ${response.status}`, {
                    status: response.status,
                    body: errorBody
                });
                throw new Error(`Server responded with ${response.status}: ${errorBody.slice(0, 100)}`);
            }

            const rawData = await response.text();

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
