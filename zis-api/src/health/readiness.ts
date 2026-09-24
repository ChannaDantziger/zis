export type ReadinessCheck = () => Promise<void>;

export interface ReadinessResult {
  ready: boolean;
  checks: Record<string, 'ok' | 'failed'>;
}

export async function checkReadiness(checks: Record<string, ReadinessCheck>): Promise<ReadinessResult> {
  const entries = await Promise.all(Object.entries(checks).map(async ([name, check]) => {
    try {
      await check();
      return [name, 'ok'] as const;
    } catch {
      return [name, 'failed'] as const;
    }
  }));

  const checkResults = Object.fromEntries(entries) as Record<string, 'ok' | 'failed'>;
  return {
    ready: Object.values(checkResults).every((status) => status === 'ok'),
    checks: checkResults,
  };
}
