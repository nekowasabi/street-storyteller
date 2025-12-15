export type SessionMessage = {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
  readonly timestamp: number;
};

export class SessionContext {
  private readonly history: SessionMessage[] = [];

  addMessage(role: SessionMessage["role"], content: string): void {
    this.history.push({ role, content, timestamp: Date.now() });
  }

  getHistory(): readonly SessionMessage[] {
    return this.history;
  }

  clear(): void {
    this.history.length = 0;
  }
}
