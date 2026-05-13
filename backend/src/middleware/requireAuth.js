import { supabaseAdmin } from '../config/supabase.js';

/**
 * Middleware that verifies the Supabase access token.
 */
export default async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  // Ask Supabase to decode and validate the token
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = data.user;
  // Note: We might need to fetch the user's role from our profile tables 
  // if it's not in the auth.users metadata.
  req.user.role = data.user.user_metadata?.role;
  
  next();
}
