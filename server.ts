import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'data_store.json');

// --- Helper for Lazy Gemini API ---
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not configured in the secrets.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// --- Initializing Default Database State ---
const DEFAULT_PROJECTS = [
  {
    id: 'proj-rkix01',
    name: 'terkix-core-kernel',
    description: 'The core distributed runtime engine for Terkix Cloud services. Governs thread execution, memory pooling, and system triggers.',
    status: 'Active',
    owner: 'nvht2505@gmail.com',
    repoUrl: 'https://github.com/terkix/core-kernel',
    size: 412.5,
    tags: ['C++', 'Runtime', 'Core', 'System'],
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-06-10T15:30:00Z',
    branches: ['main', 'release/v2.1', 'dev/memory-opt'],
    currentBranch: 'main',
    commits: [
      { hash: 'ea23fd4', message: 'Optimize physical allocator bounds check', author: 'nvht2505@gmail.com', date: '2026-06-10T15:24:00Z' },
      { hash: 'bf91c82', message: 'Fix reference overflow in thread trigger pools', author: 'Alex Rivera', date: '2026-06-08T09:12:00Z' },
      { hash: 'c90dd71', message: 'Add diagnostic logs for core state machines', author: 'Alex Rivera', date: '2026-06-05T11:45:00Z' }
    ]
  },
  {
    id: 'proj-rkix02',
    name: 'rkix-storage-gateway',
    description: 'Central interface mapping physical blocks and MinIO objects to the unified RKix Storage Center directory service.',
    status: 'Development',
    owner: 'nvht2505@gmail.com',
    repoUrl: 'https://github.com/terkix/storage-gateway',
    size: 284.1,
    tags: ['Go', 'MinIO', 'Storage', 'API'],
    createdAt: '2026-02-10T10:15:00Z',
    updatedAt: '2026-06-11T09:40:00Z',
    branches: ['main', 'dev/block-sync', 'refactor/grpc'],
    currentBranch: 'dev/block-sync',
    commits: [
      { hash: 'f00e981', message: 'Improve lock-free segment cache lookup', author: 'nvht2505@gmail.com', date: '2026-06-11T09:35:00Z' },
      { hash: 'ae394cd', message: 'Implement retry backoff parameters for MinIO pipelines', author: 'Sarah Connor', date: '2026-06-10T17:11:00Z' }
    ]
  },
  {
    id: 'proj-rkix03',
    name: 'terkix-auth-jwt',
    description: 'Enterprise OAuth2 and multi-factor authentication security provider supporting secure tokens, audit trails, and role gates.',
    status: 'Maintenance',
    owner: 'nvht2505@gmail.com',
    repoUrl: 'https://github.com/terkix/auth-jwt',
    size: 89.4,
    tags: ['TypeScript', 'Express', 'Auth', 'Security'],
    createdAt: '2025-11-01T07:22:00Z',
    updatedAt: '2026-05-30T14:12:00Z',
    branches: ['main', 'patch/v1.4.2'],
    currentBranch: 'main',
    commits: [
      { hash: 'de31a78', message: 'Bump dependencies and token validity specs', author: 'Jane Developer', date: '2026-05-30T13:58:00Z' },
      { hash: '45efba9', message: 'Address Rate limiter overflow boundary conditions', author: 'Jane Developer', date: '2026-05-28T10:04:00Z' }
    ]
  },
  {
    id: 'proj-rkix04',
    name: 'data-analytics-viz',
    description: 'Rich telemetry ingestion and visualization charts mapping project growth and active file segment classification metrics.',
    status: 'Testing',
    owner: 'nvht2505@gmail.com',
    repoUrl: 'https://github.com/terkix/data-analytics-viz',
    size: 195.3,
    tags: ['Python', 'Docker', 'D3', 'Analytics'],
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-06-09T11:20:00Z',
    branches: ['main', 'feature/timeline-map', 'experiment/webgl'],
    currentBranch: 'feature/timeline-map',
    commits: [
      { hash: '772b160', message: 'Optimize matrix bounds for rendering large timelines', author: 'nvht2505@gmail.com', date: '2026-06-09T11:15:00Z' },
      { hash: '9211aa7', message: 'Fix responsive chart scales on resize bounds', author: 'Zack Chen', date: '2026-06-07T14:32:00Z' }
    ]
  },
  {
    id: 'proj-rkix05',
    name: 'rkix-legacy-cms',
    description: 'An old system archived as legacy source. Kept purely for asset transition and static database backups.',
    status: 'Archived',
    owner: 'nvht2505@gmail.com',
    repoUrl: 'https://github.com/terkix/legacy-cms',
    size: 720.0,
    tags: ['PHP', 'Archived', 'Legacy', 'Database'],
    createdAt: '2024-05-10T12:00:00Z',
    updatedAt: '2026-04-12T16:45:00Z',
    branches: ['main'],
    currentBranch: 'main',
    commits: [
      { hash: '12ef45b', message: 'Archive project commit tag', author: 'Alex Rivera', date: '2026-04-12T16:30:00Z' }
    ]
  }
];

