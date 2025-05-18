import { DEEPSEEK_API_KEY, DEEPSEEK_URL, OLLAMA_API_KEY, OLLAMA_URL } from "../../../config.js";

class AiService {
    constructor(eventBus) {
        this.apiKey = DEEPSEEK_API_KEY;
        this.apiUrl = DEEPSEEK_URL;
        this.model = 'deepseek-chat'; // 'gemma3'

        this.eventBus = eventBus;

        this.eventBus.subscribe('changeLLMServiceProvider', ({model, url, key}) => {
            this.apiUrl = url;
            this.apiKey = key;
            this.model = model;
        })
    }
    /**
     * Sends a prompt to the LLM Services
     * @param {string} prompt - The prompt to send
     * @param {string} model - The model to use (defaults to the one specified in constructor)
     * @returns {Promise<string>} - The response from the API
     */
    async sendPromptToLLMApi(prompt, model = this.model) {
        console.log('Sending prompt...', prompt);
        if (model === 'gemma3') {
            return await this.sendPromptToOllama(prompt, model);
        } else if (model === "deepseek-chat") {
            return await this.sendPromptToDeepseekAPI(prompt, "deepseek-chat");
        }
    }

    async sendPromptToDeepseekAPI(prompt, model = 'deepseek-chat') {
        const payload = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: "You are a software expert with more than 15 years' experience, you are good at call tree summarization and software explanation" },
                    { role: "user", content: prompt }
                ],
                stream: false
            })
        };

        try {
            const response = await fetch(this.apiUrl, payload);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(data);
            // Return the actual content string from the response
            return data.choices[0].message.content;

        } catch (error) {
            console.error('Error calling DeepSeek API:', error);
            throw error;
        }
    }

    /**
     * Send a prompt to Ollama API
     * @param {string} prompt - The prompt to send
     * @param {string} model - The model to use (defaults to the one specified in constructor)
     * @returns {Promise<string>} - The response from the API
     */
    async sendPromptToOllama(prompt, model = 'gemma3') {
        const payload = {
            model: model,
            prompt: prompt,
            stream: false,
            format: "json" // Request JSON format from the model
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Error sending prompt to LLM Service:', error);
            throw error;
        }
    }

    /**
     * Process raw response from LLM to extract valid JSON
     * @param {string} response - Raw response from the API
     * @returns {Object} - Parsed JSON or fallback object
     */
    processRawResponse(response) {
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
    }

    /**
     * Get explanation task content template
     */
    getRegionExplanationTaskContent() {
        return `Task:
    Given the call trace of a Java method execution, id is the the execution order, generate an output in JSON format that includes three parts:

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
    }

    /**
     * Get task content template for quick KNT explanation
     */
    getQuickKNTExplanationTaskContent() {
        return `Task:
    Given the important methods from a call trace of a Java method execution, id is the the execution order, generate an output in JSON format that includes three parts:

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
    }

    /**
     * Get task content template for detailed KNT explanation with region data
     */
    getDetailedKNTExplanationTaskContent() {
        return `Task:
        Given an Key Node Tree (important node in a call tree) epresentation of a Java method call tree, where each node is an entry point of a region in the larger call tree and includes its own briefSummary, generate an output in JSON format that includes three parts:

        1. detailedBehaviour: Provide a comprehensive explanation of the entire execution flow represented by the AST. Describe how the different regions interact, their hierarchical relationships, and the overall program logic. Integrate the information from individual region summaries to form a cohesive understanding of the complete execution trace.

        2. flowRepresentation: Illustrate the sequence of key operations across the entire execution using a simple linear format (e.g., "Initialize → Process → Validate → Complete"). Focus on showing how the different regions connect and contribute to the overall execution flow. Each step should represent a major functional stage rather than individual regions or method calls.

        3. briefSummary: Summarize the entire execution trace in 1 to 3 sentences, focusing on the high-level purpose and outcome of the operation. This should integrate the most important aspects from all regions to provide a concise overview of what the system is accomplishing.

        Note: Your explanation should synthesize information across regions and capture the "big picture" of the system's behavior. Consider the hierarchical structure of the AST and how parent-child relationships represent logical containment or orchestration between different parts of the execution.

        Below is an example:
        {
        "detailedBehaviour": "This trace execution begins with the RequestHandler which orchestrates the overall process. It first delegates to the AuthenticationManager to verify user credentials, followed by the RequestValidator that ensures all required parameters are present and valid. Once validation is complete, the BusinessLogicProcessor executes the core functionality by retrieving data from the DatabaseAccessor and applying business rules through the RulesEngine. Finally, the ResponseFormatter prepares the output and the RequestHandler returns the result to the client. The execution demonstrates a clean separation of concerns with distinct components handling authentication, validation, core processing, and response generation.",
        "flowRepresentation": "Request Handling → Authentication → Validation → Data Retrieval → Business Logic Processing → Response Formatting → Result Delivery",
        "briefSummary": "The system processes an incoming client request through a series of stages including authentication, validation, and business logic processing, ultimately returning a formatted response that meets the client's requirements."
        }

        Your response must be in valid JSON format with no additional text. Format your response as a JSON object with the three requested fields.`;
    }

    /**
     * Creates a timeout promise for request cancellation
     * @param {number} timeoutMs - Timeout in milliseconds
     * @returns {Promise} - A promise that rejects after the timeout
     */
    createTimeoutPromise(timeoutMs = 60000 * 60) {
        return new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
        );
    }

    /**
     * Explains a region of code using the AI
     * @param {Object} regionData - The region data to explain
     * @returns {Promise<Object>} - Object containing briefSummary, detailedBehaviour, and flowRepresentation
     */
    async explainRegion(regionData) {
        const taskContent = this.getRegionExplanationTaskContent();
        const regionDataString = JSON.stringify(regionData, null, 2);

        const fullPrompt = `${taskContent}\n\nAnalyze this call trace:\n${regionDataString}\n\nGenerate a valid JSON response with detailedBehaviour, flowRepresentation, and briefSummary fields.`;

        console.log('Sending region explanation prompt to LLM Service...');

        try {
            const timeoutPromise = this.createTimeoutPromise();
            const responsePromise = this.sendPromptToLLMApi(fullPrompt);
            const response = await Promise.race([responsePromise, timeoutPromise]);

            console.log("Raw response from LLM for region explanation:", response.substring(0, 100) + "...");
            return this.processRawResponse(response);
        } catch (error) {
            console.error('Error in region explanation:', error);
            return {
                detailedBehaviour: `Error occurred during analysis: ${error.message}`,
                flowRepresentation: "Request → Error → Fallback",
                briefSummary: `Failed to analyze region data (ID: ${regionData.id || "unknown"})`
            };
        }
    }

    /**
     * Generates a quick summary of an KNT
     * @param {Object} k n t - The KNT to explain
     * @returns {Promise<string>} - A quick summary of the KNT
     */
    async explainPureKNT(knt) {
        const taskContent = this.getQuickKNTExplanationTaskContent();
        const kntString = JSON.stringify(knt, null, 2);

        const fullPrompt = `${taskContent}\n\nAnalyze this Abstract Call Tree:\n${kntString}\n\nProvide a concise summary:`;

        console.log('Sending quick KNT explanation prompt to LLM Service...');

        try {
            const timeoutPromise = this.createTimeoutPromise();
            const responsePromise = this.sendPromptToLLMApi(fullPrompt);

            const response = await Promise.race([responsePromise, timeoutPromise]);

            console.log("Raw response from LLM for quick KNT explanation:", response.substring(0, 100) + "...");

            // For this function, we don't need JSON parsing - just return the text
            const cleanedResponse = response.replace(/```(?:.*?)?\n([\s\S]*?)\n```/g, '$1').trim();
            return cleanedResponse || `Quick summary for ${knt.id || "unknown KNT"}`;
        } catch (error) {
            console.error('Error in quick KNT explanation:', error);
            return `Error generating quick summary for ${knt.id || "unknown KNT"}: ${error.message}`;
        }
    }

    /**
     * Explains an KNT with augmented region data
     * @param {Object} augmentedKNT - The KNT with region summaries
     * @returns {Promise<string>} - A detailed explanation of the KNT
     */
    async explainKNTWithData(augmentedKNT) {
        const taskContent = this.getDetailedKNTExplanationTaskContent();
        const kntString = JSON.stringify(augmentedKNT, null, 2);

        const fullPrompt = `${taskContent}\n\nAnalyze this augmented Abstract Call Tree with region summaries:\n${kntString}\n\nProvide a comprehensive explanation:`;

        console.log('Sending detailed KNT explanation prompt to LLM Service...');

        try {
            const timeoutPromise = this.createTimeoutPromise();
            const responsePromise = this.sendPromptToLLMApi(fullPrompt);
            const response = await Promise.race([responsePromise, timeoutPromise]);

            console.log("Raw response from LLM for detailed KNT explanation:", response.substring(0, 100) + "...");

            // Like explainPureKNT, we want the raw text, not JSON
            const cleanedResponse = response.replace(/```(?:.*?)?\n([\s\S]*?)\n```/g, '$1').trim();
            return cleanedResponse || `Detailed trace summary for ${augmentedKNT.id || "unknown KNT"}`;
        } catch (error) {
            console.error('Error in detailed KNT explanation:', error);
            return `Error generating detailed explanation for ${augmentedKNT.id || "unknown KNT"}: ${error.message}`;
        }
    }
}

export { AiService };