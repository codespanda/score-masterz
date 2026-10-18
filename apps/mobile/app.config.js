// Extends app.json. EXPO_BASE_URL is set by the GitHub Pages workflow so the
// web build works under /<repo>/app; it is empty for local development.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL || undefined,
  },
});
