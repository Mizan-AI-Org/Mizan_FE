export type ResponseOption = 'YES' | 'NO' | 'NA';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EvidenceAttachment {
  id: string;
  type: 'photo' | 'video' | 'note' | 'signature';
  url?: string;
  note?: string;
  createdAt: string; // ISO timestamp
  metadata?: Record<string, unknown>;
}

export interface MeasurementField {
  label: string;
  unit?: string;
  value?: number;
  min?: number;
  max?: number;
  thresholdType?: 'min' | 'max' | 'range';
}

export interface StepDefinition {
  id: string;
  title: string;
  instruction?: string;
  requiresPhoto?: boolean;
  requiresVideo?: boolean;
  requiresSignature?: boolean;
  measurements?: MeasurementField[];
  // Basic conditional logic: if response === value then goTo step id
  conditional?: Array<{ when: ResponseOption; goToStepId: string }>;
  estimatedSeconds?: number;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description?: string;
  steps: StepDefinition[];
  category?: string; // e.g., Opening, Closing, Food Safety
}

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  priority: PriorityLevel;
  dueDate?: string; // ISO date
  assigneeId?: string;
  locationId?: string;
  labels?: string[];
  visibility?: 'private' | 'team' | 'org';
}

export interface StepResponse {
  stepId: string;
  response?: ResponseOption;
  respondedAt?: string; // ISO timestamp
  evidence: EvidenceAttachment[];
  measurements?: MeasurementField[];
}

export interface ExecutionRecord {
  templateId: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  currentIndex: number;
  stepResponses: StepResponse[];
  actions: ActionItem[];
  offline?: boolean;
}

export const emptyExecution = (templateId: string): ExecutionRecord => ({
  templateId,
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  currentIndex: 0,
  stepResponses: [],
  actions: [],
});