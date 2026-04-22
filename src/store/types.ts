export interface AppState {
  activeProject: number;
  projects: Project[];
  supabaseIds: string[]; // parallel array — supabaseIds[i] is the Supabase UUID for projects[i]
}

export interface Project {
  config: ProjectConfig;
  milestones: Milestone[];
  activeFilter: string;
  editingId: string | null;
  activeRaidTab: 'all' | 'risk' | 'action' | 'issue' | 'dependency';
  raid: RaidItem[];
  decisions: DecisionItem[];
  tasksFilterWs: string;
  tasksFilterStatus: 'all' | 'done' | 'todo';
}

export interface ProjectConfig {
  clientName: string;
  ehr: 'Epic' | 'Cerner' | 'Meditech' | 'Star' | 'Allscripts' | 'athenahealth' | 'Other';
  ehrCustom: string;
  engagementType: 'Implementation' | 'Assessment';
  projectStatus: 'On Track' | 'At Risk' | 'Off Track' | 'Complete';
  startDate: string;
  managingDirector: string;
  lead: string;
  payers: string[];
  denials: string[];
  roles: Role[];
  workstreams: Workstream[];
}

export interface Role {
  key: string;
  clientRole: string;
}

export type WorkstreamColor = 'blue' | 'green' | 'purple' | 'amber' | 'coral' | 'teal' | 'pink' | 'red';

export interface Workstream {
  id: string;
  label: string;
  color: WorkstreamColor;
  amOwner: string;
  note?: string;
  noteExport?: boolean;
}

export type MilestoneStatus = 'notstarted' | 'inprogress' | 'atrisk' | 'complete';

export interface Milestone {
  id: string;
  title: string;
  workstream: string;
  status: MilestoneStatus;
  owner: string;
  dueDate: string;
  tasks: Task[];
  impact: ImpactItem[];
  note: string;
  noteExport: boolean;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  startDate: string;
  endDate: string;
  note: string;
  owner: string;
  subtasks: Subtask[];
  predecessors: string[];
}

export interface Subtask {
  id: string;
  text: string;
  done: boolean;
  owner: string;
  startDate: string;
  endDate: string;
}

export type ImpactType =
  | 'AR Days Reduction'
  | 'Denial Rate Reduction'
  | 'Cash Recovery'
  | 'Clean Claim Rate'
  | 'Authorization Rate'
  | 'Cost Savings'
  | 'FTE Efficiency'
  | 'Other'
  | '';

export interface ImpactItem {
  type: ImpactType;
  projected: string;
  realized: string;
}

export type RaidType = 'risk' | 'action' | 'issue' | 'dependency';
export type RaidStatus = 'open' | 'inprogress' | 'closed';
export type RaidPriority = 'high' | 'medium' | 'low';

export interface RaidItem {
  id: string;
  type: RaidType;
  priority: RaidPriority;
  title: string;
  description: string;
  mitigation: string;
  owner: string;
  dueDate: string;
  status: RaidStatus;
  linkedTasks: string[];
}

export type DecisionStatus = 'approved' | 'pending' | 'deferred';

export interface DecisionItem {
  id: string;
  title: string;
  description: string;
  rationale: string;
  alternatives: string;
  owner: string;
  date: string;
  status: DecisionStatus;
  linkedTasks: string[];
}

export interface FlatTask {
  tid: string;
  mid: string;
  wbs: string;
  text: string;
  milestoneTitle: string;
}
