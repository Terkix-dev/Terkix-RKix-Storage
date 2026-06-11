export type ProjectStatus = 'Active' | 'Development' | 'Testing' | 'Maintenance' | 'Archived';

export interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: string;
  repoUrl: string;
  size: number; // in MB
  tags: string[];
  createdAt: string;
  updatedAt: string;
  branches: string[];
  currentBranch: string;
  commits: Commit[];
}

export interface StorageNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number; // in KB
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
  children?: StorageNode[];
}

export interface BackupLog {
  id: string;
  name: string;
  projectId?: string;
  projectName?: string;
  type: 'Full' | 'Incremental' | 'Snapshot';
  size: number; // in MB
  date: string;
  status: 'Success' | 'Failed';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  date: string;
  read: boolean;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
  ip: string;
}

export interface StorageStats {
  totalCapacityGb: number;
  usedGb: number;
  byCategory: {
    active: number;
    archived: number;
    backups: number;
    templates: number;
    trash: number;
  };
  byType: {
    code: number;
    images: number;
    configs: number;
    archives: number;
    others: number;
  };
  history: {
    date: string;
    usedGb: number;
  }[];
}

export interface ArchiveBundle {
  id: string;
  archiveName: string;
  totalCompressedSizeMb: number;
  filesCount: number;
  projectNames: string[];
  createdAt: string;
}

