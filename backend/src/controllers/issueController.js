import path from 'path';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { asyncHandler, HttpError } from '../lib/asyncHandler.js';

const BUCKET = 'issue-photos';

const ALLOWED_CATEGORIES = ['electrical', 'plumbing', 'cleaning', 'furniture', 'other'];

// Status state machine — see docs/IMPLEMENTATION_PLAN.md §3.
const TRANSITIONS = {
  pending:     ['assigned', 'in_progress'],
  assigned:    ['in_progress', 'pending'],
  in_progress: ['resolved', 'pending'],
  resolved:    ['closed', 'pending'],
  closed:      [],
};

const ISSUE_SELECT = `
  id, title, description, category, status,
  photo_url, completion_photo_url,
  created_at, resolved_at, closed_at,
  location:locations ( id, building, floor, room ),
  submitter:users!issues_submitted_by_fkey ( id, full_name, email ),
  worker:users!issues_assigned_to_fkey ( id, full_name, email )
`;

async function signUrl(p) {
  if (!p) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(p, 60 * 60);
  return error ? null : data.signedUrl;
}

async function hydrate(issue) {
  if (!issue) return issue;
  return {
    ...issue,
    photo_url: await signUrl(issue.photo_url),
    completion_photo_url: await signUrl(issue.completion_photo_url),
  };
}

