import { apiGet, apiPost, apiPut } from './client';

export async function createIssue(formData) {
  return apiPost('/issues', formData, {
    isFormData: true,
  });
}
// GET /api/issues/my
export async function getMyIssues() {
  return apiGet('/issues/my');
}

// GET /api/issues (admin/facility_manager)
export async function getAllIssues() {
  return apiGet('/issues');
}

// GET /api/issues/:id
export async function getIssueById(id) {
  return apiGet(`/issues/${id}`);
}

// PUT /api/issues/:id/status
export async function updateIssueStatus(id, data) {
  return apiPut(`/issues/${id}/status`, data);
}

// PUT /api/issues/:id/assign
export async function assignIssue(id, workerId) {
  return apiPut(`/issues/${id}/assign`, { workerId });
}

// POST /api/issues/:id/comments
export async function addComment(id, body) {
  return apiPost(`/issues/${id}/comments`, { body });
}

// POST /api/issues/:id/photo (completion)
export async function uploadCompletionPhoto(id, formData) {
  return apiPost(`/issues/${id}/photo`, formData, {
    isFormData: true,
  });
}