import { LogEntry } from '../types';

/**
 * Mock log data for demo mode
 * Showcases various AI services, risk levels, and data sources
 */
export const generateMockLogs = (): LogEntry[] => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  const services = [
    { name: 'openai', endpoints: ['/v1/chat/completions', '/v1/completions', '/v1/embeddings'] },
    { name: 'anthropic', endpoints: ['/v1/messages', '/v1/complete'] },
    { name: 'bedrock', endpoints: ['/model/anthropic.claude-v2/invoke', '/model/amazon.titan-text/invoke'] }
  ];

  const dataSources = [
    ['postgresql://prod-db', 'redis://cache'],
    ['s3://customer-data', 'dynamodb://user-profiles'],
    ['mysql://analytics', 'elasticsearch://logs'],
    ['mongodb://sessions', 'file:///var/data/users.csv'],
    ['api://internal/users', 'api://external/crm'],
    ['file:///etc/config/secrets.json'],
    ['postgresql://prod-db', 's3://documents'],
    ['api://stripe/customers', 'redis://sessions']
  ];

  const sensitiveDataTypes = [
    ['email', 'phone_number'],
    ['api_key', 'password'],
    ['ssn', 'credit_card'],
    ['email', 'address'],
    ['api_key', 'oauth_token'],
    ['email', 'ip_address'],
    ['password', 'session_token'],
    ['credit_card', 'cvv'],
    ['ssn', 'date_of_birth'],
    ['api_key'],
    ['email'],
    ['phone_number', 'address']
  ];

  const mockLogs: LogEntry[] = [];

  // Generate 18 log entries with varied characteristics
  for (let i = 0; i < 18; i++) {
    const service = services[i % services.length];
    const endpoint = service.endpoints[Math.floor(Math.random() * service.endpoints.length)];
    
    // Create a distribution of risk scores: some low, some medium, some high
    let riskScore: number;
    if (i < 6) {
      riskScore = Math.floor(Math.random() * 30) + 10; // Low: 10-39
    } else if (i < 13) {
      riskScore = Math.floor(Math.random() * 30) + 40; // Medium: 40-69
    } else {
      riskScore = Math.floor(Math.random() * 30) + 70; // High: 70-99
    }

    const dataSourceSet = dataSources[i % dataSources.length];
    const sensitiveTypes = sensitiveDataTypes[i % sensitiveDataTypes.length];
    
    // Spread timestamps over last 24 hours
    const hoursAgo = Math.floor((i / 18) * 24);
    const timestamp = now - (hoursAgo * oneHour) - Math.floor(Math.random() * oneHour);

    mockLogs.push({
      log_id: `demo-log-${String(i + 1).padStart(3, '0')}`,
      customer_id: 'demo-customer',
      timestamp,
      ai_service: service.name,
      endpoint,
      data_sources: dataSourceSet,
      sensitive_data_types: sensitiveTypes,
      risk_score: riskScore,
      request_method: 'POST',
      request_size_bytes: Math.floor(Math.random() * 50000) + 1000,
      response_status: i === 15 ? 429 : i === 16 ? 500 : 200
    });
  }

  // Sort by timestamp descending (newest first)
  return mockLogs.sort((a, b) => b.timestamp - a.timestamp);
};
