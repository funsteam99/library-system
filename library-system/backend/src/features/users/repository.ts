import { query } from "../../db/pool.js";

export type UserRow = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "staff";
  status: "active" | "inactive";
};

export async function getUserById(id: number) {
  const result = await query<UserRow>(
    `SELECT id::int AS id, username, name, role, status
     FROM users
     WHERE id = $1`,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function listActiveUsers() {
  const result = await query<UserRow>(
    `SELECT id::int AS id, username, name, role, status
     FROM users
     WHERE status = 'active'
     ORDER BY
       CASE role WHEN 'admin' THEN 0 ELSE 1 END,
       name ASC,
       id ASC`,
  );

  return result.rows;
}
