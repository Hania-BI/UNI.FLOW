import { supabaseAdmin } from '../config/supabase.js';
import { HttpError } from '../lib/asyncHandler.js';

/**
 * Verifies the Supabase access token, then loads the caller's role and
 * status from public.users (authoritative — JWT user_metadata is not trusted).
 */
export default async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Missing Authorization header');

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) throw new HttpError(401, 'Invalid or expired token');

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role, status')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) throw new HttpError(401, 'User profile not found');
    if (profile.status !== 'active') throw new HttpError(403, 'Account is inactive');

    req.user = profile;
    next();
  } catch (err) {
    next(err);
  }
}
