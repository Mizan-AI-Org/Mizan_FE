import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { image } = await req.json();

    // Remove the data:image/jpeg;base64, prefix if present
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, '');

    console.log('Processing menu image with OpenAI Vision...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a restaurant menu analysis expert. Analyze the provided menu image and extract:
            1. All menu items with their names and prices
            2. For each item, provide a detailed recipe with ingredients and quantities needed to prepare one serving
            3. Categorize items (appetizers, mains, desserts, drinks, etc.)
            4. Estimate preparation time and difficulty level
            
            Return the response as a well-structured JSON object with this format:
            {
              "categories": [
                {
                  "name": "Category Name",
                  "items": [
                    {
                      "name": "Item Name",
                      "price": "Price",
                      "description": "Brief description if available",
                      "recipe": {
                        "ingredients": [
                          {"name": "ingredient", "quantity": "amount", "unit": "measurement"}
                        ],
                        "instructions": ["step 1", "step 2", ...],
                        "prepTime": "time in minutes",
                        "difficulty": "easy/medium/hard",
                        "servings": 1
                      }
                    }
                  ]
                }
              ]
            }`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this restaurant menu and extract all items with their recipes and ingredients as specified.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Failed to analyze menu');
    }

    const analysisResult = data.choices[0].message.content;
    console.log('Menu analysis completed successfully');

    // Try to parse the JSON response
    let menuData;
    try {
      menuData = JSON.parse(analysisResult);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // If JSON parsing fails, return a structured error
      menuData = {
        error: 'Failed to parse menu analysis',
        rawResponse: analysisResult
      };
    }

    return new Response(JSON.stringify({ menuData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in menu scanner:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});