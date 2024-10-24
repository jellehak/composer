// Browser version with similar API as https://www.npmjs.com/package/openai

export class OpenAI {
    apiKey = '';
    serverUrl = 'https://api.openai.com/v1';
    constructor(options) {
        Object.assign(this, options);
    }
    chat = {
        completions: {
            create: create.bind(this)
        }
    }
}

export default OpenAI

class CreateParams {
    messages = [];
    model = 'gpt-3.5-turbo';
    max_tokens = 256;
    n = 1;
    stream = true
}

export async function* create(params = new CreateParams, options) {
    const response = await fetch(`${this.serverUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(params),
        ...options
    });

    const resp = await handleEventStream(response);
    // const resp = await processSSE(response);
    // Proxy generator
    for await (const message of resp) {
        // console.log({message});
        // Remove the 'data:' prefix
        const sse = {
            raw: message,
            data: message.replace('data:', '').trim()
        }
        if (sse.data.startsWith('[DONE]')) {
            // done = true;
            break;
        }
        try {
            const json = JSON.parse(sse.data);
            // const json = JSON.parse(data);
            yield json
        } catch (e) {
            console.error(`Could not parse message into JSON:`, sse.data);
            console.error(`From chunk:`, sse.raw);
            throw e;
        }
        // yield message;
    }
}

/**
 * Function to handle the stream
 * @param {*} response 
 */
async function* handleEventStream(response) {
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n'); // SSE events are usually separated by a double newline
        while (boundary !== -1) {
            const eventString = buffer.substring(0, boundary).trim();
            buffer = buffer.substring(boundary + 2);
            yield eventString;
            boundary = buffer.indexOf('\n\n');
        }
    }
}