async function uploadPhoto(file, userId) {
  const ext = path.extname(file.originalname) || '.jpg';
  const key = `${userId}/${randomUUID()}${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(key, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw new HttpError(500, `Upload failed: ${error.message}`);
  return key;
}

async function logStatusChange(issueId, fromStatus, toStatus, userId, note) {
  await supabaseAdmin.from('issue_status_log').insert({
    issue_id: issueId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: userId,
    note: note ?? null,
  });
}

async function loadIssueOr404(id) {
  const { data, error } = await supabaseAdmin
    .from('issues')
    .select(ISSUE_SELECT)
    .eq('id', id)
    .single();
  if (error || !data) throw new HttpError(404, 'Issue not found');
  return data;
}

// =========================================================
// POST /api/issues  (community_member)
// =========================================================
export const createIssue = asyncHandler(async (req, res) => {
  const { description, category, building, floor, room, title } = req.body;
  if (!description || !category || !building || !floor || !room) {
    throw new HttpError(400, 'description, category, building, floor and room are required');
  }
  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new HttpError(400, `category must be one of ${ALLOWED_CATEGORIES.join(', ')}`);
  }

  // 1. Find-or-create location
  let locationId;
  const { data: existing } = await supabaseAdmin
    .from('locations')
    .select('id')
    .eq('building', building)
    .eq('floor', floor)
    .eq('room', room)
    .maybeSingle();

  if (existing) {
    locationId = existing.id;
  } else {
    const { data: created, error: locError } = await supabaseAdmin
      .from('locations')
      .insert({ building, floor, room })
      .select('id')
      .single();
    if (locError) throw new HttpError(500, locError.message);
    locationId = created.id;
  }

  // 2. Optional photo
  let photoKey = null;
  if (req.file) photoKey = await uploadPhoto(req.file, req.user.id);

  // 3. Create issue
  const { data: issue, error: issueError } = await supabaseAdmin
    .from('issues')
    .insert({
      title: title || `${category} at ${building} ${floor}/${room}`,
      description,
      category,
      status: 'pending',
      photo_url: photoKey,
      location_id: locationId,
      submitted_by: req.user.id,
    })
    .select(ISSUE_SELECT)
    .single();

  if (issueError) {
    if (photoKey) await supabaseAdmin.storage.from(BUCKET).remove([photoKey]).catch(() => {});
    throw new HttpError(500, issueError.message);
  }

  await logStatusChange(issue.id, null, 'pending', req.user.id, 'Issue created');

  res.status(201).json({ issue: await hydrate(issue) });
});

// =========================================================
// GET /api/issues  (facility_manager, admin)
// =========================================================
export const getAllIssues = asyncHandler(async (req, res) => {
  const { status, category, from, to } = req.query;
  let q = supabaseAdmin.from('issues').select(ISSUE_SELECT).order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  if (category) q = q.eq('category', category);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);

  const { data, error } = await q;
  if (error) throw new HttpError(500, error.message);

  const issues = await Promise.all(data.map(hydrate));
  res.json({ issues });
});

// =========================================================
// GET /api/issues/my  (community_member)
// =========================================================
export const getMyIssues = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('issues')
    .select(ISSUE_SELECT)
    .eq('submitted_by', req.user.id)
    .order('created_at', { ascending: false });
  if (error) throw new HttpError(500, error.message);
  const issues = await Promise.all(data.map(hydrate));
  res.json({ issues });
});

// =========================================================
// GET /api/issues/assigned  (worker)
// =========================================================
export const getAssignedIssues = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('issues')
    .select(ISSUE_SELECT)
    .eq('assigned_to', req.user.id)
    .order('created_at', { ascending: false });
  if (error) throw new HttpError(500, error.message);
  const issues = await Promise.all(data.map(hydrate));
  res.json({ issues });
});

// =========================================================
// GET /api/issues/:id
// =========================================================
export const getIssueById = asyncHandler(async (req, res) => {
  const issue = await loadIssueOr404(req.params.id);

  const [{ data: comments }, { data: history }] = await Promise.all([
    supabaseAdmin
      .from('issue_comments')
      .select('id, body, created_at, author:users!issue_comments_author_id_fkey(id, full_name, role)')
      .eq('issue_id', issue.id)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('issue_status_log')
      .select('id, from_status, to_status, note, changed_at, changed_by:users!issue_status_log_changed_by_fkey(id, full_name, role)')
      .eq('issue_id', issue.id)
      .order('changed_at', { ascending: true }),
  ]);

  res.json({
    issue: {
      ...(await hydrate(issue)),
      comments: comments ?? [],
      status_log: history ?? [],
    },
  });
});

// =========================================================
// PUT /api/issues/:id/status  (worker on own, facility_manager)
// =========================================================
export const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!status) throw new HttpError(400, 'status is required');

  const issue = await loadIssueOr404(req.params.id);

  // Workers can only update issues assigned to them.
  if (req.user.role === 'worker' && issue.worker?.id !== req.user.id) {
    throw new HttpError(403, 'You can only update issues assigned to you');
  }

  const allowed = TRANSITIONS[issue.status] || [];
  if (!allowed.includes(status)) {
    throw new HttpError(409, `Illegal transition: ${issue.status} → ${status}`);
  }

  const patch = { status };
  if (status === 'resolved') patch.resolved_at = new Date().toISOString();

  const { data: updated, error } = await supabaseAdmin
    .from('issues')
    .update(patch)
    .eq('id', issue.id)
    .select(ISSUE_SELECT)
    .single();
  if (error) throw new HttpError(500, error.message);

  await logStatusChange(issue.id, issue.status, status, req.user.id, note);
  res.json({ issue: await hydrate(updated) });
});

// =========================================================
// PUT /api/issues/:id/assign  (facility_manager)
// =========================================================
export const assignIssue = asyncHandler(async (req, res) => {
  const { workerId } = req.body;
  if (!workerId) throw new HttpError(400, 'workerId is required');

  // Ensure the target user is actually a worker and active.
  const { data: worker, error: wErr } = await supabaseAdmin
    .from('users')
    .select('id, role, status')
    .eq('id', workerId)
    .single();
  if (wErr || !worker) throw new HttpError(404, 'Worker not found');
  if (worker.role !== 'worker' || worker.status !== 'active') {
    throw new HttpError(400, 'Target user is not an active worker');
  }

  const issue = await loadIssueOr404(req.params.id);
  if (issue.status === 'closed') throw new HttpError(409, 'Cannot reassign a closed issue');

  const { data: updated, error } = await supabaseAdmin
    .from('issues')
    .update({ assigned_to: workerId, status: 'assigned' })
    .eq('id', issue.id)
    .select(ISSUE_SELECT)
    .single();
  if (error) throw new HttpError(500, error.message);

  await logStatusChange(issue.id, issue.status, 'assigned', req.user.id, `Assigned to ${workerId}`);
  res.json({ issue: await hydrate(updated) });
});

// =========================================================
// PUT /api/issues/:id/close  (facility_manager)
// =========================================================
export const closeIssue = asyncHandler(async (req, res) => {
  const issue = await loadIssueOr404(req.params.id);
  if (issue.status !== 'resolved') {
    throw new HttpError(409, 'Only resolved issues can be closed');
  }

  const { data: updated, error } = await supabaseAdmin
    .from('issues')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', issue.id)
    .select(ISSUE_SELECT)
    .single();
  if (error) throw new HttpError(500, error.message);

  await logStatusChange(issue.id, 'resolved', 'closed', req.user.id, 'Issue closed');
  res.json({ issue: await hydrate(updated) });
});

// =========================================================
// POST /api/issues/:id/comments  (worker on own, facility_manager)
// =========================================================
export const addComment = asyncHandler(async (req, res) => {
  const { body } = req.body;
  if (!body || !body.trim()) throw new HttpError(400, 'body is required');

  const issue = await loadIssueOr404(req.params.id);
  if (req.user.role === 'worker' && issue.worker?.id !== req.user.id) {
    throw new HttpError(403, 'You can only comment on issues assigned to you');
  }

  const { data, error } = await supabaseAdmin
    .from('issue_comments')
    .insert({ issue_id: issue.id, author_id: req.user.id, body: body.trim() })
    .select('id, body, created_at, author:users!issue_comments_author_id_fkey(id, full_name, role)')
    .single();
  if (error) throw new HttpError(500, error.message);
  res.status(201).json({ comment: data });
});

// =========================================================
// POST /api/issues/:id/photo  (worker on own) — completion photo
// =========================================================
export const uploadCompletionPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'photo file is required');

  const issue = await loadIssueOr404(req.params.id);
  if (req.user.role === 'worker' && issue.worker?.id !== req.user.id) {
    throw new HttpError(403, 'You can only update issues assigned to you');
  }

  const key = await uploadPhoto(req.file, req.user.id);

  const { data: updated, error } = await supabaseAdmin
    .from('issues')
    .update({ completion_photo_url: key })
    .eq('id', issue.id)
    .select(ISSUE_SELECT)
    .single();
  if (error) {
    await supabaseAdmin.storage.from(BUCKET).remove([key]).catch(() => {});
    throw new HttpError(500, error.message);
  }

  // Best-effort cleanup of any previous completion photo
  if (issue.completion_photo_url) {
    await supabaseAdmin.storage.from(BUCKET).remove([issue.completion_photo_url]).catch(() => {});
  }

  res.json({ issue: await hydrate(updated) });
});

// =========================================================
// DELETE /api/issues/:id  (facility_manager)
// =========================================================
export const deleteIssue = asyncHandler(async (req, res) => {
  const issue = await loadIssueOr404(req.params.id);

  const keys = [issue.photo_url, issue.completion_photo_url].filter(Boolean);
  if (keys.length) await supabaseAdmin.storage.from(BUCKET).remove(keys).catch(() => {});

  const { error } = await supabaseAdmin.from('issues').delete().eq('id', issue.id);
  if (error) throw new HttpError(500, error.message);
  res.status(204).end();
});

export default {
  createIssue,
  getAllIssues,
  getMyIssues,
  getAssignedIssues,
  getIssueById,
  updateStatus,
  assignIssue,
  closeIssue,
  addComment,
  uploadCompletionPhoto,
  deleteIssue,
};
