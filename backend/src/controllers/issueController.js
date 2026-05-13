import { supabaseAdmin } from '../config/supabase.js';
import { randomUUID } from 'crypto';
import path from 'path';

const BUCKET = 'issue-photos';

// Helper for signed URLs
const getSignedUrl = async (imagePath) => {
  if (!imagePath) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(imagePath, 60 * 60);
  return error ? null : data.signedUrl;
};

export const createIssue = async (req, res) => {
  const { description, category, building, floor, room } = req.body;
  const file = req.file;

  if (!description || !category || !building || !floor || !room) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let photoPath = null;

  try {
    // 1. Upload photo if present
    if (file) {
      const ext = path.extname(file.originalname) || '.jpg';
      photoPath = `${req.user.id}/${randomUUID()}${ext}`;
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(photoPath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) throw uploadError;
    }

    // 2. Find or create location
    let locationId;
    const { data: existingLoc } = await supabaseAdmin
      .from('locations')
      .select('id')
      .eq('building', building)
      .eq('floor', floor)
      .eq('room', room)
      .single();

    if (existingLoc) {
      locationId = existingLoc.id;
    } else {
      const { data: newLoc, error: locError } = await supabaseAdmin
        .from('locations')
        .insert({ building, floor, room })
        .select('id')
        .single();
      if (locError) throw locError;
      locationId = newLoc.id;
    }

    // 3. Create Ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .insert({
        title: `${category} Issue at ${building}`,
        description,
        category,
        location_id: locationId,
        status: 'pending',
        photo_url: photoPath,
        submitted_by: req.user.id,
      })
      .select('*')
      .single();

    if (ticketError) {
      if (photoPath) await supabaseAdmin.storage.from(BUCKET).remove([photoPath]);
      throw ticketError;
    }

    // 4. Log status change
    await supabaseAdmin.from('ticket_status_log').insert({
      ticket_id: ticket.id,
      status: 'pending',
      changed_by: req.user.id
    });

    res.status(201).json({ message: 'Ticket created', ticket });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getAllIssues = async (req, res) => {
  const { status, category } = req.query;
  try {
    let query = supabaseAdmin
      .from('tickets')
      .select('*, locations(*), submitter:community_members!submitted_by(name), worker:workers!assigned_to(name)')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);

    const { data: tickets, error } = await query;
    if (error) throw error;

    const withUrls = await Promise.all(tickets.map(async (t) => ({
      ...t,
      photo_url: await getSignedUrl(t.photo_url),
      completion_photo_url: await getSignedUrl(t.completion_photo_url),
    })));

    res.status(200).json({ issues: withUrls });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyIssues = async (req, res) => {
  try {
    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select('*, locations(*)')
      .eq('submitted_by', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const withUrls = await Promise.all(tickets.map(async (t) => ({
      ...t,
      photo_url: await getSignedUrl(t.photo_url),
      completion_photo_url: await getSignedUrl(t.completion_photo_url),
    })));

    res.status(200).json({ issues: withUrls });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getIssueById = async (req, res) => {
  try {
    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .select('*, locations(*), submitter:community_members!submitted_by(id, name), worker:workers!assigned_to(id, name), ticket_status_log(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !ticket) return res.status(404).json({ error: 'Ticket not found' });

    res.status(200).json({
      issue: {
        ...ticket,
        photo_url: await getSignedUrl(ticket.photo_url),
        completion_photo_url: await getSignedUrl(ticket.completion_photo_url),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .update({ status })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;

    await supabaseAdmin.from('ticket_status_log').insert({
      ticket_id: ticket.id,
      status: status,
      changed_by: req.user.id
    });

    res.status(200).json({ message: 'Status updated', ticket });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const assignIssue = async (req, res) => {
  const { workerId } = req.body;
  if (!workerId) return res.status(400).json({ error: 'workerId is required' });

  try {
    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .update({ assigned_to: workerId, status: 'pending' })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;

    await supabaseAdmin.from('ticket_status_log').insert({
      ticket_id: ticket.id,
      status: 'assigned',
      changed_by: req.user.id
    });

    res.status(200).json({ message: 'Ticket assigned', ticket });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  createIssue,
  getAllIssues,
  getMyIssues,
  getIssueById,
  updateStatus,
  assignIssue,
};

