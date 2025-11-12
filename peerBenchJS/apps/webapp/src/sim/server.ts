/**
 * Server-only exports for the simulation module
 *
 * This file is used in API routes and server components only.
 * It includes database operations that should not be bundled for the client.
 *
 * @module server-only
 */

import 'server-only';

// Re-export types (safe for both client and server)
export type * from './types';

// Export core simulation
export { runSimulation } from './core/simulation';

// Export database operations (server-only)
export {
  createSimulatedUser,
  getOrganizationsWithDomains,
  getRandomOrgWithDomain,
  generateSimulatedEmail,
  batchCreateSimulatedUsers,
} from './db/user-creation';

// Export LLM generators (server-only)
export {
  generatePersonality,
  generateBenchmarkIdea,
  generatePrompts,
} from './llm/generators';

// Export realistic simulation
export { runRealisticSimulation } from './llm/realistic-simulation';
