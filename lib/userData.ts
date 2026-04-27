import { readJson, writeJson } from './blob';

export interface User {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string;
  password: string;
  role: 'admin' | 'team_manager' | 'ops_support' | 'rep';
  teamId: string | null;
  forcePasswordChange: boolean;
  profilePicKey: string | null;
  createdAt: string;
}

const KEY = 'users.json';

export async function loadUsers(): Promise<User[]> {
  return readJson<User[]>(KEY, []);
}

export async function saveUsers(users: User[]): Promise<void> {
  await writeJson(KEY, users);
}
