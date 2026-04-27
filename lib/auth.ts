import { loadUsers, User } from './userData';

export async function requireLogin(req: Request): Promise<User | null> {
  const userId = req.headers.get('x-user-id');
  if (!userId) return null;
  const users = await loadUsers();
  return users.find(u => u.id === userId) ?? null;
}

export async function requireAdmin(req: Request): Promise<User | null> {
  const user = await requireLogin(req);
  if (!user || user.role !== 'admin') return null;
  return user;
}

export function noCacheHeaders() {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  };
}
