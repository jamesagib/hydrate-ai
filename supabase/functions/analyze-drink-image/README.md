# Analyze Drink Image Edge Function

This Supabase Edge Function analyzes drink images using Google Cloud Vision API and GPT-4 to estimate drink volume for hydration tracking.

## Setup

### 1. Environment Variables

Add these environment variables to your Supabase project:

```bash
# Google Cloud Vision API
GOOGLE_CLOUD_VISION_API_KEY=your_vision_api_key_here

# OpenAI API (already configured)
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Google Cloud Vision API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Cloud Vision API
4. Create credentials (API Key)
5. Add the API key to your Supabase environment variables

### 3. Deploy the Function

```bash
supabase functions deploy analyze-drink-image
```

## Usage

The function accepts a POST request with a base64-encoded image:

```javascript
const { data, error } = await supabase.functions.invoke('analyze-drink-image', {
  body: { image: base64ImageString }
})
```

## Response Format

```json
{
  "name": "Water Bottle",
  "estimatedOz": 16,
  "confidence": 0.85,
  "description": "Detected a standard water bottle with typical 16oz capacity"
}
```

## Processing Flow

1. **Image Analysis**: Google Cloud Vision API analyzes the image for labels, objects, and text
2. **AI Processing**: GPT-4 processes the Vision API results to estimate drink type and volume
3. **Response**: Returns structured data with drink name, estimated ounces, confidence level, and reasoning

## Error Handling

- Returns 400 if no image is provided
- Returns 500 for API errors or processing failures
- Includes fallback response for parsing errors

## Performance

- **Vision API**: ~1-2 seconds
- **GPT-4 Processing**: ~2-3 seconds
- **Total**: ~3-5 seconds

## Security

- Validates input data
- Sanitizes API responses
- Uses environment variables for API keys
- Implements CORS headers 