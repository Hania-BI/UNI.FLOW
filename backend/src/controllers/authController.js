import { supabaseAuth, supabaseAdmin } from '../config/supabase.js';

export const register = async (req, res) => {
  const { name, email, password, role, phone_number } = req.body;

  if (!name || !email || !password || !role || !phone_number) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: { name, role, phone_number }
      }
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // 2. Insert into role-specific table
    let table = '';
    if (role === 'community_member') table = 'community_members';
    else if (role === 'facility_manager') table = 'facility_managers';
    else if (role === 'worker') table = 'workers';
    else throw new Error('Invalid role');

    const { error: profileError } = await supabaseAdmin
      .from(table)
      .insert({
        user_id: userId,
        name,
        email,
        phone_number,
      });

    if (profileError) {
      // In a real app, you might want to delete the auth user if profile creation fails
      throw profileError;
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: authData.user,
      session: authData.session
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(401).json({ error: error.message });

    res.status(200).json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        name: data.user.user_metadata.name,
        role: data.user.user_metadata.role,
        phone_number: data.user.user_metadata.phone_number
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email);
    if (error) throw error;

    res.status(200).json({ message: 'Reset link sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

export default {
  register,
  login, 
  forgotPassword,
};