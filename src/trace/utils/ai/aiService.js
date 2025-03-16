// Import fetch for Node.js environments
export async function sendPromptToOllama(prompt, model = 'gemma3') {
    const url = 'http://172.245.88.195:9029/api/generate';

    const API_KEY = 'uM8p2K7tJxLzQ9vHgF5eRbN3dA6cY1sW';

    const payload = {
        model: model,
        prompt: prompt,
        stream: false,
        format: "json" // Request JSON format from the model
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}` // Add authorization header
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Error sending prompt to Ollama:', error);
        throw error;
    }
}

// Your task content
const taskContent = `Task:
    Given the call trace of a Java method execution, generate an output in JSON format that includes three parts:

    1. detailedBehaviour: Provide a comprehensive explanation of the call trace, describing the sequence and role of each step in the call trace.

    2. flowRepresentation: Illustrate the sequence of key operations in the trace using a simple linear format (e.g., "Initialize → Process → Validate → Complete"). Each step should represent a functional stage in the execution rather than individual method calls. Focus on capturing the logical progression and purpose of each major stage in the execution flow.

    3. briefSummary: Summarize the call trace in 1 to 3 sentences focusing on the overall process. The summary should be a shorter version of the detailed explanation, highlighting the core functionality.

    Note: Do not include any details from the underlying call graph data; focus exclusively on the high-level trace summary and explanation. If it is a recursive call, please mention in explanation.

    Below is an example:
    {
    "detailedBehaviour": "This trace starts with the main method being invoked, followed by a series of support methods that prepare the necessary components for execution. Each step represents a distinct operation: initial setup, resource creation, validation, processing, and finally, finalizing the result. The detailed explanation breaks down each call, its role, and how it contributes to the overall method execution.",
    "flowRepresentation": "A (summary of step A) → B (summary of step B) → C (Summary of step C) → D (Summary of step D) → E (summary of step E)",
    "briefSummary": "The execution trace shows..."
    }

    Your response must be in valid JSON format with no additional text. Format your response as a JSON object with the three requested fields.`;

// Function to execute when you want to add the subtree data
export async function explainSubTree(subtreeData) {
    const subtreeString = JSON.stringify(subtreeData, null, 2);
    
    // Explicitly instruct the model to generate a valid JSON response
    const fullPrompt = `${taskContent}\n\nAnalyze this call trace:\n${subtreeString}\n\nGenerate a valid JSON response with detailedBehaviour, flowRepresentation, and briefSummary fields.`;
    console.log(fullPrompt)
    console.log('Sending prompt to Ollama...');
    
    try {
        // Add a timeout to the request
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timed out')), 60000)
        );
        
        const responsePromise = sendPromptToOllama(fullPrompt);
        const response = await Promise.race([responsePromise, timeoutPromise]);
        
        console.log("Raw response from Ollama:", response);

        // More robust JSON extraction
        try {
            // First attempt: Try to parse the raw response directly
            try {
                const directParse = JSON.parse(response);
                console.log('Direct JSON parsing successful');
                return directParse;
            } catch (directError) {
                console.log('Direct parsing failed, trying extraction methods');
            }
            
            // Clean up the response to help with parsing
            let cleanedResponse = response.trim();

            // Pattern matching for code blocks (including json, JSON, or no language specified)
            const codeBlockMatch = cleanedResponse.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch && codeBlockMatch[1]) {
                cleanedResponse = codeBlockMatch[1].trim();
                console.log('Extracted from code block:', cleanedResponse.substring(0, 50) + '...');
            }

            // Find the first { and last } for a potential JSON object
            const firstBrace = cleanedResponse.indexOf('{');
            const lastBrace = cleanedResponse.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
                console.log('Extracted JSON by braces');
            }

            // If the response is still empty or doesn't appear to be JSON, create a fallback
            if (!cleanedResponse || !cleanedResponse.trim().startsWith('{')) {
                console.log('Response doesn\'t look like JSON, creating fallback');
                return {
                    detailedBehaviour: "Failed to extract valid JSON from model response. The raw response did not contain properly formatted JSON data.",
                    flowRepresentation: "Parse Request → Extract JSON → Handle Failure",
                    briefSummary: "The model failed to provide a valid JSON response for the given call trace."
                };
            }

            console.log('Attempting to parse JSON from cleaned response');
            const parsedJson = JSON.parse(cleanedResponse);
            console.log('Successfully parsed JSON response');
            
            // Verify that the response has the expected structure
            const hasRequiredFields = 
                parsedJson.hasOwnProperty('detailedBehaviour') &&
                parsedJson.hasOwnProperty('flowRepresentation') &&
                parsedJson.hasOwnProperty('briefSummary');
                
            if (!hasRequiredFields) {
                console.log('Response missing required fields, creating structured response');
                return {
                    detailedBehaviour: parsedJson.detailedBehaviour || "Missing detailed behavior in model response",
                    flowRepresentation: parsedJson.flowRepresentation || "Missing flow representation in model response",
                    briefSummary: parsedJson.briefSummary || "Missing brief summary in model response"
                };
            }
            
            return parsedJson;
        } catch (jsonError) {
            console.error('Could not parse valid JSON from response:', jsonError);
            console.log('Raw response:', response);
            
            // Return a fallback structured response
            return {
                detailedBehaviour: "Failed to parse valid JSON from the LLM response for the provided call trace.",
                flowRepresentation: "Request → Parse Failure → Fallback Response",
                briefSummary: "The system encountered an error parsing the model's response into valid JSON format."
            };
        }
    } catch (error) {
        console.error('Error in analysis:', error);
        
        // Return structured error information
        return {
            detailedBehaviour: `Error occurred during analysis: ${error.message}`,
            flowRepresentation: "Request → Error → Fallback",
            briefSummary: "An error occurred while processing the call trace data."
        };
    }
}
