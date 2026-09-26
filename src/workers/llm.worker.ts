/**
 * Web Worker for WebLLM MLC Engine
 * Runs completely isolated from the UI thread to prevent UI freezing during token generation
 */
import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// Initialize handler that bridges messages from main thread to MLC WebGPU engine
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (event: MessageEvent) => {
  handler.onmessage(event);
};
