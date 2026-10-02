/**
 * MachineRegistry.js
 * 
 * SINGLE SOURCE OF TRUTH for all machine definitions.
 * This registry is STATIC and NEVER MUTATED.
 * 
 * Each machine has:
 * - id: stable, human-readable identifier (e.g., "cnc-mill-1")
 * - name: exact display name
 * 
 * NO health state stored here - health state is ALWAYS derived from sensor values.
 */

const MACHINE_REGISTRY = [
  {
    id: 'cnc-milling-machine',
    name: 'CNC Milling Machine'
  },
  {
    id: 'industrial-cooling-pump',
    name: 'Industrial Cooling Pump'
  },
  {
    id: 'conveyor-drive-motor',
    name: 'Conveyor Drive Motor'
  },
  {
    id: 'air-compressor-unit',
    name: 'Air Compressor Unit'
  }
];

/**
 * Get all machines from the registry
 * @returns {Array} Array of machine definitions
 */
export function getAllMachines() {
  return MACHINE_REGISTRY;
}

/**
 * Get a specific machine by ID
 * @param {string} machineId - The machine ID to look up
 * @returns {Object|null} Machine definition or null if not found
 */
export function getMachineById(machineId) {
  return MACHINE_REGISTRY.find(m => m.id === machineId) || null;
}

/**
 * Check if a machine ID exists in the registry
 * @param {string} machineId - The machine ID to check
 * @returns {boolean} True if machine exists
 */
export function machineExists(machineId) {
  return MACHINE_REGISTRY.some(m => m.id === machineId);
}

export default MACHINE_REGISTRY;
