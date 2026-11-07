// A D1-compatible database object backed by Postgres, so worker/index.js runs on
// Vercel + Supabase without changes. It implements the subset the Worker uses:
// prepare(sql).bind(...).first() / .all() / .run(), and batch([...]) as one transaction.
//
// An "executor" does the actual querying: { query(text, params) -> {rows, count},
// transaction(fn) }. postgresExecutor() wraps the postgres package for production;
// tests pass a PGlite executor.

// Convert SQLite-style ? placeholders to Postgres $1, $2, ... outside quoted text.
export function toPostgresPlaceholders(sql) {
  let out = '';
  let n = 0;
  let quote = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (quote) {
      out += c;
      if (c === quote) {
        if (sql[i + 1] === quote) { out += sql[++i]; } else { quote = null; }
      }
    } else if (c === "'" || c === '"') {
      quote = c;
      out += c;
    } else if (c === '?') {
      out += '$' + (++n);
    } else {
      out += c;
    }
  }
  return out;
}

const normalizeRow = row => {
  if (!row) return row;
  const copy = {};
  for (const [key, value] of Object.entries(row)) copy[key] = typeof value === 'bigint' ? Number(value) : value;
  return copy;
};

export function d1FromExecutor(executor) {
  const exec = async (runner, statement) => {
    const result = await runner.query(toPostgresPlaceholders(statement.sql), statement.params);
    return { rows: (result.rows || []).map(normalizeRow), count: result.count ?? 0 };
  };
  class Statement {
    constructor(sql, params = []) { this.sql = sql; this.params = params; }
    bind(...params) { return new Statement(this.sql, params.map(p => (p === undefined ? null : p))); }
    async first(column) {
      const { rows } = await exec(executor, this);
      const row = rows[0] ?? null;
      return column && row ? row[column] ?? null : row;
    }
    async all() {
      const { rows } = await exec(executor, this);
      return { success: true, results: rows, meta: {} };
    }
    async run() {
      const { count } = await exec(executor, this);
      return { success: true, meta: { changes: count } };
    }
  }
  return {
    prepare: sql => new Statement(sql),
    batch: statements => executor.transaction(async tx => {
      const results = [];
      for (const statement of statements) {
        const { rows, count } = await exec(tx, statement);
        results.push({ success: true, results: rows, meta: { changes: count } });
      }
      return results;
    })
  };
}

// Production executor: the postgres package against Supabase.
// Use the Supabase pooler connection string (transaction mode, port 6543); prepared
// statements are off because the transaction pooler does not support them.
export async function postgresExecutor(connectionString) {
  const { default: postgres } = await import('postgres');
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  const sql = postgres(connectionString, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: local ? false : 'require',
    types: { bigint: { to: 20, from: [20], serialize: x => String(x), parse: x => Number(x) } }
  });
  const wrap = runner => ({
    async query(text, params) {
      const result = await runner.unsafe(text, params);
      return { rows: Array.from(result), count: result.count };
    }
  });
  return { ...wrap(sql), transaction: fn => sql.begin(tx => fn(wrap(tx))) };
}
