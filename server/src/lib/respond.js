/**
 * Consistent JSON response helpers.
 * Every endpoint should use these instead of res.json() directly.
 */
'use strict';

/**
 * 200 success response.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} [message]
 */
function ok(res, data, message = 'OK') {
  return res.status(200).json({ success: true, message, data });
}

/**
 * 201 created response.
 */
function created(res, data, message = 'Created') {
  return res.status(201).json({ success: true, message, data });
}

/**
 * 400 bad request.
 */
function badRequest(res, message = 'Bad request', errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(400).json(body);
}

/**
 * 404 not found.
 */
function notFound(res, message = 'Not found') {
  return res.status(404).json({ success: false, message });
}

/**
 * 401 unauthorized — not authenticated.
 */
function unauthorized(res, message = 'Unauthorized') {
  return res.status(401).json({ success: false, message });
}

/**
 * 403 forbidden — authenticated but not allowed.
 */
function forbidden(res, message = 'Forbidden') {
  return res.status(403).json({ success: false, message });
}

/**
 * 409 conflict (e.g. slot already booked).
 */
function conflict(res, message = 'Conflict') {
  return res.status(409).json({ success: false, message });
}

/**
 * 500 internal server error.
 */
function serverError(res, message = 'Internal server error') {
  return res.status(500).json({ success: false, message });
}

module.exports = { ok, created, badRequest, unauthorized, forbidden, notFound, conflict, serverError };
