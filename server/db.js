import pg from 'pg';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

let pool;
let sqliteDb;

const isProduction = !!process.env.DATABASE_URL;

if (isProduction) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    const dbPath = path.resolve('local.db');
    sqliteDb = new Database(dbPath);
    sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS user_data (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
}

export const getValue = async (key) => {
    if (isProduction) {
        const res = await pool.query('SELECT value FROM user_data WHERE key = $1', [key]);
        return res.rows[0]?.value ? JSON.parse(res.rows[0].value) : null;
    } else {
        const row = sqliteDb.prepare('SELECT value FROM user_data WHERE key = ?').get(key);
        return row?.value ? JSON.parse(row.value) : null;
    }
};

export const setValue = async (key, value) => {
    const jsonValue = JSON.stringify(value);
    if (isProduction) {
        await pool.query(
            'INSERT INTO user_data (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            [key, jsonValue]
        );
    } else {
        sqliteDb.prepare(
            'INSERT INTO user_data (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
        ).run(key, jsonValue, jsonValue);
    }
};

export const getAllData = async () => {
    if (isProduction) {
        const res = await pool.query('SELECT key, value FROM user_data');
        return res.rows.reduce((acc, row) => {
            acc[row.key] = JSON.parse(row.value);
            return acc;
        }, {});
    } else {
        const rows = sqliteDb.prepare('SELECT key, value FROM user_data').all();
        return rows.reduce((acc, row) => {
            acc[row.key] = JSON.parse(row.value);
            return acc;
        }, {});
    }
};
