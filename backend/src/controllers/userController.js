import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler, HttpError } from '../lib/asyncHandler.js';

const USER_FIELDS = 'id, full_name, email, phone_number, role, status, created_at';

export const listWorkers = asyncHandler(async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(USER_FIELDS)
    .eq('role', 'worker')
    .order('created_at', { ascending: false });
  if (error) throw new HttpError(500, error.message);
  res.json({ workers: data });
});

export const setWorkerStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    throw new HttpError(400, 'status must be active or inactive');
  }
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ status })
    .eq('id', req.params.id)
    .eq('role', 'worker')
    .select(USER_FIELDS)
    .single();
  if (error || !data) throw new HttpError(404, 'Worker not found');
  res.json({ worker: data });
});

export const listUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  let q = supabaseAdmin.from('users').select(USER_FIELDS).order('created_at', { ascending: false });
  if (role) q = q.eq('role', role);
  const { data, error } = await q;
  if (error) throw new HttpError(500, error.message);
  res.json({ users: data });
});

export const setUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    throw new HttpError(400, 'status must be active or inactive');
  }
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ status })
    .eq('id', req.params.id)
    .select(USER_FIELDS)
    .single();
  if (error || !data) throw new HttpError(404, 'User not found');
  res.json({ user: data });
});

export default { listWorkers, setWorkerStatus, listUsers, setUserStatus };
