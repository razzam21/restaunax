/**
 * Utility functions for token handling and rate limiting
 */

// Cache to store when we last attempted to refresh the token
// This prevents too many refresh attempts in a short period
let lastRefreshAttempt = 0;
const REFRESH_COOLDOWN_MS = 5000; // 5 seconds

/**
 * Check if we should attempt to refresh the token
 * Implements a cooldown period to prevent excessive refresh attempts
 * 
 * @returns {boolean} Whether a refresh should be attempted
 */
export const shouldAttemptRefresh = () => {
  const now = Date.now();
  
  // If it's been less than the cooldown period since the last attempt,
  // don't attempt to refresh
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN_MS) {
    console.log('Token refresh attempt too soon, skipping');
    return false;
  }
  
  // Update the last attempt time
  lastRefreshAttempt = now;
  return true;
};

/**
 * Check if a token has expired or is about to expire
 * 
 * @param {string} token JWT token to check
 * @param {number} bufferSeconds Time buffer in seconds (default: 60)
 * @returns {boolean} Whether the token is expired or will expire soon
 */
export const isTokenExpiredOrExpiringSoon = (token, bufferSeconds = 60) => {
  if (!token) return true;
  
  try {
    // Extract the payload from the JWT
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Check if there's an expiration time
    if (!payload.exp) return false;
    
    // Calculate time until expiration with buffer
    const expiresIn = payload.exp * 1000 - Date.now() - (bufferSeconds * 1000);
    
    return expiresIn < 0;
  } catch (e) {
    // If we can't parse the token, consider it expired
    console.error('Failed to parse token:', e);
    return true;
  }
};

/**
 * Clear all auth data from local storage
 */
export const clearAuthData = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
};