/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Buffer } from 'node:buffer';

let key = null;

async function encrypt_str(value) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt( {name: 'AES-GCM', iv: iv}, key, Buffer.from(value, 'utf8'));
    return Buffer.concat([iv, new Uint8Array(ciphertext)]).toString('base64');
}

async function decrypt_str(encrypted) {
    const encrypted_buf = Buffer.from(encrypted, 'base64');
    const iv = encrypted_buf.subarray(0, 12);
    const ciphertext = encrypted_buf.subarray(12);
    const plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv: iv}, key, ciphertext);
    return Buffer.from(plaintext).toString('utf8');
}

export default {
    async fetch(request, env, ctx) {
        if (key === null) {
            const jwk = JSON.parse(env.COOKIE_KEY);
            key = await crypto.subtle.importKey('jwk', jwk, 'AES-GCM', false, ['encrypt', 'decrypt']);
        }

        const plaintext = 'Hello, World!';
        const encrypted = await encrypt_str(plaintext);
        const decrypted = await decrypt_str(encrypted);
        return new Response(`Plaintext: ${plaintext}
Encrypted: ${encrypted}
Decrypted: ${decrypted}`);
    },
};
