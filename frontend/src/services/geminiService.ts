/**
 * Gemini AI Service for logo and text removal
 * 
 * This service uses Google's Gemini API to detect and remove
 * watermarks, logos, and text from images.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

/**
 * Remove logos and text from an image using Gemini AI
 * @param base64Image - Base64 encoded image (with or without data URL prefix)
 * @returns Promise<string> - Cleaned image as base64 data URL
 */
export const removeLogosFromImage = async (base64Image: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your environment.');
  }

  // Extract base64 data if it includes the data URL prefix
  const base64Data = base64Image.includes('base64,') 
    ? base64Image.split('base64,')[1] 
    : base64Image;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `You are an expert image editor. Please analyze this image and remove any visible:
1. Watermarks (text overlays, logos, stamps)
2. Brand logos or company marks
3. Text overlays, captions, or subtitles
4. Any other artificial elements that appear to be added on top of the original image

Preserve the original image quality and seamlessly fill in the removed areas using context-aware inpainting.
Return ONLY the cleaned image, no text response.`
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['image', 'text'],
      responseMimeType: 'text/plain'
    }
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data: GeminiResponse = await response.json();

    // Check for API errors
    if (data.error) {
      throw new Error(data.error.message);
    }

    // Extract the image from the response
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const parts = candidates[0].content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error('No content in Gemini response');
    }

    // Look for image data in the response
    for (const part of parts) {
      if (part.inlineData) {
        const { mimeType, data: imageData } = part.inlineData;
        return `data:${mimeType};base64,${imageData}`;
      }
    }

    // If no image was returned, return the original
    console.warn('Gemini did not return an image, returning original');
    return base64Image;

  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
};

/**
 * Generate a description or analysis of an image using Gemini
 * @param base64Image - Base64 encoded image
 * @returns Promise<string> - Text description
 */
export const analyzeImage = async (base64Image: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your environment.');
  }

  const base64Data = base64Image.includes('base64,') 
    ? base64Image.split('base64,')[1] 
    : base64Image;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: 'Describe this image in detail. Include information about the composition, subjects, colors, mood, and any notable elements.'
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    }
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data: GeminiResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const parts = candidates[0].content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error('No content in Gemini response');
    }

    // Look for text in the response
    for (const part of parts) {
      if (part.text) {
        return part.text;
      }
    }

    return 'Unable to analyze image';

  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
};

/**
 * Generate creative suggestions for an image
 * @param base64Image - Base64 encoded image
 * @returns Promise<string[]> - Array of suggestions
 */
export const generateSuggestions = async (base64Image: string): Promise<string[]> => {
  if (!GEMINI_API_KEY) {
    return ['Configure Gemini API key to get AI suggestions'];
  }

  const base64Data = base64Image.includes('base64,') 
    ? base64Image.split('base64,')[1] 
    : base64Image;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `Analyze this image and provide 3-5 creative suggestions for improving it or using it effectively. 
Format your response as a simple numbered list.
Focus on:
- Composition improvements
- Color adjustments
- Potential use cases
- Enhancement ideas`
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 512,
    }
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return ['Unable to generate suggestions'];
    }

    const data: GeminiResponse = await response.json();

    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts) {
      return ['Unable to generate suggestions'];
    }

    const text = parts.find(p => p.text)?.text || '';
    
    // Parse numbered list into array
    const suggestions = text
      .split(/\d+\.\s+/)
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());

    return suggestions.length > 0 ? suggestions : ['No suggestions available'];

  } catch (error) {
    console.error('Gemini API error:', error);
    return ['Error generating suggestions'];
  }
};

/**
 * Check if Gemini API is configured
 */
export const isGeminiConfigured = (): boolean => {
  return !!GEMINI_API_KEY;
};