declare module 'asana' {
  interface Client {
    tasks: {
      create(data: any): Promise<any>;
    };
    workspaces: {
      getWorkspaces(): Promise<{data: Array<{gid: string}>}>;
    };
    useAccessToken(token: string): Client;
  }

  export default {
    Client: {
      create(options?: {defaultHeaders?: Record<string, string>}): Client;
    }
  };
} 