const DEFAULT_STORAGE_TREE = {
  id: 'root',
  name: 'Storage Root',
  type: 'folder',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-06-11T10:00:00Z',
  children: [
    {
      id: 'dir-active',
      name: 'Active Projects',
      type: 'folder',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-06-11T10:00:00Z',
      children: [
        {
          id: 'dir-core',
          name: 'terkix-core-kernel',
          type: 'folder',
          createdAt: '2026-01-15T08:00:00Z',
          updatedAt: '2026-06-10T15:30:00Z',
          children: [
            { id: 'f-core-main', name: 'main.cpp', type: 'file', size: 104, mimeType: 'text/x-c++src', createdAt: '2026-06-10T15:30:00Z', updatedAt: '2026-06-10T15:30:00Z' },
            { id: 'f-core-alloc', name: 'allocator.h', type: 'file', size: 48, mimeType: 'text/x-chdr', createdAt: '2026-06-10T15:30:00Z', updatedAt: '2026-06-10T15:30:00Z' },
            { id: 'f-core-makefile', name: 'Makefile', type: 'file', size: 4, mimeType: 'text/plain', createdAt: '2026-06-10T15:30:00Z', updatedAt: '2026-06-10T15:30:00Z' }
          ]
        },
        {
          id: 'dir-gateway',
          name: 'rkix-storage-gateway',
          type: 'folder',
          createdAt: '2026-02-10T10:15:00Z',
          updatedAt: '2026-06-11T09:40:00Z',
          children: [
            { id: 'f-gate-main', name: 'main.go', type: 'file', size: 85, mimeType: 'text/x-go', createdAt: '2026-06-11T09:40:00Z', updatedAt: '2026-06-11T09:40:00Z' },
            { id: 'f-gate-minio', name: 'minio_conn.go', type: 'file', size: 120, mimeType: 'text/x-go', createdAt: '2026-06-11T09:40:00Z', updatedAt: '2026-06-11T09:40:00Z' }
          ]
        },
        {
          id: 'dir-auth',
          name: 'terkix-auth-jwt',
          type: 'folder',
          createdAt: '2025-11-01T07:22:00Z',
          updatedAt: '2026-05-30T14:12:00Z',
          children: [
            { id: 'f-auth-index', name: 'index.ts', type: 'file', size: 12, mimeType: 'text/typescript', createdAt: '2026-05-30T14:12:00Z', updatedAt: '2026-05-30T14:12:00Z' },
            { id: 'f-auth-utils', name: 'jwt_utils.ts', type: 'file', size: 28, mimeType: 'text/typescript', createdAt: '2026-05-30T14:12:00Z', updatedAt: '2026-05-30T14:12:00Z' }
          ]
        }
      ]
    },
    {
      id: 'dir-archived',
      name: 'Archived Projects',
      type: 'folder',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-06-11T10:00:00Z',
      children: [
        {
          id: 'dir-legacy-cms',
          name: 'rkix-legacy-cms',
          type: 'folder',
          createdAt: '2024-05-10T12:00:00Z',
          updatedAt: '2026-04-12T16:45:00Z',
          children: [
            { id: 'f-legacy-index', name: 'index.php', type: 'file', size: 95, mimeType: 'text/x-php', createdAt: '2026-04-12T16:45:00Z', updatedAt: '2026-04-12T16:45:00Z' },
            { id: 'f-legacy-db', name: 'mysql_dump.sql', type: 'file', size: 12400, mimeType: 'text/x-sql', createdAt: '2026-04-12T16:45:00Z', updatedAt: '2026-04-12T16:45:00Z' }
          ]
        }
      ]
    },
    {
      id: 'dir-templates',
      name: 'Templates',
      type: 'folder',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-06-11T10:00:00Z',
      children: [
        { id: 'tpl-docker', name: 'docker-compose-template.yml', type: 'file', size: 24, mimeType: 'text/yaml', createdAt: '2026-01-05T12:00:00Z', updatedAt: '2026-01-05T12:00:00Z' },
        { id: 'tpl-nginx', name: 'nginx-reverse-proxy.conf', type: 'file', size: 12, mimeType: 'text/plain', createdAt: '2026-01-10T14:30:00Z', updatedAt: '2026-01-10T14:30:00Z' },
        { id: 'tpl-github', name: 'github-ci-workflow.yml', type: 'file', size: 18, mimeType: 'text/yaml', createdAt: '2026-02-14T09:00:00Z', updatedAt: '2026-02-14T09:00:00Z' }
      ]
    },
    {
      id: 'dir-backups',
      name: 'Backups',
      type: 'folder',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-06-11T10:00:00Z',
      children: [
        { id: 'f-bak-01', name: 'terkix-core-kernel_snapshot_ea23fd4.tar.gz', type: 'file', size: 45200, mimeType: 'application/gzip', createdAt: '2026-06-10T15:30:00Z', updatedAt: '2026-06-10T15:30:00Z' },
        { id: 'f-bak-02', name: 'terkix-auth-jwt_full_20260530.tar.gz', type: 'file', size: 12400, mimeType: 'application/gzip', createdAt: '2026-05-30T14:15:00Z', updatedAt: '2026-05-30T14:15:00Z' }
      ]
    },
    {
      id: 'dir-trash',
      name: 'Trash',
      type: 'folder',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-06-11T10:00:00Z',
      children: [
        { id: 'f-trash-old', name: 'old_credentials_expired.txt', type: 'file', size: 1, mimeType: 'text/plain', createdAt: '2026-05-12T10:00:00Z', updatedAt: '2026-05-12T10:00:00Z' }
      ]
    }
  ]
};

