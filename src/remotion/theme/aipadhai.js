// src/remotion/theme/aipadhai.js — AI Padhai brand tokens
// Single place to change the channel look. Matches the CCA-F deck design system.
import { FONT_STACK } from '../utils/fonts.js';

export const AIP = {
  bgDark: '#12151D',
  chipBg: '#1C2130',
  chipBorder: '#2A3145',
  bgLight: '#FFFFFF',
  card: '#F4F5F7',
  ink: '#1E2430',
  muted: '#6B7280',
  subtle: '#C9CFDA',
  faint: '#8B93A3',
  orange: '#E86A17',
  orangeTint: '#FDEFE3',
  orangeDeep: '#9A4A0E',
  blue: '#2563EB',
  green: '#0F9D58',
  purple: '#7C3AED',
  red: '#B91C1C',
  redTint: '#FBEFEF',
  greenTint: '#EDF7F0',
  codeBg: '#1E2430',
  codeText: '#E8ECF3',
  codeKey: '#7FB5FF',
  codeStr: '#8FD9A8',
  font: FONT_STACK,
  mono: "'Courier New', ui-monospace, monospace",
};

/** Persistent top-right channel badge, used by all AI Padhai scenes */
export const badgeStyle = {
  position: 'absolute',
  top: 40,
  right: 48,
  border: `2px solid ${AIP.orange}`,
  borderRadius: 40,
  padding: '8px 26px',
  color: AIP.orange,
  fontWeight: 700,
  fontSize: 26,
  fontFamily: FONT_STACK,
  letterSpacing: 0.5,
  background: 'rgba(18,21,29,0.35)',
};
