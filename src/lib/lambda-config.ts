// Remotion Lambda configuration
// Environment variables required:
// - AWS_ACCESS_KEY_ID
// - AWS_SECRET_ACCESS_KEY
// - REMOTION_AWS_REGION (e.g., us-east-1)
// - REMOTION_LAMBDA_FUNCTION_NAME (e.g., remotion-render-4-0-420)
// - REMOTION_S3_BUCKET (e.g., remotion-renders-bucket)

export const COMPOSITION_ID = 'ReelChart';

export const getLambdaConfig = () => {
  const region = process.env.REMOTION_AWS_REGION;
  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;
  const bucketName = process.env.REMOTION_S3_BUCKET;
  const serveUrl = process.env.REMOTION_SERVE_URL;

  const isConfigured = !!(region && functionName && bucketName && serveUrl);

  return {
    isConfigured,
    region: region || 'us-east-1',
    functionName: functionName || '',
    bucketName: bucketName || '',
    serveUrl: serveUrl || '',
  };
};

export const validateLambdaConfig = () => {
  const config = getLambdaConfig();
  
  if (!config.isConfigured) {
    const missing = [];
    if (!process.env.REMOTION_AWS_REGION) missing.push('REMOTION_AWS_REGION');
    if (!process.env.REMOTION_LAMBDA_FUNCTION_NAME) missing.push('REMOTION_LAMBDA_FUNCTION_NAME');
    if (!process.env.REMOTION_S3_BUCKET) missing.push('REMOTION_S3_BUCKET');
    if (!process.env.REMOTION_SERVE_URL) missing.push('REMOTION_SERVE_URL');
    
    return {
      valid: false,
      error: `Missing environment variables: ${missing.join(', ')}`,
    };
  }

  return { valid: true, error: null };
};
