/**
 * Shim for elkjs in standalone builds.
 * elkjs is loaded via CDN <script> tag which sets window.ELK.
 * This module re-exports it so bundled imports resolve correctly.
 */

// @ts-expect-error — ELK is set by CDN script tag
const ELK = window.ELK;
export default ELK;
