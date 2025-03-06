

// Import fetch for Node.js environments
export async function sendPromptToOllama(prompt, model = 'llama3.2') {
    const url = 'http://localhost:11434/api/generate';

    const payload = {
        model: model,
        prompt: prompt,
        // temperature: temperature,
        stream: false,
        format: "json" // Some LLM APIs support this parameter
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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

    Note: Do not include any details from the underlying call graph data; focus exclusively on the high-level trace summary and explanation.

    Below is an example:
    {
    "detailedBehaviour": "This trace starts with the main method being invoked, followed by a series of support methods that prepare the necessary components for execution. Each step represents a distinct operation: initial setup, resource creation, validation, processing, and finally, finalizing the result. The detailed explanation breaks down each call, its role, and how it contributes to the overall method execution.",
    "flowRepresentation": "A (summary of step A) → B (summary of step B) → C (Summary of step C) → D (Summary of step D) → E (summary of step E)",
    "briefSummary": "The execution trace shows..."
    }

    Now please give the output based on the format above, output json only.`;

// Function to execute when you want to add the subtree data
export async function explainSubTree(subtreeData) {
    const subtreeString = JSON.stringify(subtreeData, null, 2);
    const fullPrompt = `${taskContent}\n\n${subtreeString}`;
    console.log(fullPrompt)

    try {
        console.log('Sending prompt to Ollama...');
        const response = await sendPromptToOllama(fullPrompt);

        // Try to parse the JSON directly
        try {
            // Clean up the response to help with parsing
            let cleanedResponse = response.trim();

            // If there are markdown code blocks, extract content between them
            const codeBlockMatch = cleanedResponse.match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/);
            if (codeBlockMatch && codeBlockMatch[1]) {
                cleanedResponse = codeBlockMatch[1].trim();
            }

            // Find the first { and last } for a potential JSON object
            const firstBrace = cleanedResponse.indexOf('{');
            const lastBrace = cleanedResponse.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
            }

            console.log('Attempting to parse JSON from response:');
            const parsedJson = JSON.parse(cleanedResponse);
            console.log('Successfully parsed JSON response:');
            console.log(JSON.stringify(parsedJson, null, 2));
            return parsedJson;
        } catch (jsonError) {
            console.error('Could not parse valid JSON from response:', jsonError);
            console.log('Raw response:', response);
        }

        return response;
    } catch (error) {
        console.error('Error in analysis:', error);
    }
}
