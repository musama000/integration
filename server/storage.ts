import { users, tokens, type User, type InsertUser, type Token, type InsertToken } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getTokens(userId: number): Promise<Token[]>;
  createToken(token: InsertToken): Promise<Token>;
  deactivateToken(id: number, userId: number): Promise<void>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getTokens(userId: number): Promise<Token[]> {
    return db.select().from(tokens).where(eq(tokens.userId, userId));
  }

  async createToken(insertToken: InsertToken): Promise<Token> {
    const [token] = await db.insert(tokens).values(insertToken).returning();
    return token;
  }

  async deactivateToken(id: number, userId: number): Promise<void> {
    await db
      .update(tokens)
      .set({ active: false })
      .where(
        and(
          eq(tokens.id, id),
          eq(tokens.userId, userId)
        )
      );
  }
}

export const storage = new DatabaseStorage();