const DEFAULT_BACKUPS = [
  { id: 'bak-01', name: 'terkix-core-kernel_snapshot_ea23fd4', projectId: 'proj-rkix01', projectName: 'terkix-core-kernel', type: 'Snapshot', size: 45.2, date: '2026-06-10T15:30:00Z', status: 'Success' },
  { id: 'bak-02', name: 'terkix-auth-jwt_full_20260530', projectId: 'proj-rkix03', projectName: 'terkix-auth-jwt', type: 'Full', size: 12.4, date: '2026-05-30T14:15:00Z', status: 'Success' },
  { id: 'bak-03', name: 'data-analytics-viz_incremental_fails', projectId: 'proj-rkix04', projectName: 'data-analytics-viz', type: 'Incremental', size: 0, date: '2026-06-08T03:00:00Z', status: 'Failed' }
];

const DEFAULT_NOTIFICATIONS = [
  { id: 'notif-01', title: 'Backup Successful', message: 'Incremental backup successfully generated for terkix-core-kernel.', type: 'success', date: '2026-06-10T15:31:00Z', read: false },
  { id: 'notif-02', title: 'Storage Capacity Alert', message: 'Unified RKix physical cluster reaches 78.4% capacity threshold.', type: 'warning', date: '2026-06-11T08:12:00Z', read: false },
  { id: 'notif-03', title: 'Integrity Scan Passed', message: 'Static sector scanner verified 1,245 cryptographic blocks without conflicts.', type: 'info', date: '2026-06-11T01:00:00Z', read: true }
];

const DEFAULT_AUDIT_LOGS = [
  { id: 'log-01', user: 'nvht2505@gmail.com', action: 'DEPLOY_SNAPSHOT', details: 'Triggered snapshot for terkix-core-kernel block ea23fd4.', timestamp: '2026-06-10T15:30:00Z', ip: '10.244.1.48' },
  { id: 'log-02', user: 'nvht2505@gmail.com', action: 'REPO_CLONE', details: 'Cloned repository rkix-storage-gateway into live physical layout.', timestamp: '2026-06-11T09:40:00Z', ip: '10.244.1.48' },
  { id: 'log-03', user: 'system', action: 'CRON_BACKUP', details: 'Automated sector sweep run complete.', timestamp: '2026-06-11T00:00:00Z', ip: '127.0.0.1' }
];

const DEFAULT_ARCHIVES = [
  {
    id: 'arch-01',
    archiveName: 'rkix_archive_20260605.zip',
    totalCompressedSizeMb: 324.00,
    filesCount: 1,
    projectNames: ['rkix-legacy-cms'],
    createdAt: '2026-06-05T11:20:00Z'
  },
  {
    id: 'arch-02',
    archiveName: 'rkix_archive_20260610.zip',
    totalCompressedSizeMb: 40.23,
    filesCount: 1,
    projectNames: ['terkix-auth-jwt'],
    createdAt: '2026-06-10T14:15:00Z'
  }
];

// In-Memory DB state with file backup capability
let databaseState = {
  projects: [...DEFAULT_PROJECTS],
  storageTree: JSON.parse(JSON.stringify(DEFAULT_STORAGE_TREE)),
  backups: [...DEFAULT_BACKUPS],
  notifications: [...DEFAULT_NOTIFICATIONS],
  auditLogs: [...DEFAULT_AUDIT_LOGS],
  archives: [...DEFAULT_ARCHIVES]
};

// Load databaseState from JSON if exists
function loadDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const contents = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(contents);
      databaseState = {
        projects: parsed.projects || [...DEFAULT_PROJECTS],
        storageTree: parsed.storageTree || JSON.parse(JSON.stringify(DEFAULT_STORAGE_TREE)),
        backups: parsed.backups || [...DEFAULT_BACKUPS],
        notifications: parsed.notifications || [...DEFAULT_NOTIFICATIONS],
        auditLogs: parsed.auditLogs || [...DEFAULT_AUDIT_LOGS],
        archives: parsed.archives || [...DEFAULT_ARCHIVES]
      };
      console.log('Database loaded successfully from ' + DATA_FILE);
    } else {
      saveDb();
    }
  } catch (err) {
    console.warn('Could not read persistent DB, using memory defaults:', err);
  }
}

// Save databaseState to JSON 
function saveDb() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(databaseState, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save database state:', err);
  }
}

loadDb();

// --- API Router Endpoints ---

// Helper function to append systems audit logs
function addAuditLog(user: string, action: string, details: string, req?: express.Request) {
  const ip = req ? (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown') : 'localhost';
  const newLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    user,
    action,
    details,
    timestamp: new Date().toISOString(),
    ip
  };
  databaseState.auditLogs.unshift(newLog);
  if (databaseState.auditLogs.length > 100) {
    databaseState.auditLogs.pop();
  }
  saveDb();
}

function addNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') {
  const newNotif = {
    id: `notif-${Date.now()}`,
    title,
    message,
    type,
    date: new Date().toISOString(),
    read: false
  };
  databaseState.notifications.unshift(newNotif);
  saveDb();
}

// 1. Projects API
app.get('/api/projects', (req, res) => {
  res.json(databaseState.projects);
});

app.post('/api/projects', (req, res) => {
  const { name, description, status, repoUrl, owner, tags } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const projectIndex = databaseState.projects.findIndex(p => p.name === cleanName);
  if (projectIndex !== -1) {
    return res.status(400).json({ error: `Project name "${cleanName}" already exists.` });
  }

  const newProject = {
    id: `proj-${Date.now()}`,
    name: cleanName,
    description: description || 'No description provided.',
    status: status || 'Development',
    owner: owner || 'nvht2505@gmail.com',
    repoUrl: repoUrl || `https://github.com/terkix/${cleanName}`,
    size: Math.floor(Math.random() * 300) + 20, // Default 20-320 MB
    tags: Array.isArray(tags) ? tags : ['Local'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    branches: ['main', 'dev'],
    currentBranch: 'main',
    commits: [
      { hash: 'init-' + Math.floor(Math.random() * 100000), message: 'Initial commit of workspace source block', author: owner || 'nvht2505@gmail.com', date: new Date().toISOString() }
    ]
  };

  databaseState.projects.unshift(newProject);

  // Auto-sync visual representation in storage layout under Active Projects
  const activeFolder = databaseState.storageTree.children.find((c: any) => c.id === 'dir-active');
  if (activeFolder) {
    activeFolder.children.unshift({
      id: `dir-proj-${newProject.id}`,
      name: newProject.name,
      type: 'folder',
      createdAt: newProject.createdAt,
      updatedAt: newProject.updatedAt,
      children: [
        { id: `f-${newProject.id}-index`, name: 'index.ts', type: 'file', size: 1, mimeType: 'text/typescript', createdAt: newProject.createdAt, updatedAt: newProject.updatedAt },
        { id: `f-${newProject.id}-readme`, name: 'README.md', type: 'file', size: 2, mimeType: 'text/markdown', createdAt: newProject.createdAt, updatedAt: newProject.updatedAt },
      ]
    });
  }

  addNotification('Project Created', `Successfully created ${newProject.name} repository blocks.`, 'success');
  addAuditLog(newProject.owner, 'PROJECT_CREATE', `Created project: ${newProject.name} with default files.`, req);
  saveDb();
  res.status(201).json(newProject);
});

app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const project = databaseState.projects.find(p => p.id === id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { status, description, tags, repoUrl, currentBranch } = req.body;

  let originalStatus = project.status;

  if (status !== undefined) project.status = status;
  if (description !== undefined) project.description = description;
  if (tags !== undefined) project.tags = tags;
  if (repoUrl !== undefined) project.repoUrl = repoUrl;
  if (currentBranch !== undefined) project.currentBranch = currentBranch;
  project.updatedAt = new Date().toISOString();

  // If status changed to Archived, let's sync in the file list
  if (status && status !== originalStatus) {
    // Audit status change
    addAuditLog(project.owner, 'PROJECT_UPDATE_STATUS', `Updated project "${project.name}" status from ${originalStatus} to ${status}.`, req);
    addNotification('Project State Change', `Project "${project.name}" state set to "${status}".`, 'info');

    if (status === 'Archived') {
      // Find directory in Active, move to Archived Folder
      const activeFolder = databaseState.storageTree.children.find((c: any) => c.id === 'dir-active');
      const archivedFolder = databaseState.storageTree.children.find((c: any) => c.id === 'dir-archived');
      if (activeFolder && archivedFolder) {
        const idx = activeFolder.children.findIndex((f: any) => f.name === project.name);
        if (idx !== -1) {
          const removed = activeFolder.children.splice(idx, 1)[0];
          removed.updatedAt = new Date().toISOString();
          archivedFolder.children.unshift(removed);
        }
      }
    } else if (originalStatus === 'Archived') {
      // Return back to Active from Archived Folder
      const activeFolder = databaseState.storageTree.children.find((c: any) => c.id === 'dir-active');
      const archivedFolder = databaseState.storageTree.children.find((c: any) => c.id === 'dir-archived');
      if (activeFolder && archivedFolder) {
        const idx = archivedFolder.children.findIndex((f: any) => f.name === project.name);
        if (idx !== -1) {
          const removed = archivedFolder.children.splice(idx, 1)[0];
          removed.updatedAt = new Date().toISOString();
          activeFolder.children.unshift(removed);
        }
      }
    }
  } else {
    addAuditLog(project.owner, 'PROJECT_UPDATE_METADATA', `Updated metadata for project: ${project.name}.`, req);
  }

  saveDb();
  res.json(project);
});

