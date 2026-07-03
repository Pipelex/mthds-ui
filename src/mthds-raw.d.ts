// Vite `?raw` imports of `.mthds` bundle fixtures (used by dev stories to
// feed the static graph builder with real TOML text).
declare module "*.mthds?raw" {
  const content: string;
  export default content;
}
