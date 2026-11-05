type AdminClientFactory = (supabaseUrl: string, serviceRoleKey: string) => unknown;

export function buildAdminUsersHandler(options: {
  createAdminClient: AdminClientFactory;
}): (request: unknown, response: unknown) => Promise<void>;
