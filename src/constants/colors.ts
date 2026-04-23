import type { WorkstreamColor } from '../store/types';

export const colorMap: Record<WorkstreamColor, { bg: string; text: string }> = {
  blue:   { bg: '#ddf1fc', text: '#0085CA' },
  green:  { bg: '#e8f5e8', text: '#29702A' },
  purple: { bg: '#f0e8f3', text: '#470858' },
  amber:  { bg: '#fff3d6', text: '#CF7F00' },
  coral:  { bg: '#fceaed', text: '#A6192E' },
  teal:   { bg: '#ddf2f6', text: '#00677F' },
  pink:   { bg: '#fde7f5', text: '#C8187D' },
  red:    { bg: '#fceaed', text: '#A6192E' },
};

export const wsColorHex: Record<WorkstreamColor, string> = {
  blue:   '#0085CA',
  green:  '#29702A',
  purple: '#470858',
  amber:  '#CF7F00',
  coral:  '#A6192E',
  teal:   '#00677F',
  pink:   '#C8187D',
  red:    '#A6192E',
};

export const statusColors: Record<string, string> = {
  complete:   '#29702A',
  inprogress: '#0085CA',
  notstarted: '#646464',
  atrisk:     '#A6192E',
};

export const statusBgColors: Record<string, string> = {
  complete:   '#e8f5e8',
  inprogress: '#fff3d6',
  notstarted: '#edf1f5',
  atrisk:     '#fceaed',
};

export const raidTypeColors: Record<string, { bg: string; text: string }> = {
  risk:       { bg: '#fceaed', text: '#A6192E' },
  action:     { bg: '#ddf1fc', text: '#0085CA' },
  issue:      { bg: '#fff3d6', text: '#CF7F00' },
  dependency: { bg: '#f0e8f3', text: '#470858' },
};
