import type { ImpactType, MilestoneStatus } from '../store/types';

export const IMPACT_TYPES: ImpactType[] = [
  'AR Days Reduction',
  'Denial Rate Reduction',
  'Cash Recovery',
  'Clean Claim Rate',
  'Authorization Rate',
  'Cost Savings',
  'FTE Efficiency',
  'Other',
];

export const EHR_OPTIONS = ['Epic', 'Cerner', 'Meditech', 'Star', 'Allscripts', 'athenahealth', 'Other'] as const;

export const ENGAGEMENT_TYPES = ['Implementation', 'Assessment'] as const;

export const PROJECT_STATUSES = ['On Track', 'At Risk', 'Off Track', 'Complete'] as const;

export const MILESTONE_STATUSES: MilestoneStatus[] = ['notstarted', 'inprogress', 'atrisk', 'complete'];

export const statusLabels: Record<string, string> = {
  complete:   'Complete',
  inprogress: 'In Progress',
  notstarted: 'Not Started',
  atrisk:     'At Risk',
};

export const raidStatusLabels: Record<string, string> = {
  open:       'Open',
  inprogress: 'In Progress',
  closed:     'Closed',
};

export const LS_VERSION = '2026-03-24-v21';
export const LS_KEY = 'meridian_state';
export const THEME_KEY = 'rc_tracker_theme';
