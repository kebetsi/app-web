var _ = require('underscore');

/**
 * Theme definitions.
 * Properties for each theme:
 * - `id`: must be lowercase and match the theme's folder name
 * - `appName` (optional): used e.g. to override the page title
 * - `favicon` (optional): the favicon's relative path from the theme's folder (e.g. "favicon.ico")
 */
module.exports = _.reduce([
  {
    id: 'domo',
    appName: 'Domo Safety',
    favicon: 'favicon.png'
  }
], function (map, theme) { map[theme.id] = theme; return map; }, {});
