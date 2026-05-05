import { readJson, writeJson } from './blob';

export interface User {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string;
  password: string;
  role: 'admin' | 'team_manager' | 'ops_support' | 'rep';
  status: 'active' | 'exited';
  teamIds: string[];
  forcePasswordChange: boolean;
  profilePicKey: string | null;
  createdAt: string;
}

const KEY = 'users.json';

export async function loadUsers(): Promise<User[]> {
  const users = await readJson<User[]>(KEY, []);
  // Backfill status for users created before this field existed
  for (const u of users) {
    if (!u.status) u.status = 'active';
  }
  return users;
}

export async function saveUsers(users: User[]): Promise<void> {
  await writeJson(KEY, users);
}