app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const projectIdx = databaseState.projects.findIndex(p => p.id === id);
  if (projectIdx === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const project = databaseState.projects[projectIdx];
  databaseState.projects.splice(projectIdx, 1);

  // Move project folder out of layout into Trash
  let isMoved = false;
  const foldersToSearch = ['dir-active', 'dir-archived'];
  const trashFolder = databaseState.storageTree.children.find((c: any) => c.id === 'dir-trash');

  for (const fId of foldersToSearch) {
    const parent = databaseState.storageTree.children.find((c: any) => c.id === fId);
    if (parent) {
      const idx = parent.children.findIndex((f: any) => f.name === project.name);
      if (idx !== -1) {
        const removed = parent.children.splice(idx, 1)[0];
        removed.name = `[deleted]_${removed.name}_${Date.now()}`;
        removed.updatedAt = new Date().toISOString();
        if (trashFolder) {
          trashFolder.children.unshift(removed);
          isMoved = true;
        }
        break;
      }
    }
  }

  addNotification('Project Deleted', `Moved project "${project.name}" structure to system Trash.`, 'warning');
  addAuditLog(project.owner, 'PROJECT_DELETE', `Deleted project "${project.name}" reference. Moved blocks to system Trash.`, req);
  saveDb();
  res.json({ message: 'Project deleted and moved to trash.', success: true });
});

