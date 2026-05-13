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

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) throw new HttpError(401, error.message);

  // Pull the authoritative profile so the mobile app gets the right role.
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, full_name, email, role, status')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) throw new HttpError(401, 'User profile not found');
  if (profile.status !== 'active') throw new HttpError(403, 'Account is inactive');

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

  const { error } = await supabaseAuth.auth.resetPasswordForEmail(email);
  if (error) throw new HttpError(400, error.message);
  res.status(200).json({ message: 'Reset link sent successfully' });
});

export default { register, login, logout, me, forgotPassword };
