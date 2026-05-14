import { supabaseAuth, supabaseAdmin } from '../config/supabase.js';
import { asyncHandler, HttpError } from '../lib/asyncHandler.js';

const ALLOWED_ROLES = ['community_member', 'facility_manager', 'worker', 'admin'];

export const register = asyncHandler(async (req, res) => {
  const { full_name, name, email, password, role, phone_number } = req.body;
  const displayName = full_name || name;

  if (!displayName || !email || !password || !role) {
    throw new HttpError(400, 'full_name, email, password and role are required');
  }
  if (!ALLOWED_ROLES.includes(role)) {
    throw new HttpError(400, `role must be one of ${ALLOWED_ROLES.join(', ')}`);
  }

  // 1. Create the auth user
  const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: { data: { full_name: displayName, role } },
  });
  if (authError) throw new HttpError(400, authError.message);

  const userId = authData.user.id;

  // 2. Mirror profile into public.users. Roll back the auth user if this fails.
  const { error: profileError } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      full_name: displayName,
      email,
      phone_number: phone_number ?? null,
      role,
    });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
    throw new HttpError(400, profileError.message);
  }

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: userId,
      full_name: displayName,
      email,
      role,
    },
    session: authData.session,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new HttpError(400, 'email and password are required');

  console.log('[auth] login attempt:', email);

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) {
    console.warn('[auth] signInWithPassword failed:', error.message);
    throw new HttpError(401, error.message);
  }

  console.log('[auth] supabase auth OK, fetching profile for:', data.user.id);

  // Pull the authoritative profile so the mobile app gets the right role.
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email, role, status')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    console.error('[auth] profile fetch error:', profileError.message);
    throw new HttpError(401, 'User profile not found — have you run the DB migration?');
  }
  if (!profile) {
    console.warn('[auth] no profile row for auth user:', data.user.id);
    throw new HttpError(401, 'User profile not found — have you run the DB migration?');
  }
  if (profile.status !== 'active') throw new HttpError(403, 'Account is inactive');

  console.log('[auth] login success:', email, profile.role);

  res.status(200).json({
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  // Invalidate all refresh tokens for this user.
  await supabaseAdmin.auth.admin.signOut(req.user.id).catch(() => {});
  res.status(204).end();
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new HttpError(400, 'email is required');

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'No account found with this email address.');

  res.json({ message: 'Email verified', email: data.email });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new HttpError(400, 'email and password are required');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (profileError || !profile) throw new HttpError(404, 'Account not found');

  // Supabase Auth handles hashing — do NOT hash manually
  const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.id, { password });
  if (error) throw new HttpError(400, error.message);

  res.json({ message: 'Password updated successfully' });
});

export default { register, login, logout, me, forgotPassword, resetPassword };
