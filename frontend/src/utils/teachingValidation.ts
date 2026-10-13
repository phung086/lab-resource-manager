export type TeachingAction = 'create' | 'member' | 'submit' | 'revise' | 'review';
export function validateTeachingAction(action: TeachingAction, values: Record<string, string>, bookingIds: string[] = []) {
  const errors: Record<string, string> = {}, data: Record<string, string> = {};
  const text = (field: string, min: number, max: number, key: string) => { data[field] = (values[field] || '').trim(); if (data[field].length < min || data[field].length > max) errors[field] = key; };
  const email = (field: string) => { data[field] = (values[field] || '').trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[field])) errors[field] = 'ui.teaching.emailInvalid'; };
  if (action === 'create') { text('code', 2, 40, 'ui.teaching.codeLength'); text('term', 2, 80, 'ui.teaching.termLength'); text('name', 3, 160, 'ui.teaching.nameLength'); email('lecturerEmail'); }
  if (action === 'member') email('email');
  if (action === 'submit' || action === 'revise') text('learningGoal', 10, 1000, 'ui.teaching.goalLength');
  if (action === 'submit') { data.bookingId = values.bookingId || ''; if (!bookingIds.includes(data.bookingId)) errors.bookingId = 'ui.teaching.bookingRequired'; }
  if (action === 'review') { text('feedback', 5, 1000, 'ui.teaching.feedbackLength'); data.decision = values.decision || ''; if (!['ENDORSED', 'CHANGES_REQUESTED'].includes(data.decision)) errors.decision = 'ui.teaching.decisionRequired'; }
  return { errors, data: Object.keys(errors).length ? null : data };
}