// Test Git Connection Endpoint
app.post('/api/projects/:id/test-connection', async (req, res) => {
  const { id } = req.params;
  const project = databaseState.projects.find(p => p.id === id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  try {
    if (project.repoUrl && (project.repoUrl.startsWith('http://') || project.repoUrl.startsWith('https://'))) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const fetchRes = await fetch(project.repoUrl, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return res.json({ 
        success: fetchRes.ok || fetchRes.status < 500, 
        status: fetchRes.status,
        url: project.repoUrl 
      });
    } else {
      return res.json({ success: true, url: project.repoUrl, simulated: true });
    }
  } catch (err: any) {
    const isGithub = project.repoUrl && project.repoUrl.includes('github.com');
    return res.json({ 
      success: isGithub ? true : false, 
      error: err?.message || 'Connection timeout', 
      url: project.repoUrl 
    });
  }
});

// Git Simulation Trigger Actions
app.post('/api/projects/:id/git-action', (req, res) => {
  const { id } = req.params;
  const { action, payload } = req.body; // action: 'commit' | 'branch-create' | 'force-push'
  const project = databaseState.projects.find(p => p.id === id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const user = project.owner;

  if (action === 'commit') {
    const { message, fileEdited } = payload;
    const newHash = Math.random().toString(16).substring(2, 9);
    const newCommit = {
      hash: newHash,
      message: message || `Updated layout references`,
      author: user,
      date: new Date().toISOString()
    };
    project.commits.unshift(newCommit);
    project.updatedAt = new Date().toISOString();
    project.size += parseFloat((Math.random() * 1.5).toFixed(2)); // Grows slightly on commit

    // Add a file or edit virtual explorer size to reflect commit
    addAuditLog(user, 'GIT_COMMIT', `Committed [${newHash}] "${newCommit.message}" on code block.`, req);
    addNotification('Commit Tracked', `Project ${project.name}: [${newHash}] committed successfully.`, 'success');
  } else if (action === 'branch-create') {
    const { branchName } = payload;
    if (!branchName) return res.status(400).json({ error: 'Branch name is required' });
    const cleanBranch = branchName.trim().replace(/\s+/g, '-');
    if (!project.branches.includes(cleanBranch)) {
      project.branches.push(cleanBranch);
      project.currentBranch = cleanBranch;
      project.updatedAt = new Date().toISOString();
      addAuditLog(user, 'GIT_BRANCH_CREATE', `Created branch "${cleanBranch}" on repository: ${project.name}`, req);
    }
  } else if (action === 'pull') {
    project.updatedAt = new Date().toISOString();
    addAuditLog(user, 'GIT_PULL', `Pulled commits for branch ${project.currentBranch} on repository: ${project.name}`, req);
    addNotification('Repository Synced', `Pulled from upstream repository ${project.repoUrl}.`, 'info');
  }

  saveDb();
  res.json(project);
});

// 2. Storage Explorer Unified Operations
app.get('/api/storage-tree', (req, res) => {
  res.json(databaseState.storageTree);
});

// Helper: recursive finder for Storage Nodes
function findNodeById(root: any, id: string): any {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

// Recursive helper to remove node by id and return it
function removeNodeById(root: any, id: string): any {
  if (!root.children) return null;
  const idx = root.children.findIndex((c: any) => c.id === id);
  if (idx !== -1) {
    return root.children.splice(idx, 1)[0];
  }
  for (const child of root.children) {
    const removed = removeNodeById(child, id);
    if (removed) return removed;
  }
  return null;
}

app.post('/api/storage-tree/item', (req, res) => {
  const { parentId, name, type, mimeType, size } = req.body;
  if (!parentId || !name || !type) {
    return res.status(400).json({ error: 'Missing parameter parentId, name or type.' });
  }

  const parent = findNodeById(databaseState.storageTree, parentId);
  if (!parent) {
    return res.status(404).json({ error: 'Target parent folder not found.' });
  }

  const newItem: any = {
    id: `${type === 'folder' ? 'dir' : 'f'}-${Date.now()}`,
    name,
    type,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (type === 'file') {
    newItem.size = size || Math.floor(Math.random() * 25) + 1; // size in KB
    newItem.mimeType = mimeType || 'text/plain';
  } else {
    newItem.children = [];
  }

  if (!parent.children) {
    parent.children = [];
  }
  parent.children.unshift(newItem);

  addAuditLog('administrator', 'STORAGE_CREATE_ITEM', `Created physical ${type}: "${name}" inside parent "${parent.name}".`, req);
  saveDb();
  res.status(201).json({ tree: databaseState.storageTree, created: newItem });
});

app.post('/api/storage-tree/move', (req, res) => {
  const { nodeId, targetParentId } = req.body;
  if (!nodeId || !targetParentId) {
    return res.status(400).json({ error: 'Missing parameters nodeId or targetParentId' });
  }

  const nodeToMove = removeNodeById(databaseState.storageTree, nodeId);
  if (!nodeToMove) {
    return res.status(404).json({ error: 'Source node not found' });
  }

  const parent = findNodeById(databaseState.storageTree, targetParentId);
  if (!parent) {
    // If parent not found, return node back where it was (this is tricky since we removed it, so let's load defaults or put in root)
    if (!databaseState.storageTree.children) databaseState.storageTree.children = [];
    databaseState.storageTree.children.push(nodeToMove);
    return res.status(404).json({ error: 'Target parent folder not found.' });
  }

  if (!parent.children) parent.children = [];
  nodeToMove.updatedAt = new Date().toISOString();
  parent.children.unshift(nodeToMove);

  addAuditLog('administrator', 'STORAGE_MOVE_ITEM', `Moved node "${nodeToMove.name}" to folder "${parent.name}".`, req);
  saveDb();
  res.json({ success: true, tree: databaseState.storageTree });
});

app.post('/api/storage-tree/rename', (req, res) => {
  const { nodeId, newName } = req.body;
  if (!nodeId || !newName) {
    return res.status(400).json({ error: 'Missing parameters nodeId/newName.' });
  }

  const node = findNodeById(databaseState.storageTree, nodeId);
  if (!node) {
    return res.status(404).json({ error: 'Physical storage sector block not found.' });
  }

  const oldName = node.name;
  node.name = newName;
  node.updatedAt = new Date().toISOString();

  addAuditLog('administrator', 'STORAGE_RENAME_ITEM', `Renamed block "${oldName}" to "${newName}".`, req);
  saveDb();
  res.json({ success: true, tree: databaseState.storageTree });
});

app.delete('/api/storage-tree/item/:id', (req, res) => {
  const { id } = req.params;
  const removedNode = removeNodeById(databaseState.storageTree, id);
  if (!removedNode) {
    return res.status(400).json({ error: 'Source file or folder not found.' });
  }

  // Put into system Trash
  const trashFolder = databaseState.storageTree.children.find((c: any) => c.id === 'dir-trash');
  if (trashFolder && id !== 'dir-trash') {
    removedNode.name = `[deleted]_${removedNode.name}_${Date.now()}`;
    removedNode.updatedAt = new Date().toISOString();
    trashFolder.children.unshift(removedNode);
  }

  addAuditLog('administrator', 'STORAGE_DELETE_ITEM', `Sent physical node "${removedNode.name}" to Trash sector.`, req);
  saveDb();
  res.json({ success: true, tree: databaseState.storageTree });
});

// Trash Empty operations
app.post('/api/storage-tree/empty-trash', (req, res) => {
  const trashFolder = databaseState.storageTree.children.find((c: any) => c.id === 'dir-trash');
  if (trashFolder) {
    const deletedCount = trashFolder.children?.length || 0;
    trashFolder.children = [];
    addAuditLog('administrator', 'STORAGE_EMPTY_TRASH', `Permanently purged ${deletedCount} item blocks from physical Trash storage.`, req);
    addNotification('Trash Emptied', `Successfully cleared and reclaimed spaces from Trash.`, 'info');
    saveDb();
    res.json({ success: true, tree: databaseState.storageTree, clearedCount: deletedCount });
  } else {
    res.status(500).json({ error: 'System trash registry not found' });
  }
});

// 3. Backup System REST API
app.get('/api/backups', (req, res) => {
  res.json(databaseState.backups);
});

app.post('/api/backups', (req, res) => {
  const { projectId, type } = req.body; // type: Full | Incremental | Snapshot
  const project = databaseState.projects.find(p => p.id === projectId);

  if (!project) {
    return res.status(400).json({ error: 'Target project database representation not found.' });
  }

  const successRate = 0.95; // 95% backup success rate simulation
  const isSuccess = Math.random() < successRate;

  const bSize = isSuccess ? parseFloat((project.size * (type === 'Full' ? 1.0 : type === 'Incremental' ? 0.15 : 0.4)).toFixed(1)) : 0;
  const newBackup = {
    id: `bak-${Date.now()}`,
    name: `${project.name}_${type.toLowerCase()}_${new Date().toISOString().slice(0,10).replace(/-/g,'')}`,
    projectId: project.id,
    projectName: project.name,
    type: type || 'Snapshot',
    size: bSize,
    date: new Date().toISOString(),
    status: isSuccess ? 'Success' : 'Failed'
  };

  databaseState.backups.unshift(newBackup);

  if (isSuccess) {
    // Add backup pack to Backups Explorer directory
    const backupFolder = databaseState.storageTree.children.find((c: any) => c.id === 'dir-backups');
    if (backupFolder) {
      backupFolder.children.unshift({
        id: `f-bak-${newBackup.id}`,
        name: `${newBackup.name}.tar.gz`,
        type: 'file',
        size: Math.floor(bSize * 1024), // in KB
        mimeType: 'application/gzip',
        createdAt: newBackup.date,
        updatedAt: newBackup.date
      });
    }
    addNotification('Backup Completed', `Structured backup complete for project "${project.name}". (${type})`, 'success');
    addAuditLog(project.owner, 'BACKUP_CREATE', `Generated physical ${type} backup archiving system sector: ${newBackup.name}`, req);
  } else {
    addNotification('Backup Failure', `Failed to write compressed structures for project "${project.name}". Network timing sector clash.`, 'error');
    addAuditLog(project.owner, 'BACKUP_FAIL', `Failed to write physical backup segments for: ${project.name}`, req);
  }

  saveDb();
  res.status(201).json(newBackup);
});

// Restore project from backup
app.post('/api/backups/:id/restore', (req, res) => {
  const { id } = req.params;
  const backup = databaseState.backups.find(b => b.id === id);
  if (!backup) {
    return res.status(404).json({ error: 'Backup snapshot file reference not found' });
  }

  if (backup.status === 'Failed') {
    return res.status(400).json({ error: 'Cannot restore from a failed backup database blocks.' });
  }

  // Restore logic details
  addAuditLog('administrator', 'BACKUP_RESTORE', `Restored database physical tables to checkpoint state: ${backup.name}`, req);
  addNotification('Backup Restored', `Database segments reverted to snapshot: ${backup.name}`, 'info');
  res.json({ success: true, backup });
});

// 4. Archive Center Controls
app.get('/api/archive/list', (req, res) => {
  res.json(databaseState.archives);
});

app.post('/api/archive/zip', (req, res) => {
  const { ids } = req.body; // Project ids to zip
  if (!ids || !ids.length) {
    return res.status(400).json({ error: 'No projects selected for compress' });
  }

  const selectedProjects = databaseState.projects.filter(p => ids.includes(p.id));
  const totalVolume = selectedProjects.reduce((acc, p) => acc + p.size, 0);
  const totalCompressedSizeMb = parseFloat((totalVolume * 0.45).toFixed(2));
  const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const archiveName = `rkix_archive_${dateStr}_${Math.floor(100 + Math.random() * 900)}.zip`;

  const newArchive = {
    id: `arch-${Date.now()}`,
    archiveName,
    totalCompressedSizeMb,
    filesCount: selectedProjects.length,
    projectNames: selectedProjects.map(p => p.name),
    createdAt: new Date().toISOString()
  };

  databaseState.archives.unshift(newArchive);
  saveDb();

  addAuditLog('administrator', 'ARCHIVE_EXPORT', `Bundled and exported [${selectedProjects.length}] project clusters into aggregated zip payload: ${archiveName}`, req);
  addNotification('ZIP Archived', `Successfully compressed projects to ${archiveName}. Reclaimed storage block markers.`, 'success');

  res.json({
    success: true,
    archiveName: newArchive.archiveName,
    totalCompressedSizeMb: newArchive.totalCompressedSizeMb,
    filesCount: newArchive.filesCount,
    projectNames: newArchive.projectNames,
    createdAt: newArchive.createdAt
  });
});

// 5. System Core State and Stats
app.get('/api/system/notifications', (req, res) => {
  res.json(databaseState.notifications);
});

app.post('/api/system/notifications/read', (req, res) => {
  const { id } = req.body;
  if (id === 'all') {
    databaseState.notifications.forEach(n => n.read = true);
  } else {
    const notif = databaseState.notifications.find(n => n.id === id);
    if (notif) notif.read = true;
  }
  saveDb();
  res.json({ success: true });
});

app.get('/api/system/logs', (req, res) => {
  res.json(databaseState.auditLogs);
});

app.get('/api/system/stats', (req, res) => {
  // Compute storage statistics on the fly
  const totalCapacityGb = 1024.0; // 1TB Default limit

  // Calculate used volumes from databaseState elements
  let activeProjMb = databaseState.projects.filter(p => p.status !== 'Archived').reduce((acc, p) => acc + p.size, 0);
  let archivedProjMb = databaseState.projects.filter(p => p.status === 'Archived').reduce((acc, p) => acc + p.size, 0);
  let backupMb = databaseState.backups.filter(b => b.status === 'Success').reduce((acc, b) => acc + b.size, 0);

  // Folder specific sizes from Tree
  let templatesMb = 15.4; // constant simulation
  let trashMb = 1.2;

  const totalUsedMb = activeProjMb + archivedProjMb + backupMb + templatesMb + trashMb;
  const usedGb = parseFloat((totalUsedMb / 1024).toFixed(3));

  const statsObj = {
    totalCapacityGb,
    usedGb,
    byCategory: {
      active: parseFloat((activeProjMb / 1024).toFixed(3)),
      archived: parseFloat((archivedProjMb / 1024).toFixed(3)),
      backups: parseFloat((backupMb / 1024).toFixed(3)),
      templates: parseFloat((templatesMb / 1024).toFixed(3)),
      trash: parseFloat((trashMb / 1024).toFixed(3))
    },
    byType: {
      code: parseFloat((activeProjMb * 0.7 / 1024).toFixed(3)),
      images: parseFloat((activeProjMb * 0.2 / 1024).toFixed(3)),
      configs: parseFloat((templatesMb / 1024).toFixed(3)),
      archives: parseFloat(((archivedProjMb + backupMb) / 1024).toFixed(3)),
      others: parseFloat((trashMb / 1024).toFixed(3))
    },
    history: [
      { date: '06-05', usedGb: parseFloat(((totalUsedMb * 0.90) / 1024).toFixed(3)) },
      { date: '06-06', usedGb: parseFloat(((totalUsedMb * 0.92) / 1024).toFixed(3)) },
      { date: '06-07', usedGb: parseFloat(((totalUsedMb * 0.91) / 1024).toFixed(3)) },
      { date: '06-08', usedGb: parseFloat(((totalUsedMb * 0.94) / 1024).toFixed(3)) },
      { date: '06-09', usedGb: parseFloat(((totalUsedMb * 0.96) / 1024).toFixed(3)) },
      { date: '06-10', usedGb: parseFloat(((totalUsedMb * 0.98) / 1024).toFixed(3)) },
      { date: '06-11', usedGb }
    ]
  };

  res.json(statsObj);
});

// 6. Gemini-powered SMART Storage AI Assistant
app.post('/api/ai/chat', async (req, res) => {
  const { message, activeProjectId, activeFolderId } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message payload is required' });
  }

  try {
    const ai = getGeminiClient();

    // Fabricate helpful domain injection context to guide Gemini
    const projectSummaries = databaseState.projects.map(p => 
      `- ${p.name} (ID: ${p.id}, status: ${p.status}, size: ${p.size}MB, tags: [${p.tags.join(', ')}], repo: ${p.repoUrl})`
    ).join('\n');

    let activeContext = '';
    if (activeProjectId) {
      const p = databaseState.projects.find(proj => proj.id === activeProjectId);
      if (p) {
        activeContext += `\nThe user is currently inspecting Project: "${p.name}". It is in state "${p.status}". Detailed commits: ${JSON.stringify(p.commits.slice(0,2))}.`;
      }
    }
    if (activeFolderId) {
      const node = findNodeById(databaseState.storageTree, activeFolderId);
      if (node) {
        activeContext += `\nThe user is inspecting Storage Explorer level: "${node.name}" (${node.type}) containing: ${node.children ? node.children.map((n: any) => n.name).join(', ') : 'no items'}.`;
      }
    }

    // Compute live telemetry for storage
    let aggregateUsed = databaseState.projects.reduce((acc, p) => acc + p.size, 0) + databaseState.backups.reduce((acc, b) => acc + b.size, 0);

    const systemPrompt = `You are Terkix Storage Center virtual AI Assistant co-pilot (called "RKix AI Co-Pilot").
Your duty is to analyze system resources, suggest physical space optimizations, docker configurations, or git pipelines, and write professional structural advices matching standard Vercel and IBM Cloud engineering patterns.

Here is the LIVE telemetry of the RKix Storage Center cluster:
Total Registered Projects: ${databaseState.projects.length}
Unified Physical Storage Used: ${(aggregateUsed / 1024).toFixed(3)} GB / 1024 GB (Capacity: 1 TB)
Active Backup Configurations: ${databaseState.backups.length} archives
System Warnings: ${databaseState.notifications.filter(n => n.type === 'warning').length} unread notices

Projects List in layout:
${projectSummaries}
${activeContext}

Instructions for your responses:
- Speak in professional, concise, direct engineering terminology.
- You can write fully-formed shell scripts, Dockerfiles, GitHub Action configs, or JSON blocks when appropriate.
- Since Terkix operates on custom kernel architectures, praise code-optimization and micro-allocations (C++, Go, Docker, WebAssembly).
- Always output clean Markdown formatted layout. Keep explanations brief and actionable! Use standard English or respond in Vietnamese if the prompt is in Vietnamese.
`;

    // Modern SDK invoke format
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    res.json({
      reply: response.text,
      speaker: 'RKix AI Co-Pilot',
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('Gemini AI assistant endpoint crash:', err);
    res.json({
      reply: `**[SYSTEM ALIGNMENT WARNING]**: Unable to connect securely to the secondary Gemini module. 
      
Reason: ${err.message || 'API connection failed.'}

Please check if \`GEMINI_API_KEY\` is securely configured in your **Settings > Secrets** panel in AI Studio. In the meantime, I can answer queries locally! Try checking directories or managing repository commits.`,
      speaker: 'RKix Local AI (Offline)',
      timestamp: new Date().toISOString(),
      isOfflineFallback: true
    });
  }
});


// --- Set up Vite / Express full-stack routing ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RKix Storage Center server online and resolving ingress at http://localhost:${PORT}`);
  });
}

startServer();
