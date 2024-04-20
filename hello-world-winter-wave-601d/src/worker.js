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

var libCookie = require('cookie');
var setCookie = require('set-cookie-parser');

let key = null;

async function encrypt_str(value) {
    let iv = crypto.getRandomValues(new Uint8Array(12));
    let ciphertext = await crypto.subtle.encrypt( {name: 'AES-GCM', iv: iv}, key, Buffer.from(value, 'utf8'));
    return Buffer.concat([iv, new Uint8Array(ciphertext)]).toString('base64');
}

async function decrypt_str(encrypted) {
    let encrypted_buf = Buffer.from(encrypted, 'base64');
    let iv = encrypted_buf.subarray(0, 12);
    let ciphertext = encrypted_buf.subarray(12);
    let plaintext = await crypto.subtle.decrypt({name: 'AES-GCM', iv: iv}, key, ciphertext);
    return Buffer.from(plaintext).toString('utf8');
}

export default {
    async fetch(request, env, ctx) {
        if (key === null) {
            let jwk = JSON.parse(env.COOKIE_KEY);
            key = await crypto.subtle.importKey('jwk', jwk, 'AES-GCM', false, ['encrypt', 'decrypt']);
        }

        let backend_url = new URL(request.url);
        backend_url.hostname = env.BACKEND_HOST;
        let backend_req = new Request(backend_url, request);

        if (request.headers.has('cookie')) {
            let decrypted_cookies = libCookie.parse(request.headers.get('cookie')).entries().map(([name, value]) => {
                return libCookie.serialize(name, decrypt_str(value));
            }).join('; ');
            backend_req.headers['cookie'] = decrypted_cookies;
        }

        let backend_rsp = await fetch(backend_req);

        if (backend_rsp.headers.has('set-cookie')) {
            // Reconstruct the Response object to make its headers mutable.
            backend_rsp = new Response(backend_rsp.body, backend_rsp);

            let rsp_cookies = setCookie.parse(backend_rsp);
            backend_rsp.headers.set('set-cookie', rsp_cookies.map(function(cookie) {
                let encrypted = encrypt_str(cookie.value);
                return libCookie.serialize(cookie.name, encrypted, cookie);
            }));
        }

        return backend_rsp;
    }
};
