/**
 * pythonBridge.js — Axios helper that proxies requests to the Python FastAPI microservice.
 * The Python service runs on PYTHON_SERVICE_URL (default: http://localhost:5001).
 */

import axios from 'axios';
import FormData from 'form-data';
import config from '../config.js';

const pythonClient = axios.create({
  baseURL: config.pythonServiceUrl,
  timeout: 120_000, // 2 minutes for heavy EDA/PDF tasks
});

/**
 * Forward a JSON POST to the Python service.
 * @param {string} path  e.g. '/api/clean'
 * @param {object} body  JSON payload
 */
export async function pyPost(path, body) {
  const response = await pythonClient.post(path, body, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
}

/**
 * Forward a multipart file upload to the Python service.
 * @param {string} path       e.g. '/api/upload'
 * @param {Buffer} fileBuffer File contents
 * @param {string} filename   Original filename
 * @param {string} mimetype   MIME type
 */
export async function pyPostFile(path, fileBuffer, filename, mimetype, sessionId = null) {
  const form = new FormData();
  form.append('file', fileBuffer, { filename, contentType: mimetype });
  if (sessionId) {
    form.append('session_id', sessionId);
  }

  const response = await pythonClient.post(path, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return response.data;
}

/**
 * Forward a JSON POST and stream back binary data (e.g. PDF report).
 * @param {string} path  e.g. '/api/report'
 * @param {object} body  JSON payload
 * @returns {AxiosResponse} raw response with data as a stream
 */
export async function pyPostStream(path, body) {
  const response = await pythonClient.post(path, body, {
    headers: { 'Content-Type': 'application/json' },
    responseType: 'stream',
  });
  return response;
}
