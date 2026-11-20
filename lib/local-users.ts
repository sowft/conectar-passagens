import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type LocalUser = {
  id: string;
  nome: string;
  email: string;
  password_hash: string;
  created_at: string;
};

const dataDir = path.join(process.cwd(), ".local-data");
const usersFile = path.join(dataDir, "usuarios.json");

async function readUsers() {
  try {
    const content = await readFile(usersFile, "utf8");
    return JSON.parse(content) as LocalUser[];
  } catch {
    return [];
  }
}

async function writeUsers(users: LocalUser[]) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(usersFile, JSON.stringify(users, null, 2), "utf8");
}

export async function findLocalUser(email: string, passwordHash: string) {
  const users = await readUsers();
  return users.find(
    (user) => user.email === email && user.password_hash === passwordHash,
  );
}

export async function createLocalUser({
  nome,
  email,
  passwordHash,
}: {
  nome: string;
  email: string;
  passwordHash: string;
}) {
  const users = await readUsers();
  const existing = users.find((user) => user.email === email);

  if (existing) {
    throw new Error("E-mail ja cadastrado.");
  }

  const user: LocalUser = {
    id: crypto.randomUUID(),
    nome,
    email,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  };

  users.push(user);
  await writeUsers(users);

  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
  };
}
