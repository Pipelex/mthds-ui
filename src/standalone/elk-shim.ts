/**
 * Shim for elkjs in standalone builds.
 * elkjs is loaded via CDN <script> tag which sets window.ELK.
 * This module re-exports it so bundled imports resolve correctly.
 */

declare global {
  interface Window {
    ELK: unknown;
  }
}

const ELK = window.ELK;
export default ELK;
