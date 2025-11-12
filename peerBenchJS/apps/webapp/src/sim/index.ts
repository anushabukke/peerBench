/**
 * Simulation Module (Client-Safe Exports)
 *
 * This file exports only client-safe types and constants.
 * For server-side operations (database, LLM calls), import from '@/sim/server'
 * For client-side in-memory simulations, import from '@/sim/client'
 *
 * Provides simulation capabilities for generating test data:
 * - Simple personas (altruistic, greedy, cabal, random, malicious)
 * - Realistic LLM-generated personalities and benchmarks
 * - In-memory or database-persisted simulations
 */

// Export types only (safe for client)
export * from './types';

// Re-export client simulation for convenience
export { runSimpleSimulation } from './client';

// Note: For server-side simulation functions, import from '@/sim/server'
// Example: import { runSimulation } from '@/sim/server';
