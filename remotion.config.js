// remotion.config.js — Studio + CLI webpack overrides
import { Config } from '@remotion/cli/config';

Config.overrideWebpackConfig((config) => {
  config.module.rules.push({
    test: /\.(ttf|otf|woff2?)$/i,
    type: 'asset/inline',
  });
  return config;
});
