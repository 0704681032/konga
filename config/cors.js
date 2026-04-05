'use strict';

/**
 * Cross-Origin Resource Sharing (CORS) Settings
 * (sails.config.security.cors)
 *
 * CORS is like a more modern version of JSONP-- it allows your server/API
 * to successfully respond to requests from client-side JavaScript code
 * running on some other domain (e.g. google.com)
 * Unlike JSONP, it works with POST, PUT, and DELETE requests
 */
module.exports.security = {
  cors: {
    allRoutes: true,
    allowOrigins: ['http://localhost:5173', 'http://localhost:1337', 'http://127.0.0.1:5173', 'http://127.0.0.1:1337'],
    allowCredentials: true,
    allowRequestMethods: 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH',
    allowRequestHeaders: 'content-type, access-control-allow-origin, authorization, kong-admin-url'
  }
};
