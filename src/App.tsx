import React, { useEffect, useState, useRef } from 'react';
import { 
  FolderGit2, 
  Database, 
  Archive, 
  RefreshCw, 
  Search, 
  Zap, 
  Terminal, 
  Shield, 
  ChevronRight, 
  ChevronDown,
  Plus, 
  Trash2, 
  GitCommit, 
  GitBranch, 
  Download, 
  FolderPlus, 
  FileCode, 
  FileText, 
  Folder, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  X, 
  Loader2, 
  Upload, 
  Trash, 
  Play, 
  Send,
  HelpCircle,
  Clock,
  User,
  ArrowRight,
  Menu,
  FileSpreadsheet,
  FileJson,
  LayoutGrid,
  TableProperties,
  Copy,
  Check,
  Globe
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { Project, ProjectStatus, StorageNode, BackupLog, Notification, AuditLog, StorageStats, ArchiveBundle } from './types';
import DashboardStats from './components/DashboardStats';
import RKixLogo from './components/RKixLogo';

export default function App() {
  // Current tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'explorer' | 'projects' | 'backup' | 'archive' | 'security' | 'ai'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [storageTree, setStorageTree] = useState<StorageNode | null>(null);
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);

  // Loading & Action state
  const [globalLoading, setGlobalLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Project Drawer/Modal
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjStatus, setNewProjStatus] = useState<ProjectStatus>('Development');
  const [newProjOwner, setNewProjOwner] = useState('nvht2505@gmail.com');
  const [newProjTags, setNewProjTags] = useState('React, TypeScript, S3');
  const [newProjRepo, setNewProjRepo] = useState('');

  // Selected Items
  const [selectedProjectForGit, setSelectedProjectForGit] = useState<Project | null>(null);
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<Project | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('dir-active');
  const [selectedFile, setSelectedFile] = useState<StorageNode | null>(null);

  // New item file/folder state in explorer
  const [newExplorerItemName, setNewExplorerItemName] = useState('');
  const [newExplorerItemType, setNewExplorerItemType] = useState<'file' | 'folder'>('file');
  const [isCreateExplorerOpen, setIsCreateExplorerOpen] = useState(false);
  const [exploreError, setExploreError] = useState<string | null>(null);

  // Moving state
  const [movingNodeId, setMovingNodeId] = useState<string | null>(null);

  // Rename state
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // AI Assistant State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string; isAi: boolean; isOffline?: boolean }>>([
    {
      sender: 'RKix AI Co-Pilot',
      text: 'Xin chào! Tôi là **RKix AI Co-Pilot**. Tôi có thể hỗ trợ phân tích dung lượng ổ đĩa, tạo file cấu hình Docker, thiết lập GitHub Actions CI, hoặc tối ưu hóa dung lượng dự án. Bạn cần tôi trợ giúp gì hôm nay?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAi: true
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Archive bulk selection state
  const [archiveSelection, setArchiveSelection] = useState<string[]>([]);
  const [zipResult, setZipResult] = useState<{ success: boolean; archiveName: string; totalCompressedSizeMb: number; filesCount: number } | null>(null);
  const [archives, setArchives] = useState<ArchiveBundle[]>([]);
  const [selectedArchiveForTree, setSelectedArchiveForTree] = useState<ArchiveBundle | null>(null);
  const [archiveTreeExpandedNodes, setArchiveTreeExpandedNodes] = useState<Record<string, boolean>>({});

  // Active progress-tracking dictionary for projects doing backup or zip packaging
  const [projectProgress, setProjectProgress] = useState<Record<string, { progress: number; type: 'backup' | 'zip'; message: string }>>({});

  // Toggle projects layout: Grid or Table
  const [projectsViewMode, setProjectsViewMode] = useState<'grid' | 'table'>('grid');

  // Clone copied visual feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Connection testing status dictionary ('loading' | 'success' | 'failed')
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'loading' | 'success' | 'failed'>>({});

  // Convert git HTTPS URL to private SSH clone command URL
  const getSshUrl = (url: string) => {
    if (!url) return 'git@git.rkix.net:project.git';
    let clean = url.replace(/https?:\/\//, '');
    const firstSlash = clean.indexOf('/');
    if (firstSlash !== -1) {
      const domain = clean.substring(0, firstSlash);
      let path = clean.substring(firstSlash + 1);
      if (!path.endsWith('.git')) {
        path = path + '.git';
      }
      return `git@${domain}:${path}`;
    }
    return `git@git.rkix.net:${clean}.git`;
  };

  // Perform quick copy layout
  const handleQuickClone = async (projectId: string, url: string) => {
    const sshUrl = getSshUrl(url);
    try {
      await navigator.clipboard.writeText(sshUrl);
      setCopiedId(projectId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // Handle active ping test targeting actual Git repository context
  const handleTestConnection = async (projectId: string) => {
    setConnectionStatus(prev => ({ ...prev, [projectId]: 'loading' }));
    try {
      const res = await fetch(`/api/projects/${projectId}/test-connection`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus(prev => ({ ...prev, [projectId]: data.success ? 'success' : 'failed' }));
      } else {
        setConnectionStatus(prev => ({ ...prev, [projectId]: 'failed' }));
      }
    } catch (err) {
      console.error('Connection test failed:', err);
      setConnectionStatus(prev => ({ ...prev, [projectId]: 'failed' }));
    }
  };

  // Generate beautiful waves for last 30 days of commits based on repository signature
  const getCommitHistory30Days = (projectId: string, existingCommits: any[] = []) => {
    const data = [];
    const seed = projectId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const realCommitsCount = (existingCommits || []).filter(c => c.date && c.date.startsWith(dateStr)).length;
      
      let extraCommits = 0;
      const valSeed = seed + i;
      const sinVal = Math.sin(valSeed);
      if (sinVal > 0.6) {
        extraCommits = Math.floor((valSeed % 3) + 1);
      } else if (sinVal > 0.3) {
        extraCommits = 1;
      }
      
      data.push({
        date: dateStr,
        shortDate: d.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' }),
        commits: realCommitsCount + extraCommits
      });
    }
    return data;
  };

  // Fetch initial system states
  const fetchAllData = async (silent = false) => {
    if (!silent) setGlobalLoading(true);
    try {
      const [projRes, treeRes, backupRes, notifRes, logsRes, statsRes, archivesRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/storage-tree'),
        fetch('/api/backups'),
        fetch('/api/system/notifications'),
        fetch('/api/system/logs'),
        fetch('/api/system/stats'),
        fetch('/api/archive/list')
      ]);

      if (projRes.ok) setProjects(await projRes.json());
      if (treeRes.ok) setStorageTree(await treeRes.json());
      if (backupRes.ok) setBackups(await backupRes.json());
      if (notifRes.ok) setNotifications(await notifRes.json());
      if (logsRes.ok) setAuditLogs(await logsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (archivesRes.ok) setArchives(await archivesRes.json());
    } catch (err) {
      console.error('Failed to parse API states:', err);
    } finally {
      if (!silent) setGlobalLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Read notification handler
  const handleMarkRead = async (id: string) => {
    try {
      await fetch('/api/system/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      // Silent update
      const updated = notifications.map(n => n.id === id || id === 'all' ? { ...n, read: true } : n);
      setNotifications(updated);
    } catch (err) {
      console.error(err);
    }
  };

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    setActionLoading('create-project');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjName,
          description: newProjDesc,
          status: newProjStatus,
          owner: newProjOwner,
          repoUrl: newProjRepo,
          tags: newProjTags.split(',').map(t => t.trim()).filter(Boolean)
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to create project');
        return;
      }

      setIsNewProjectModalOpen(false);
      // Clean form
      setNewProjName('');
      setNewProjDesc('');
      setNewProjStatus('Development');
      setNewProjRepo('');
      setNewProjTags('React, TypeScript, S3');

      await fetchAllData(true);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Update Project Status
  const handleUpdateStatus = async (id: string, nextStatus: ProjectStatus) => {
    setActionLoading(`status-${id}`);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        // Also update local selected project if active
        const updatedProj = await res.json();
        if (selectedProjectForGit?.id === id) {
          setSelectedProjectForGit(updatedProj);
        }
        await fetchAllData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Project reference
  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to move this project cluster and its physical sectors to Trash?')) return;
    setActionLoading(`delete-${id}`);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (selectedProjectForGit?.id === id) {
          setSelectedProjectForGit(null);
        }
        await fetchAllData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Git commit simulation
  const handleGitCommit = async (id: string, msg: string) => {
    setActionLoading(`commit-${id}`);
    try {
      const res = await fetch(`/api/projects/${id}/git-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          payload: { message: msg }
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedProjectForGit(updated);
        await fetchAllData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Git branch simulation
  const handleGitBranch = async (id: string, branch: string) => {
    if (!branch.trim()) return;
    setActionLoading(`branch-${id}`);
    try {
      const res = await fetch(`/api/projects/${id}/git-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'branch-create',
          payload: { branchName: branch }
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedProjectForGit(updated);
        await fetchAllData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Git Pull
  const handleGitPull = async (id: string) => {
    setActionLoading(`pull-${id}`);
    try {
      const res = await fetch(`/api/projects/${id}/git-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pull',
          payload: {}
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedProjectForGit(updated);
        await fetchAllData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Storage Explorer Actions
  const handleCreateStorageItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExplorerItemName.trim()) return;

    setActionLoading('create-storage-item');
    try {
      const res = await fetch('/api/storage-tree/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: selectedFolderId,
          name: newExplorerItemName,
          type: newExplorerItemType,
          mimeType: newExplorerItemType === 'file' ? 'text/plain' : undefined,
          size: newExplorerItemType === 'file' ? Math.floor(Math.random() * 45) + 2 : undefined
        })
      });

      if (res.ok) {
        setNewExplorerItemName('');
        setIsCreateExplorerOpen(false);
        await fetchAllData(true);
      } else {
        const data = await res.json();
        setExploreError(data.error || 'Failed to create item');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Move node action
  const handleMoveNode = async (nodeId: string, destParentId: string) => {
    setActionLoading(`move-${nodeId}`);
    try {
      const res = await fetch('/api/storage-tree/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, targetParentId: destParentId })
      });
      if (res.ok) {
        setMovingNodeId(null);
        await fetchAllData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Rename Node
  const handleRenameNode = async (nodeId: string) => {
    if (!renameValue.trim()) return;
    setActionLoading(`rename-${nodeId}`);
    try {
      const res = await fetch('/api/storage-tree/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, newName: renameValue })
      });
      if (res.ok) {
        setRenamingNodeId(null);
        setRenameValue('');
        await fetchAllData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Storage Item (Trash)
  const handleDeleteStorageItem = async (id: string) => {
    setActionLoading(`delete-node-${id}`);
    try {
      const res = await fetch(`/api/storage-tree/item/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSelectedFile(null);
        await fetchAllData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Reclaim all spaces in trash
  const handleEmptyTrash = async () => {
    if (!confirm('Permanent system-purging on Trash registry. Reclaimed space is irreversible. Proceed?')) return;
    setActionLoading('empty-trash');
    try {
      const res = await fetch('/api/storage-tree/empty-trash', { method: 'POST' });
      if (res.ok) {
        await fetchAllData(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Trigger Backup with simulated progress bar
  const handleTriggerBackup = async (projectId: string, type: 'Full' | 'Incremental' | 'Snapshot') => {
    setActionLoading(`backup-trigger-${projectId}-${type}`);
    
    // Initialize state
    setProjectProgress(prev => ({
      ...prev,
      [projectId]: { progress: 5, type: 'backup', message: 'Khởi tạo phân khu liên hợp...' }
    }));

    let currentStep = 1;
    const totalSteps = 20;

    const runBackupAPI = async () => {
      try {
        const res = await fetch('/api/backups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, type })
        });
        if (res.ok) {
          await fetchAllData(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setActionLoading(null);
        setProjectProgress(prev => {
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
      }
    };

    const interval = setInterval(() => {
      currentStep++;
      const val = Math.min(5 + (currentStep / totalSteps) * 95, 99);
      
      let msg = 'Đang quét khối nhớ của dự án...';
      if (val > 80) msg = 'Đang biên dịch tệp nén tar.gz...';
      else if (val > 50) msg = 'Đang truyền khối lưu trữ lên S3...';
      else if (val > 25) msg = 'Đang băm mã hóa checksum MD5...';

      setProjectProgress(prev => {
        if (!prev[projectId]) {
          clearInterval(interval);
          return prev;
        }
        return {
          ...prev,
          [projectId]: { progress: Math.round(val), type: 'backup', message: msg }
        };
      });

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        setProjectProgress(prev => ({
          ...prev,
          [projectId]: { progress: 100, type: 'backup', message: 'Hoàn tất sao lưu hệ thống!' }
        }));
        setTimeout(() => {
          runBackupAPI();
        }, 400);
      }
    }, 100);
  };

  // Restore Backup
  const handleRestoreBackup = async (id: string, bName: string) => {
    if (!confirm(`Warning: Reverting database and live assets blocks to target checkpoint: "${bName}". State alterations are immediate. Continue?`)) return;
    setActionLoading(`restore-${id}`);
    try {
      const res = await fetch(`/api/backups/${id}/restore`, { method: 'POST' });
      if (res.ok) {
        alert('Systems successfully restored and synchronization logs re-checked.');
        await fetchAllData(true);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to restore');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk Zip Archiving with simulated multi-project progress bar
  const handleZipSelection = async () => {
    if (!archiveSelection.length) return;
    setActionLoading('zip-pack');

    const selectedIds = [...archiveSelection];

    // Initialize progress for each of them
    selectedIds.forEach(id => {
      setProjectProgress(prev => ({
        ...prev,
        [id]: { progress: 8, type: 'zip', message: 'Đang chuẩn bị đóng gói tệp tin...' }
      }));
    });

    let currentStep = 1;
    const totalSteps = 25;

    const runZipAPI = async () => {
      try {
        const res = await fetch('/api/archive/zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedIds })
        });
        if (res.ok) {
          const dat = await res.json();
          setZipResult(dat);
          setArchiveSelection([]);
          await fetchAllData(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setActionLoading(null);
        setProjectProgress(prev => {
          const next = { ...prev };
          selectedIds.forEach(id => {
            delete next[id];
          });
          return next;
        });
      }
    };

    const interval = setInterval(() => {
      currentStep++;
      const val = Math.min(8 + (currentStep / totalSteps) * 92, 99);
      
      let msg = 'Đang quét bản ghi đĩa...';
      if (val > 80) msg = 'Đang đóng gói cấu trúc tệp ZIP...';
      else if (val > 55) msg = 'Đang áp dụng thuật toán nén DEFLATE...';
      else if (val > 30) msg = 'Đang khởi tạo danh mục cây phân vùng...';

      selectedIds.forEach(id => {
        setProjectProgress(prev => {
          if (!prev[id]) return prev;
          return {
            ...prev,
            [id]: { progress: Math.round(val), type: 'zip', message: msg }
          };
        });
      });

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        selectedIds.forEach(id => {
          setProjectProgress(prev => ({
            ...prev,
            [id]: { progress: 100, type: 'zip', message: 'Đã nén ZIP thành công!' }
          }));
        });
        setTimeout(() => {
          runZipAPI();
        }, 400);
      }
    }, 100);
  };

  // Archive Metadata Export Utilities
  const downloadJSON = (data: any, fileName: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (headers: string[], rows: any[][], fileName: string) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => {
        const text = String(val ?? '');
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportAllJSON = () => {
    downloadJSON(archives, 'rkix_all_archives_metadata.json');
  };

  const handleExportAllCSV = () => {
    const headers = ['ID', 'Archive Name', 'Compressed Size (MB)', 'Files Count', 'Projects Bundled', 'Created At'];
    const rows = archives.map(a => [
      a.id,
      a.archiveName,
      a.totalCompressedSizeMb,
      a.filesCount,
      a.projectNames.join('; '),
      a.createdAt
    ]);
    downloadCSV(headers, rows, 'rkix_all_archives_metadata.csv');
  };

  const handleExportSingleJSON = (archive: ArchiveBundle) => {
    downloadJSON(archive, `${archive.archiveName.replace('.zip', '')}_metadata.json`);
  };

  const handleExportSingleCSV = (archive: ArchiveBundle) => {
    const headers = ['ID', 'Archive Name', 'Compressed Size (MB)', 'Files Count', 'Projects Bundled', 'Created At'];
    const rows = [[
      archive.id,
      archive.archiveName,
      archive.totalCompressedSizeMb,
      archive.filesCount,
      archive.projectNames.join('; '),
      archive.createdAt
    ]];
    downloadCSV(headers, rows, `${archive.archiveName.replace('.zip', '')}_metadata.csv`);
  };

  // Find project folders inside the storage tree recursively
  const findArchiveProjectNodes = (node: StorageNode | null, projectNames: string[]): StorageNode[] => {
    if (!node) return [];
    let results: StorageNode[] = [];
    
    // Check if current node is a project folder we are looking for
    if (node.type === 'folder' && projectNames.includes(node.name)) {
      results.push(node);
    }
    
    // Otherwise, search children recursively
    if (node.children) {
      for (const child of node.children) {
        results = [...results, ...findArchiveProjectNodes(child, projectNames)];
      }
    }
    
    return results;
  };

  // Helper to generate the zip tree root node
  const getZipVirtualStorageTree = (archive: ArchiveBundle): StorageNode => {
    const matchedProjectNodes = findArchiveProjectNodes(storageTree, archive.projectNames);
    
    const finalChildren: StorageNode[] = matchedProjectNodes.length > 0 
      ? JSON.parse(JSON.stringify(matchedProjectNodes)) 
      : archive.projectNames.map(pName => ({
          id: `virtual-p-${pName}`,
          name: pName,
          type: 'folder',
          createdAt: archive.createdAt,
          updatedAt: archive.createdAt,
          children: [
            { id: `virtual-f-info-${pName}`, name: 'package.json', type: 'file', size: 12, mimeType: 'application/json', createdAt: archive.createdAt, updatedAt: archive.createdAt },
            { id: `virtual-f-readme-${pName}`, name: 'README.md', type: 'file', size: 5, mimeType: 'text/markdown', createdAt: archive.createdAt, updatedAt: archive.createdAt }
          ]
        }));

    return {
      id: `zip-root-${archive.id}`,
      name: archive.archiveName,
      type: 'folder',
      createdAt: archive.createdAt,
      updatedAt: archive.createdAt,
      children: finalChildren
    };
  };

  // Render a single node in the Archive custom tree
  const renderArchiveTreeNode = (node: StorageNode, depth: number = 0) => {
    const isFolder = node.type === 'folder';
    const isExpanded = !!archiveTreeExpandedNodes[node.id];
    
    const toggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation();
      setArchiveTreeExpandedNodes(prev => ({
        ...prev,
        [node.id]: !prev[node.id]
      }));
    };

    return (
      <div key={node.id} className="select-none">
        <div 
          className={`flex items-center gap-2.5 py-1.5 px-2.5 rounded hover:bg-[#1a1a1a] cursor-pointer text-xs font-mono transition-colors ${
            !isFolder ? 'hover:text-white text-gray-300' : 'text-[#00D4FF] hover:text-[#00D4FF]/90'
          }`}
          onClick={isFolder ? toggleExpand : undefined}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {isFolder ? (
            <div className="flex items-center gap-2 w-full min-w-0">
              <span onClick={toggleExpand} className="p-0.5 hover:bg-[#252525] rounded transition-colors text-gray-550 shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                )}
              </span>
              <Folder className="h-3.5 w-3.5 text-[#00D4FF] shrink-0" />
              <span className="font-bold truncate text-white text-xs">{node.name}</span>
              {node.children && node.children.length > 0 && (
                <span className="text-[9px] text-[#00D4FF]/80 font-mono font-normal shrink-0">({node.children.length})</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full min-w-0">
              <span className="w-4 shrink-0" />
              {node.name.endsWith('.ts') || node.name.endsWith('.tsx') || node.name.endsWith('.js') || node.name.endsWith('.go') || node.name.endsWith('.cpp') ? (
                <FileCode className="h-3.5 w-3.5 text-orange-400 shrink-0" />
              ) : node.name.endsWith('.json') || node.name.endsWith('.yml') || node.name.endsWith('.conf') ? (
                <FileText className="h-3.5 w-3.5 text-[#00D4FF] shrink-0" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-gray-450 shrink-0" />
              )}
              <span className="truncate text-gray-300 text-xs">{node.name}</span>
              {node.size && (
                <span className="text-[10px] text-gray-500 font-sans shrink-0 ml-auto font-mono">
                  {node.size} KB
                </span>
              )}
            </div>
          )}
        </div>
        
        {isFolder && isExpanded && node.children && node.children.length > 0 && (
          <div className="border-l border-[#222] ml-4 mt-0.5 space-y-0.5">
            {node.children.map(child => renderArchiveTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Find project directories inside the global storage tree and return them, or fallback to mock structure
  const getArchiveContentsTree = (archive: ArchiveBundle): StorageNode[] => {
    if (!storageTree || !archive.projectNames) return [];
    
    const matchedNodes: StorageNode[] = [];
    
    const searchTree = (node: StorageNode) => {
      if (node.type === 'folder' && archive.projectNames.some(pName => pName.toLowerCase() === node.name.toLowerCase())) {
        matchedNodes.push(node);
        return;
      }
      if (node.children) {
        for (const child of node.children) {
          searchTree(child);
        }
      }
    };
    
    searchTree(storageTree);
    
    // If no matching project directories are found (e.g. for default archives or non-existent items),
    // we generate a beautiful, descriptive mockup folder structure using the correct storage tree types.
    if (matchedNodes.length === 0) {
      archive.projectNames.forEach((projName, i) => {
        matchedNodes.push({
          id: `fallback-dir-${projName}-${i}`,
          name: projName,
          type: 'folder',
          createdAt: archive.createdAt,
          updatedAt: archive.createdAt,
          children: [
            { id: `fallback-f-${projName}-1`, name: 'index.ts', type: 'file', size: 12, mimeType: 'text/typescript', createdAt: archive.createdAt, updatedAt: archive.createdAt },
            { id: `fallback-f-${projName}-2`, name: 'package.json', type: 'file', size: 2, mimeType: 'application/json', createdAt: archive.createdAt, updatedAt: archive.createdAt },
            { id: `fallback-f-${projName}-3`, name: 'README.md', type: 'file', size: 5, mimeType: 'text/markdown', createdAt: archive.createdAt, updatedAt: archive.createdAt }
          ]
        });
      });
    }
    
    return matchedNodes;
  };

  // Toggle child folders inside the archive contents tree
  const toggleArchiveNodeExpanded = (nodeId: string) => {
    setArchiveTreeExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Pre-expand first level nodes of the file tree upon clicking a ZIP archive bundle name
  useEffect(() => {
    if (selectedArchiveForTree) {
      const matched = getArchiveContentsTree(selectedArchiveForTree);
      const initialExpanded: Record<string, boolean> = {};
      matched.forEach(node => {
        initialExpanded[node.id] = true;
        if (node.children) {
          node.children.forEach(child => {
            if (child.type === 'folder') {
              initialExpanded[child.id] = true;
            }
          });
        }
      });
      setArchiveTreeExpandedNodes(initialExpanded);
    } else {
      setArchiveTreeExpandedNodes({});
    }
  }, [selectedArchiveForTree, storageTree]);

  // Chat AI submission
  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || aiLoading) return;

    const userText = chatInput;
    setChatInput('');
    setChatMessages(prev => [
      ...prev,
      {
        sender: 'You',
        text: userText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAi: false
      }
    ]);

    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          activeProjectId: selectedProjectForGit?.id || undefined,
          activeFolderId: selectedFolderId
        })
      });

      if (res.ok) {
        const dat = await res.json();
        setChatMessages(prev => [
          ...prev,
          {
            sender: dat.speaker || 'RKix AI Co-Pilot',
            text: dat.reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isAi: true,
            isOffline: dat.isOfflineFallback
          }
        ]);
      } else {
        throw new Error('API server down');
      }
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'RKix Local AI (Offline)',
          text: '**⚠️ Lỗi kết nối dịch vụ.** Không thể gửi yêu cầu đến module Gemini AI. Vui lòng kiểm tra lại thiết lập **GEMINI_API_KEY** trong phần Secrets hoặc thử lại sau.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAi: true,
          isOffline: true
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // Suggesting questions in AI chat
  const handlePresetAiPrompt = (promptText: string) => {
    setChatInput(promptText);
  };

  // Helper to retrieve folder contents recursive
  const getCurrentFolderNode = (): StorageNode | null => {
    if (!storageTree) return null;
    if (selectedFolderId === 'root') return storageTree;
    
    // Find node recursive
    const findNode = (node: StorageNode): StorageNode | null => {
      if (node.id === selectedFolderId) return node;
      if (node.children) {
        for (const child of node.children) {
          const res = findNode(child);
          if (res) return res;
        }
      }
      return null;
    };
    return findNode(storageTree);
  };

  const currentFolder = getCurrentFolderNode();

  // Search filter
  const filteredProjects = projects.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.tags.some(t => t.toLowerCase().includes(query)) ||
      p.owner.toLowerCase().includes(query)
    );
  });

  const totalCapacity = stats?.totalCapacityGb ?? 1024;
  const usedStorage = stats?.usedGb ?? 0;
  const usedStoragePercent = totalCapacity > 0 ? ((usedStorage / totalCapacity) * 100).toFixed(1) : '0.0';
  const activePageMeta = {
    overview: {
      eyebrow: 'Command Center',
      title: 'Bảng điều khiển vận hành RKix v1.0',
      description: 'Theo dõi dự án, dung lượng, backup và cảnh báo trên một giao diện tối giản, sang trọng, sẵn sàng demo.',
      cta: 'Khởi tạo dự án',
      action: () => setIsNewProjectModalOpen(true),
    },
    explorer: {
      eyebrow: 'Storage Explorer',
      title: 'Duyệt không gian lưu trữ trực quan',
      description: 'Quản lý cây thư mục, file, Trash và thao tác phân vùng trong trải nghiệm gần với một control plane thực tế.',
      cta: 'Thêm bản ghi',
      action: () => setIsCreateExplorerOpen(true),
    },
    projects: {
      eyebrow: 'Project Registry',
      title: 'Quản lý vòng đời toàn bộ dự án',
      description: 'Tìm kiếm, tạo mới, chỉnh trạng thái, kiểm thử kết nối repository và thao tác Git mô phỏng.',
      cta: 'Tạo project',
      action: () => setIsNewProjectModalOpen(true),
    },
    backup: {
      eyebrow: 'Backup Center',
      title: 'Sao lưu và phục hồi có kiểm soát',
      description: 'Theo dõi checkpoint, restore snapshot và trạng thái an toàn dữ liệu trong một màn hình tập trung.',
      cta: 'Đồng bộ dữ liệu',
      action: () => fetchAllData(),
    },
    archive: {
      eyebrow: 'Archive Center',
      title: 'Nén, xuất kho và lưu trữ dài hạn',
      description: 'Đóng gói project thành archive ZIP mô phỏng, xem cấu trúc bên trong và xuất metadata nhanh.',
      cta: 'Đồng bộ archive',
      action: () => fetchAllData(true),
    },
    security: {
      eyebrow: 'Security Ledger',
      title: 'Audit log và giám sát thay đổi',
      description: 'Quan sát các sự kiện vận hành, notification và dấu vết thao tác quan trọng trên toàn hệ thống.',
      cta: 'Làm mới log',
      action: () => fetchAllData(true),
    },
    ai: {
      eyebrow: 'AI Copilot',
      title: 'Trợ lý thông minh cho storage team',
      description: 'Hỏi nhanh về dung lượng, backup, Git workflow hoặc để AI đề xuất tối ưu cho dự án hiện tại.',
      cta: 'Gợi ý câu hỏi',
      action: () => handlePresetAiPrompt('Phân tích nhanh tình trạng hệ thống RKix hiện tại và đề xuất 3 việc ưu tiên.'),
    },
  }[activeTab];

  return (
    <div id="main-container" className="app-shell flex h-screen w-full bg-[#0A0A0A] text-[#E5E5E5] font-sans overflow-hidden relative">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-[-12rem] top-[-14rem] h-[32rem] w-[32rem] rounded-full bg-cyan-500/10 blur-3xl animate-orb-float" />
        <div className="absolute right-[-16rem] top-[22%] h-[36rem] w-[36rem] rounded-full bg-indigo-600/10 blur-3xl animate-orb-float-delayed" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
      </div>
      
      {/* Mobile Sidebar Overlay Mask */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 1. Left Sidebar Navigation matching elegant theme panel */}
      <aside 
        id="app-sidebar" 
        className={`w-64 flex flex-col border-r border-white/10 bg-[#0B0F14]/85 backdrop-blur-2xl h-full shrink-0 fixed inset-y-0 left-0 z-50 transform md:static md:translate-x-0 transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        
        {/* Core RKix Brand branding header */}
        <div className="p-6 flex items-center justify-between border-b border-[#262626]/40">
          <RKixLogo />
          <div className="flex items-center gap-2">
            {/* Close button on mobile */}
            <button 
              className="md:hidden p-1 text-gray-400 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Systems online" />
          </div>
        </div>

        {/* User Workspace Info & Role Gater indicator */}
        <div className="px-5 py-4 border-b border-[#262626]/30 bg-[#0F0F0F]/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1e1e1e] border border-[#262626] flex items-center justify-center text-xs font-mono font-bold text-[#00D4FF]">
            HT
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-white truncate">nvht2505@gmail.com</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-mono bg-[#00D4FF]/10 text-[#00D4FF] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">Quản Trị Viên</span>
            </div>
          </div>
        </div>

        {/* Navigation Categories and menu links */}
        <nav className="flex-1 px-4 py-6 space-y-7 overflow-y-auto">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-gray-500 font-bold mb-3 px-2">Quản Trị Hệ Thống</div>
            <div className="space-y-1">
              <button 
                id="nav-overview"
                onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${activeTab === 'overview' ? 'bg-[#161616] text-white border-l-2 border-[#00D4FF] font-medium' : 'text-gray-400 hover:text-white hover:bg-[#121212]'}`}
              >
                <div id="btn-tab-overview" className="flex items-center gap-2.5">
                  <Database className={`h-4 w-4 ${activeTab === 'overview' ? 'text-[#00D4FF]' : 'text-gray-500'}`} />
                  <span>Tổng Quan Hệ Thống</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              </button>

              <button 
                id="nav-explorer"
                onClick={() => { setActiveTab('explorer'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${activeTab === 'explorer' ? 'bg-[#161616] text-white border-l-2 border-[#00D4FF] font-medium' : 'text-gray-400 hover:text-white hover:bg-[#121212]'}`}
              >
                <div id="btn-tab-explorer" className="flex items-center gap-2.5">
                  <FolderGit2 className={`h-4 w-4 ${activeTab === 'explorer' ? 'text-[#00D4FF]' : 'text-gray-500'}`} />
                  <span>Duyệt Bộ Nhớ</span>
                </div>
                <span className="text-[10px] font-mono bg-[#262626] text-gray-400 px-1.5 py-0.3 rounded">VFS</span>
              </button>

              <button 
                id="nav-projects"
                onClick={() => { setActiveTab('projects'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${activeTab === 'projects' ? 'bg-[#161616] text-white border-l-2 border-[#00D4FF] font-medium' : 'text-gray-400 hover:text-white hover:bg-[#121212]'}`}
              >
                <div id="btn-tab-projects" className="flex items-center gap-2.5">
                  <Terminal className={`h-4 w-4 ${activeTab === 'projects' ? 'text-[#00D4FF]' : 'text-gray-500'}`} />
                  <span>Danh Sách Dự Án</span>
                </div>
                <span className="text-[10px] text-[#00D4FF] font-mono bg-[#00D4FF]/10 px-1.5 py-0.2 rounded font-bold">{projects.length}</span>
              </button>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-gray-500 font-bold mb-3 px-2">Bảo Mật & Lưu Trữ</div>
            <div className="space-y-1">
              <button 
                id="nav-backup"
                onClick={() => { setActiveTab('backup'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${activeTab === 'backup' ? 'bg-[#161616] text-white border-l-2 border-[#00D4FF] font-medium' : 'text-gray-400 hover:text-white hover:bg-[#121212]'}`}
              >
                <div id="btn-tab-backup" className="flex items-center gap-2.5">
                  <RefreshCw className={`h-4 w-4 ${activeTab === 'backup' ? 'text-[#00D4FF] animate-pulse' : 'text-gray-500'}`} />
                  <span>Sao Lưu Snapshot</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded font-bold">99%</span>
              </button>

              <button 
                id="nav-archive"
                onClick={() => { setActiveTab('archive'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${activeTab === 'archive' ? 'bg-[#161616] text-white border-l-2 border-[#00D4FF] font-medium' : 'text-gray-400 hover:text-white hover:bg-[#121212]'}`}
              >
                <div id="btn-tab-archive" className="flex items-center gap-2.5">
                  <Archive className={`h-4 w-4 ${activeTab === 'archive' ? 'text-[#00D4FF]' : 'text-gray-500'}`} />
                  <span>Nén & Xuất Khẩu</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              </button>

              <button 
                id="nav-security"
                onClick={() => { setActiveTab('security'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${activeTab === 'security' ? 'bg-[#161616] text-white border-l-2 border-[#00D4FF] font-semibold' : 'text-gray-400 hover:text-white hover:bg-[#121212]'}`}
              >
                <div id="btn-tab-security" className="flex items-center gap-2.5">
                  <Shield className={`h-4 w-4 ${activeTab === 'security' ? 'text-[#00D4FF]' : 'text-gray-500'}`} />
                  <span>Nhật Ký Bảo Mật</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              </button>
            </div>
          </div>

          {/* Dedicated Virtual AI Assistant menu item */}
          <div className="pt-2">
            <div className="text-[10px] uppercase font-mono tracking-widest text-[#00D4FF] font-bold mb-3 px-2">Trợ Lý Copilot</div>
            <button 
              id="nav-ai"
              onClick={() => { setActiveTab('ai'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm transition-all duration-150 border ${activeTab === 'ai' ? 'bg-[#00D4FF]/10 border-[#00D4FF] text-white font-medium shadow-md shadow-[#00D4FF]/5' : 'bg-gradient-to-r from-[#111] to-[#151515] border-[#222] hover:border-[#333] text-gray-300 hover:text-white'}`}
            >
              <div id="btn-tab-ai" className="relative flex items-center justify-center w-6 h-6 rounded-md bg-[#00D4FF]/20 text-[#00D4FF] shrink-0">
                <Zap className="h-3.5 w-3.5 animate-pulse" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold leading-tight flex items-center gap-1">
                  Trợ lý RKix AI
                </div>
                <div className="text-[9px] font-mono text-gray-500">Gemini 3.5 Hoạt Động</div>
              </div>
            </button>
          </div>
        </nav>

        {/* Dynamic Space Progress block in Sidebar Footer */}
        <div className="p-4 border-t border-[#262626] bg-[#0A0A0A]/40 m-4 rounded-xl">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[11px] font-semibold text-gray-405">Phân Phối Bộ Nhớ</span>
            <span className="text-[11px] font-bold text-[#00D4FF] font-mono">
              {stats ? ((stats.usedGb / stats.totalCapacityGb) * 100).toFixed(1) : '0'}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#00D4FF] to-blue-500 rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${stats ? (stats.usedGb / stats.totalCapacityGb) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-gray-500 font-mono flex justify-between">
            <span>Đã dùng {stats ? stats.usedGb.toFixed(2) : '0'} GB</span>
            <span>1,024 GB (1 TB)</span>
          </div>
        </div>
      </aside>

      {/* 2. Main Content viewport area */}
      <main className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Dynamic header with quick overview, query search bar, notification drop */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-[#0B0F14]/78 backdrop-blur-2xl shrink-0 shadow-[0_14px_44px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-2 md:gap-3">
            {/* Hamburger button on mobile */}
            <button 
              id="btn-mobile-sidebar-toggle"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 bg-[#151515] border border-[#262626] rounded-md text-gray-400 hover:text-white transition-colors mr-1"
              title="Mở sidebar"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>

            <span className="text-sm text-gray-500 font-mono hidden sm:inline">Trang Chủ</span>
            <span className="text-gray-600 font-light mt-0.5 hidden sm:inline">/</span>
            <span className="text-[10px] sm:text-xs bg-[#1a1a1a] border border-[#262626] font-mono px-2 py-0.5 rounded text-white flex items-center gap-1.5 truncate max-w-[150px] sm:max-w-none">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00D4FF] shrink-0" />
              <span className="truncate">
                {activeTab === 'overview' && 'BẢNG_ĐIỀU_KHIỂN_TỔNG_QUAN'}
                {activeTab === 'explorer' && 'TRÌNH_DUYỆT_ĐĨA_ẢO'}
                {activeTab === 'projects' && 'QUẢN_LÝ_HỒ_SƠ_DỰ_ÁN'}
                {activeTab === 'backup' && 'ĐẢM_BẢO_SAO_LƯU_HỆ_THỐNG'}
                {activeTab === 'archive' && 'NÉN_VÀ_XUẤT_KHO_HÀNG_LOẠT'}
                {activeTab === 'security' && 'NHẬT_KÝ_GIÁM_SÁT_BẢO_MẬT'}
                {activeTab === 'ai' && 'TRỢ_LÝ_THÔNG_MINH_COPILOT'}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2 h-3 w-3 text-gray-550" />
              <input 
                id="search-input"
                type="text" 
                placeholder="Tìm kiếm..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#151515] border border-[#262626] rounded-full py-1 pl-8 pr-6 text-xs w-28 sm:w-64 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#00D4FF]/50 focus:border-[#00D4FF] transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2 text-gray-400 hover:text-white">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Notification alert count list dropdown */}
            <div className="relative flex items-center">
              <div className="flex gap-2">
                <button 
                  id="btn-notif-center"
                  onClick={() => {
                    const count = notifications.filter(n => !n.read).length;
                    if (count > 0) handleMarkRead('all');
                  }}
                  className="relative p-1.5 bg-[#151515] hover:bg-[#202020] border border-[#262626] rounded-md transition-colors"
                  title="Đánh dấu tất cả thông báo là đã đọc"
                >
                  <RefreshCw className="h-4 w-4 text-gray-400" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span id="notif-count-badge" className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#00D4FF] animate-pulse" />
                  )}
                </button>
              </div>
            </div>

            {/* Force database State sync reload button */}
            <button 
              id="btn-manual-sync"
              onClick={() => fetchAllData()} 
              className="p-1.5 bg-[#151515] hover:bg-[#202020] border border-[#262626] rounded-md text-gray-400 hover:text-white transition-colors"
              title="Đồng bộ hệ thống tức thì"
            >
              <RefreshCw className={`h-4 w-4 ${globalLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Global loading state screen */}
        {globalLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0A0A0A]">
            <Loader2 className="h-8 w-8 text-[#00D4FF] animate-spin mb-4" />
            <h3 className="text-sm font-mono text-gray-400 uppercase tracking-widest animate-pulse">Đang đồng bộ dữ liệu hệ thống...</h3>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

            {/* Render unread system alerts right at the top for warning visibility */}
            {notifications.filter(n => !n.read).length > 0 && (
              <div className="bg-[#111]/90 border-l-4 border-amber-500 rounded p-4 flex items-start gap-3 relative overflow-hidden shadow-md">
                <div className="text-amber-500 shrink-0"><AlertTriangle className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold">Thông báo hệ thống</span>
                  <p className="text-xs text-gray-200 mt-1 font-mono">
                    {notifications.filter(n => !n.read)[0].title}: {notifications.filter(n => !n.read)[0].message}
                  </p>
                </div>
                <button 
                  onClick={() => handleMarkRead(notifications.filter(n => !n.read)[0].id)}
                  className="text-gray-500 hover:text-white"
                >
                  <X className="h-4 w-4 hover:scale-105" />
                </button>
              </div>
            )}

            <section className="rkix-hero-card relative overflow-hidden rounded-3xl border border-white/10 bg-[#0D1117]/82 p-5 md:p-7 shadow-2xl shadow-black/30 backdrop-blur-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(0,212,255,0.18),transparent_35%),radial-gradient(circle_at_82%_18%,rgba(99,102,241,0.16),transparent_36%)]" />
              <div className="relative grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00D4FF] shadow-[0_0_14px_#00D4FF]" />
                    {activePageMeta.eyebrow}
                  </div>
                  <div>
                    <h1 className="max-w-4xl font-display text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                      {activePageMeta.title}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                      {activePageMeta.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={activePageMeta.action}
                      className="group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-950 transition hover:bg-[#00D4FF]"
                    >
                      {activePageMeta.cta}
                      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </button>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      Release Candidate · v1.0
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/24 p-4">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Projects</span>
                    <strong className="mt-2 block font-display text-3xl text-white">{projects.length}</strong>
                    <span className="text-xs text-slate-400">{projects.filter(p => p.status !== 'Archived').length} đang hoạt động</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/24 p-4">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Storage</span>
                    <strong className="mt-2 block font-display text-3xl text-[#00D4FF]">{usedStoragePercent}%</strong>
                    <span className="text-xs text-slate-400">{usedStorage.toFixed(2)}GB / {totalCapacity.toLocaleString()}GB</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/24 p-4">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Backups</span>
                    <strong className="mt-2 block font-display text-3xl text-emerald-300">{backups.length}</strong>
                    <span className="text-xs text-slate-400">{backups.filter(b => b.status === 'Success').length} snapshot OK</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/24 p-4">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Alerts</span>
                    <strong className="mt-2 block font-display text-3xl text-amber-200">{notifications.filter(n => !n.read).length}</strong>
                    <span className="text-xs text-slate-400">cảnh báo chưa đọc</span>
                  </div>
                </div>
              </div>
            </section>

            {/* TAB CONTENT: OVERVIEW DASHBOARD */}
            {activeTab === 'overview' && (
              <div id="section-overview" className="space-y-6 animate-fade-in">
                
                {/* Stats cards components */}
                {stats && (
                  <DashboardStats 
                    stats={stats} 
                    projects={projects} 
                    role="Administrator" 
                    onNavigateSection={(section) => {
                      if (['projects', 'archive', 'backup', 'security'].includes(section)) {
                        setActiveTab(section as any);
                      } else if (section === 'analytics') {
                        // Analytics is visual grid context, we'll open security/project details or let them click tabs
                        setActiveTab('projects');
                      }
                    }} 
                  />
                )}

                {/* Primary split dashboard layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Left Column: Recent live project status blocks */}
                  <div className="lg:col-span-2 bg-[#111] rounded-xl border border-[#262626] overflow-hidden flex flex-col shadow-lg">
                    <div className="p-4 border-b border-[#262626] flex justify-between items-center bg-[#151515]">
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-[#00D4FF]" />
                        <h3 className="text-sm font-display font-medium text-white tracking-wide">Danh Sách Dự Án Đang Hoạt Động ({filteredProjects.length})</h3>
                      </div>
                      <button 
                        onClick={() => setActiveTab('projects')} 
                        className="text-[10px] font-mono font-bold text-[#00D4FF] hover:underline uppercase tracking-wider"
                      >
                        Mở Trình Quản Lý
                      </button>
                    </div>

                    <div className="divide-y divide-[#262626] flex-1">
                      {filteredProjects.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <p>Không tìm thấy dự án nào khớp với bộ lọc.</p>
                          <button 
                            onClick={() => { setSearchQuery(''); setIsNewProjectModalOpen(true); }}
                            className="mt-3 text-xs text-[#00D4FF] hover:underline font-mono"
                          >
                            + Đăng ký phân vùng hạt giống mới
                          </button>
                        </div>
                      ) : (
                        filteredProjects.slice(0, 4).map((p) => {
                          const isSelectedForGit = selectedProjectForGit?.id === p.id;
                          return (
                            <div 
                              key={p.id} 
                              className={`p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-[#151515] transition-colors relative group ${isSelectedForGit ? 'bg-[#151515]/60 border-l-2 border-[#00D4FF]' : ''}`}
                            >
                              {/* Simulated Progress overlay representation */}
                              {projectProgress[p.id] && (
                                <div className="absolute inset-0 bg-[#0A0A0AF3] backdrop-blur-[2px] flex flex-col justify-center px-4 md:px-8 rounded z-10 font-mono animate-fade-in">
                                  <div className="flex items-center justify-between text-[11px] mb-2">
                                    <span className="text-[#00D4FF] font-bold uppercase flex items-center gap-1.5 animate-pulse">
                                      <Loader2 className="h-3 w-3 animate-spin text-[#00D4FF]" />
                                      {projectProgress[p.id].type === 'backup' ? 'Đang Thực Hiện Sao Lưu...' : 'Đang Nén ZIP...'}
                                    </span>
                                    <span className="text-gray-400 text-[10px] truncate max-w-[200px] md:max-w-[300px]" title={projectProgress[p.id].message}>
                                      {projectProgress[p.id].message}
                                    </span>
                                    <span className="text-emerald-400 font-bold ml-1">{projectProgress[p.id].progress}%</span>
                                  </div>
                                  <div className="w-full bg-[#181818] h-2 rounded-full overflow-hidden border border-[#222]">
                                    <div 
                                      className="bg-gradient-to-r from-[#00D4FF] to-emerald-500 h-full rounded-full transition-all duration-100 ease-out"
                                      style={{ width: `${projectProgress[p.id].progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="flex items-start gap-3.5 min-w-0">
                                <div className="mt-1 w-10 h-10 bg-[#1A1A1A] border border-[#262626] rounded flex flex-col items-center justify-center text-[10px] font-mono text-gray-500 shrink-0">
                                  <span className="text-[#00D4FF] font-bold uppercase">{p.tags[0] || 'PK'}</span>
                                  <span>{p.size.toFixed(0)}M</span>
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-white hover:text-[#00D4FF] cursor-pointer transition-colors" onClick={() => setSelectedProjectForGit(p)}>
                                      {p.name}
                                    </h4>
                                    <span className={`text-[9px] font-mono px-2 py-0.2 rounded font-bold uppercase tracking-wider ${
                                      p.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                      p.status === 'Development' ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20' :
                                      p.status === 'Testing' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                      'bg-gray-800 text-gray-400'
                                    }`}>
                                      {p.status === 'Active' ? 'Hoạt động' : p.status === 'Development' ? 'Phát triển' : p.status === 'Testing' ? 'Kiểm thử' : 'Đã lưu'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400 truncate mt-1 max-w-[420px]">{p.description}</p>
                                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-550 font-mono">
                                    <span>Kho: <a href={p.repoUrl} target="_blank" rel="noopener" className="hover:text-white hover:underline">{p.repoUrl.replace('https://github.com/','')}</a></span>
                                    <span>•</span>
                                    <span>Cập nhật {new Date(p.updatedAt).toLocaleDateString('vi-VN')}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 md:mt-0 flex items-center gap-2.5 shrink-0 pl-14 md:pl-0">
                                <div className="text-right hidden md:block">
                                  <div className="text-xs font-mono text-white">{p.size.toFixed(1)} MB</div>
                                  <div className="text-[9px] text-gray-500 font-mono">Cổng kết nối toàn cầu</div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button 
                                    onClick={() => setSelectedProjectForGit(p)}
                                    className="px-2 py-1 text-[10px] font-mono uppercase bg-[#1e1e1e] border border-[#2c2c2c] text-gray-300 hover:text-white rounded-md hover:border-[#00D4FF]"
                                  >
                                    Nút Git
                                  </button>
                                  
                                  <button 
                                    onClick={() => handleTriggerBackup(p.id, 'Snapshot')}
                                    className="p-1 bg-[#1e1e1e] hover:bg-[#00D4FF]/25 hover:text-[#00D4FF] border border-[#2c2c2c] rounded-md text-gray-400"
                                    title="Quick Snapshot"
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Mini static graphs / Backup Health */}
                  <div className="space-y-6 flex flex-col">
                    
                    {/* Visual 1: Custom Vector Interactive Backup Health card */}
                    <div className="bg-[#111] p-5 rounded-xl border border-[#262626] shadow-md relative">
                      <div className="absolute top-4 right-4 text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold tracking-widest uppercase">
                        Sảnh S3 Đồng Bộ
                      </div>
                      <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-0.5">Sức Khỏe Phân Vùng Vật Lý</h3>
                      
                      <div className="mt-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-2 border-[#00D4FF] border-t-transparent animate-spin-slow flex items-center justify-center">
                          <span className="text-[10px] font-mono font-bold text-white">99%</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white">Lịch Sao Lưu Trực Tuyến</div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">Độ toàn vẹn: THÀNH CÔNG (45p trước)</div>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-[#262626]/60 pt-4 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-450">Bản Sao Lưu Hoạt Động</span>
                          <span className="font-mono text-white font-bold">{backups.filter(b => b.status === 'Success').length} Bản lưu</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#00D4FF]">Bộ Phục Hồi Khối Sector</span>
                          <span className="font-mono text-emerald-400">Ổn định (0 lỗi)</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual 2: Live Activity Feed (First 3 item logs) */}
                    <div className="bg-[#111] p-5 rounded-xl border border-[#262626] flex-1 min-h-[220px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest font-bold">Nhật Ký Chạy Thực Tế</h3>
                          <button onClick={() => setActiveTab('security')} className="text-[10px] text-gray-400 hover:text-[#00D4FF] font-mono">
                            Toàn bộ nhật ký
                          </button>
                        </div>
                        <div className="space-y-4 relative pl-3.5 border-l border-[#262626]">
                          {auditLogs.slice(0, 3).map((log) => (
                            <div key={log.id} className="relative">
                              {/* Indicator dot */}
                              <div className="absolute -left-[19.5px] top-1 h-2.5 w-2.5 rounded-full bg-[#00D4FF] border-2 border-[#111]" />
                              <div>
                                <div className="text-[11px] font-bold text-white leading-none">{
                                  log.action === 'Database Cleaned' ? 'Dọn dẹp cơ sở dữ liệu' :
                                  log.action === 'Zip Export Created' ? 'Tạo bản xuất ZIP' :
                                  log.action === 'Git Branch Created' ? 'Tạo nhánh Git mới' :
                                  log.action === 'S3 Sync Completed' ? 'Hoàn tất đồng bộ S3' :
                                  log.action === 'Storage Cleaned' ? 'Giải phóng bộ nhớ' :
                                  log.action === 'VFS Mount Point Init' ? 'Khởi tạo VFS' :
                                  log.action === 'Backup Completed' ? 'Hoàn tất sao lưu' :
                                  log.action
                                }</div>
                                <p className="text-[10px] text-gray-400 truncate mt-1">{log.details}</p>
                                <div className="text-[9px] text-gray-550 font-mono mt-0.5">{new Date(log.timestamp).toLocaleTimeString()} · {log.user}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

                {/* VISUAL CHARTS SECTION: storage growths in overview */}
                {stats && (
                  <div className="bg-[#111] p-6 rounded-xl border border-[#262626]">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">Đo Lường Hệ Thống</span>
                        <h3 className="text-sm font-display font-medium text-white tracking-wide mt-0.5">Lịch Sử Dung Lượng Lưu Trữ Phân Phối</h3>
                      </div>
                      <div className="text-xs font-mono text-[#00D4FF] bg-[#00D4FF]/10 px-2 py-0.5 rounded">
                        Tốc độ tăng trưởng trong 7 ngày
                      </div>
                    </div>

                    {/* Interactive Custom SVG-based Area Growth Timeline Chart */}
                    <div className="relative h-44 w-full">
                      <svg viewBox="0 0 700 120" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="gradient-chart-area" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="0" y1="20" x2="700" y2="20" stroke="#1D1D1D" strokeWidth="0.5" />
                        <line x1="0" y1="60" x2="700" y2="60" stroke="#1D1D1D" strokeWidth="0.5" />
                        <line x1="0" y1="100" x2="700" y2="100" stroke="#1D1D1D" strokeWidth="0.5" />
                        
                        {/* Area Polygon */}
                        <polygon 
                          points={`
                            0,120
                            100,${100 - (stats.history[0]?.usedGb || 0) * 80}
                            200,${100 - (stats.history[1]?.usedGb || 0) * 80}
                            300,${100 - (stats.history[2]?.usedGb || 0) * 80}
                            400,${100 - (stats.history[3]?.usedGb || 0) * 80}
                            500,${100 - (stats.history[4]?.usedGb || 0) * 80}
                            600,${100 - (stats.history[5]?.usedGb || 0) * 80}
                            700,${100 - (stats.history[6]?.usedGb || 0) * 80}
                            700,120
                          `}
                          fill="url(#gradient-chart-area)"
                        />
                        
                        {/* Stroke Path line */}
                        <path 
                          d={`
                            M 100,${100 - (stats.history[0]?.usedGb || 0) * 80}
                            L 200,${100 - (stats.history[1]?.usedGb || 0) * 80}
                            L 300,${100 - (stats.history[2]?.usedGb || 0) * 80}
                            L 400,${100 - (stats.history[3]?.usedGb || 0) * 80}
                            L 500,${100 - (stats.history[4]?.usedGb || 0) * 80}
                            L 600,${100 - (stats.history[5]?.usedGb || 0) * 80}
                            L 700,${100 - (stats.history[6]?.usedGb || 0) * 80}
                          `}
                          fill="none"
                          stroke="#00D4FF"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {/* Interactive dots representing checkpoints */}
                        {stats.history.map((pt, idx) => (
                          <circle 
                            key={idx}
                            cx={100 + idx * 100}
                            cy={100 - pt.usedGb * 80}
                            r="4"
                            fill="#0A0A0A"
                            stroke="#00D4FF"
                            strokeWidth="2"
                          />
                        ))}
                      </svg>
                    </div>

                    <div className="flex justify-between text-[8px] sm:text-[11px] font-mono text-gray-500 mt-2 gap-1 overflow-x-auto pb-1">
                      {stats.history.map((pt, idx) => (
                        <div key={idx} className="text-center shrink-0 min-w-[48px] sm:min-w-0">
                          <div>{pt.date}</div>
                          <div className="text-[#00D4FF] font-semibold mt-0.5">{pt.usedGb.toFixed(2)} GB</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Active Project detail Git Workspace Co-pilot Widget */}
                {selectedProjectForGit && (
                  <div className="bg-[#111] rounded-xl border border-[#00D4FF]/30 p-5 shadow-lg shadow-[#00D4FF]/2 animate-fade-in">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <GitCommit className="h-4 w-4 text-[#00D4FF]" />
                          <h3 className="text-sm font-bold text-white">Active Git Co-Pilot: {selectedProjectForGit.name}</h3>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Simulate commits, check branches on live mock physical gateways.</p>
                      </div>
                      <button 
                        onClick={() => setSelectedProjectForGit(null)}
                        className="text-gray-500 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Sub column 1: Trigger active modifications */}
                      <div className="space-y-4">
                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold block mb-1">State operations</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleGitPull(selectedProjectForGit.id)}
                            disabled={actionLoading !== null}
                            className="flex-1 py-1 px-3 bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#00D4FF] rounded text-xs text-white hover:text-[#00D4FF]"
                          >
                            Git Pull Upstream
                          </button>
                          <button 
                            onClick={() => {
                              const bName = prompt('Enter new branch name:');
                              if (bName) handleGitBranch(selectedProjectForGit.id, bName);
                            }}
                            className="flex-1 py-1 px-3 bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#00D4FF] rounded text-xs text-white hover:text-[#00D4FF]"
                          >
                            New Branch
                          </button>
                        </div>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          const msg = fd.get('commitMsg') as string;
                          if (msg) {
                            handleGitCommit(selectedProjectForGit.id, msg);
                            e.currentTarget.reset();
                          }
                        }} className="space-y-2">
                          <input 
                            name="commitMsg"
                            type="text" 
                            placeholder="Write commit message..." 
                            className="w-full bg-[#151515] text-xs font-mono p-2 border border-[#262626] rounded focus:outline-none focus:border-[#00D4FF] text-white"
                          />
                          <button 
                            type="submit" 
                            className="w-full py-1.5 bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-[#0A0A0A] font-bold rounded text-xs uppercase"
                          >
                            Push Commit Block
                          </button>
                        </form>
                      </div>

                      {/* Sub col 2: Branch Info details */}
                      <div className="bg-[#181818] p-4 rounded border border-[#222]">
                        <span className="text-[10px] font-mono text-gray-550 uppercase tracking-widest block mb-2">Branches catalog</span>
                        <div className="space-y-1.5 font-mono text-xs">
                          {selectedProjectForGit.branches.map((b) => (
                            <div 
                              key={b} 
                              className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${selectedProjectForGit.currentBranch === b ? 'bg-[#00D4FF]/10 text-[#00D4FF] font-bold' : 'text-gray-400 hover:bg-[#202020]'}`}
                              onClick={async () => {
                                setActionLoading(`checkout-${selectedProjectForGit.id}`);
                                const res = await fetch(`/api/projects/${selectedProjectForGit.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ currentBranch: b })
                                });
                                if (res.ok) {
                                  setSelectedProjectForGit(await res.json());
                                }
                                setActionLoading(null);
                              }}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <GitBranch className="h-3 w-3 shrink-0" />
                                <span className="truncate">{b}</span>
                              </div>
                              {selectedProjectForGit.currentBranch === b && <span className="text-[9px] uppercase tracking-widest font-extrabold">Active</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sub col 3: Commit Logs pipeline */}
                      <div className="bg-[#181818] p-4 rounded border border-[#222]">
                        <span className="text-[10px] font-mono text-gray-550 uppercase tracking-widest block mb-2">Commit snapshots</span>
                        <div className="space-y-3 font-mono text-[11px] max-h-[140px] overflow-y-auto pr-1">
                          {selectedProjectForGit.commits.map((c) => (
                            <div key={c.hash} className="border-l-2 border-[#262626] pl-2">
                              <div className="flex items-center justify-between text-white font-semibold">
                                <span className="text-[#00D4FF]">{c.hash}</span>
                                <span className="text-[10px] text-gray-500 font-light">{new Date(c.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-[10px] text-gray-300 truncate mt-0.5">{c.message}</p>
                              <span className="text-[9px] text-gray-550">{c.author}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB CONTENT: STORAGE EXPLORER */}
            {activeTab === 'explorer' && (
              <div id="section-explorer" className="space-y-6 animate-fade-in">
                
                {/* Description and Action triggers */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111] p-4 rounded-xl border border-[#262626]">
                  <div>
                    <h3 className="text-sm font-bold text-white">Thư Mục Hệ Thống Phân Cấp</h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">Duyệt các thư mục phân vùng vật lý, tải lên tệp tin, đổi tên phân khu hoặc dọn dẹp thùng rác.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      id="btn-trigger-empty-trash"
                      onClick={handleEmptyTrash}
                      className="px-3.5 py-1.5 bg-[#171717] hover:bg-rose-950/40 text-rose-400 border border-rose-900/30 rounded-md text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <Trash className="h-3.5 w-3.5" />
                      Dọn Sạch Thùng Rác
                    </button>
                    <button 
                      id="btn-open-explorer-item"
                      onClick={() => {
                        setExploreError(null);
                        setIsCreateExplorerOpen(!isCreateExplorerOpen);
                      }}
                      className="px-3.5 py-1.5 bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-[#0A0A0A] font-bold rounded-md text-xs uppercase flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Thêm Bản Ghi Mới
                    </button>
                  </div>
                </div>

                {exploreError && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/50 text-rose-400 rounded text-xs font-mono font-bold flex items-center justify-between">
                    <span>⚠️ {exploreError}</span>
                    <button onClick={() => setExploreError(null)} className="hover:scale-110 text-rose-300"><X className="h-4 w-4" /></button>
                  </div>
                )}

                {/* Folder Item Creation form expanding */}
                {isCreateExplorerOpen && (
                  <form onSubmit={handleCreateStorageItem} className="bg-[#111] border border-[#262626] p-4 rounded-xl space-y-4 max-w-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-gray-500 uppercase tracking-widest font-bold">Thông số nút lưu trữ mới</span>
                      <button type="button" onClick={() => setIsCreateExplorerOpen(false)} className="text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Loại Nút</label>
                        <select 
                          value={newExplorerItemType}
                          onChange={(e) => setNewExplorerItemType(e.target.value as any)}
                          className="w-full bg-[#151515] border border-[#262626] hover:border-[#383838] px-3 py-1.5 text-xs text-white rounded focus:outline-none focus:border-[#00D4FF]"
                        >
                          <option value="file">Tệp tin</option>
                          <option value="folder">Thư mục</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Phân vùng đích</label>
                        <select 
                          value={selectedFolderId}
                          onChange={(e) => setSelectedFolderId(e.target.value)}
                          className="w-full bg-[#151515] border border-[#262626] hover:border-[#383838] px-3 py-1.5 text-xs text-white rounded focus:outline-none focus:border-[#00D4FF]"
                        >
                          <option value="dir-active">Dự án hoạt động</option>
                          <option value="dir-archived">Dự án lưu trữ</option>
                          <option value="dir-templates">Phân khu tiêu bản</option>
                          <option value="dir-backups">Phân khu sao lưu</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Tên tệp / thư mục</label>
                      <input 
                        type="text" 
                        placeholder={newExplorerItemType === 'file' ? 'config.json hoặc setup.sh' : 'thu-muc-moi'}
                        value={newExplorerItemName}
                        onChange={(e) => setNewExplorerItemName(e.target.value)}
                        className="w-full bg-[#151515] border border-[#262626] px-3 py-1.5 text-xs text-white rounded focus:outline-none focus:border-[#00D4FF]"
                        required
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00D4FF]/85 text-[#0A0A0A] font-bold text-xs uppercase rounded"
                    >
                      Khởi Tạo Nút
                    </button>
                  </form>
                )}

                {/* Primary split layout of Directory Tree vs Nodes Lists */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                  {/* Left sub col: Static Level Directory folders lists */}
                  <div className="bg-[#111] rounded-xl border border-[#262626] p-4 space-y-4">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">Phân Vùng Thư Mục</span>
                    
                    <div className="space-y-1">
                      {storageTree?.children?.map((node) => {
                        const isSelected = selectedFolderId === node.id;
                        return (
                          <div 
                            key={node.id}
                            onClick={() => {
                              setSelectedFolderId(node.id);
                              setSelectedFile(null);
                            }}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono cursor-pointer transition-all duration-150 ${isSelected ? 'bg-[#1e1e1e] border-l-2 border-[#00D4FF] text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-[#151515]'}`}
                          >
                            <Folder className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#00D4FF]' : 'text-gray-500'}`} />
                            <span className="truncate">
                              {node.name === 'Active Projects' ? 'Dự án hoạt động' :
                               node.name === 'Archived Projects' ? 'Dự án đang lưu trữ' :
                               node.name === 'Templates block' ? 'Phân khu tiêu bản' :
                               node.name === 'Backups Pool' ? 'Phân khu sao lưu' :
                               node.name === 'Trash Bin' ? 'Thùng rác hệ thống' :
                               node.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right sub col: Active Directory View Content (Table of entries) */}
                  <div className="lg:col-span-3 bg-[#111] rounded-xl border border-[#262626] overflow-hidden flex flex-col min-h-[420px]">
                    <div className="p-4 bg-[#141414] border-b border-[#262626] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Folder className="h-4.5 w-4.5 text-[#00D4FF]" />
                        <span className="text-xs font-mono text-white">/ Bộ nhớ / <span className="text-[#00D4FF] font-bold">
                          {currentFolder?.name === 'Active Projects' ? 'Dự án hoạt động' :
                           currentFolder?.name === 'Archived Projects' ? 'Dự án đang lưu trữ' :
                           currentFolder?.name === 'Templates block' ? 'Phân khu tiêu bản' :
                           currentFolder?.name === 'Backups Pool' ? 'Phân khu sao lưu' :
                           currentFolder?.name === 'Trash Bin' ? 'Thùng rác hệ thống' :
                           currentFolder?.name || 'Duyệt bộ nhớ'}
                        </span></span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500 uppercase">
                        Đang chứa {currentFolder?.children?.length || 0} đối tượng
                      </span>
                    </div>

                    <div className="flex-1 divide-y divide-[#262626]/60">
                      {/* Check if current directory is empty */}
                      {(!currentFolder?.children || currentFolder.children.length === 0) ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center h-full">
                          <FolderPlus className="h-8 w-8 text-gray-650 mb-3" />
                          <p className="text-sm">Bản ghi phân khu lưu trữ này hoàn toàn rỗng.</p>
                          <p className="text-xs text-gray-650 mt-1 font-mono">Tạo các nút thư mục hoặc khởi tạo kho thủ công.</p>
                        </div>
                      ) : (
                        currentFolder.children.map((item) => {
                          const isRenaming = renamingNodeId === item.id;
                          return (
                            <div 
                              key={item.id} 
                              className="p-4 flex items-center justify-between hover:bg-[#151515]/60 transition-all font-mono"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {item.type === 'folder' ? (
                                  <Folder className="h-4.5 w-4.5 text-[#00D4FF] shrink-0" />
                                ) : (
                                  <FileCode className="h-4.5 w-4.5 text-gray-400 shrink-0" />
                                )}

                                {isRenaming ? (
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="text" 
                                      value={renameValue}
                                      onChange={(e) => setRenameValue(e.target.value)}
                                      className="bg-[#0A0A0A] border border-[#00D4FF] rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                                    />
                                    <button 
                                      onClick={() => handleRenameNode(item.id)}
                                      className="px-2 py-0.5 bg-emerald-500 text-black text-[10px] font-bold rounded"
                                    >
                                      Lưu
                                    </button>
                                    <button 
                                      onClick={() => setRenamingNodeId(null)}
                                      className="px-2 py-0.5 bg-gray-800 text-gray-400 text-[10px] rounded"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                ) : (
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-semibold text-white truncate">{item.name}</h4>
                                    <div className="flex items-center gap-3 mt-1 text-[9px] text-gray-550">
                                      <span>Tạo ngày {new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                                      {item.size && <span>• Dung lượng: {item.size} KB</span>}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-3 pl-3 shrink-0">
                                {/* Moving controls dropdown option */}
                                <select 
                                  value={selectedFolderId}
                                  onChange={(e) => {
                                    if (e.target.value !== selectedFolderId) {
                                      handleMoveNode(item.id, e.target.value);
                                    }
                                  }}
                                  className="bg-[#1e1e1e] border border-[#2a2a2a] text-[9.5px] rounded px-1.5 py-0.5 text-gray-400 hover:text-white"
                                >
                                  <option value="">Di chuyển tới...</option>
                                  <option value="dir-active">Đang hoạt động</option>
                                  <option value="dir-archived">Lưu trữ</option>
                                  <option value="dir-templates">Tiêu bản</option>
                                  <option value="dir-backups">Sao lưu</option>
                                  <option value="dir-trash">Thùng rác</option>
                                </select>

                                <button 
                                  onClick={() => {
                                    setRenamingNodeId(item.id);
                                    setRenameValue(item.name);
                                  }}
                                  className="text-[10px] text-gray-400 hover:text-white"
                                >
                                  Đổi tên
                                </button>

                                <button 
                                  onClick={() => handleDeleteStorageItem(item.id)}
                                  className="text-[10px] text-rose-400/80 hover:text-rose-400"
                                  title="Đưa vào thùng rác"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: PROJECT CLUSTERS */}
            {activeTab === 'projects' && (
              <div id="section-projects" className="space-y-6 animate-fade-in">
                
                {/* Header dashboard controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111] p-5 rounded-xl border border-[#262626]">
                  <div>
                    <h3 className="text-sm font-bold text-white">Hồ Sơ Toàn Bộ Dự Án & Kho Lưu Trữ</h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">Mô phỏng trạng thái vòng đời triển khai liên tục, kích hoạt bản sao lưu S3, định cấu hình thẻ tùy chỉnh.</p>
                  </div>
                  <button 
                    id="btn-trigger-register-seed"
                    onClick={() => setIsNewProjectModalOpen(true)}
                    className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-[#0A0A0A] font-bold text-xs uppercase tracking-wider rounded-md flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    Đăng Ký Dự Án
                  </button>
                </div>

                {/* New Project Registration Modal Overlay */}
                {isNewProjectModalOpen && (
                  <div className="fixed inset-0 bg-[#0A0A0A]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form 
                      onSubmit={handleCreateProject} 
                      className="bg-[#111] border border-[#262626] rounded-xl w-full max-w-xl overflow-hidden shadow-2xl relative"
                    >
                      <div className="p-5 border-b border-[#262626] flex justify-between items-center bg-[#151515]">
                        <div className="flex items-center gap-2">
                          <FolderPlus className="h-4.5 w-4.5 text-[#00D4FF]" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Đăng Ký Phân Phối Dự Án</h3>
                        </div>
                        <button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="text-gray-400 hover:text-white">
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="p-6 space-y-4 font-mono text-xs text-white">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-400 mb-1">Tên dự án (mã định danh duy nhất)</label>
                            <input 
                              type="text" 
                              placeholder="terkix-auth-module"
                              value={newProjName}
                              onChange={(e) => setNewProjName(e.target.value)}
                              className="w-full bg-[#151515] border border-[#262626] p-2 rounded focus:outline-none focus:border-[#00D4FF] text-white"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-gray-400 mb-1">Phân loại trạng thái</label>
                            <select 
                              value={newProjStatus}
                              onChange={(e) => setNewProjStatus(e.target.value as any)}
                              className="w-full bg-[#151515] border border-[#262626] p-2 rounded focus:outline-none focus:border-[#00D4FF]"
                            >
                              <option value="Active">Hoạt động thực tế</option>
                              <option value="Development">Đang phát triển</option>
                              <option value="Testing">Giai đoạn kiểm thử QA</option>
                              <option value="Maintenance">Hệ thống bảo trì</option>
                              <option value="Archived">Lưu trữ dài hạn</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-400 mb-1">Đường liên kết kho lưu trữ (Repo link)</label>
                          <input 
                            type="text" 
                            placeholder="https://github.com/terkix/auth-module"
                            value={newProjRepo}
                            onChange={(e) => setNewProjRepo(e.target.value)}
                            className="w-full bg-[#151515] border border-[#262626] p-2 rounded focus:outline-none focus:border-[#00D4FF] text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 mb-1">Mô tả tóm tắt thông số</label>
                          <textarea 
                            rows={3}
                            placeholder="Cung cấp các lưới xác thực doanh nghiệp sử dụng các vòng mã thông báo."
                            value={newProjDesc}
                            onChange={(e) => setNewProjDesc(e.target.value)}
                            className="w-full bg-[#151515] border border-[#262626] p-2 rounded focus:outline-none focus:border-[#00D4FF] text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-400 mb-1">Người quản trị</label>
                            <input 
                              type="email" 
                              value={newProjOwner}
                              onChange={(e) => setNewProjOwner(e.target.value)}
                              className="w-full bg-[#151515] border border-[#262626] p-2 rounded focus:outline-none focus:border-[#00D4FF] text-white"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-gray-400 mb-1">Các thẻ tag (ngăn cách bằng dấu phẩy)</label>
                            <input 
                              type="text" 
                              value={newProjTags}
                              onChange={(e) => setNewProjTags(e.target.value)}
                              className="w-full bg-[#151515] border border-[#262626] p-2 rounded focus:outline-none focus:border-[#00D4FF] text-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-[#151515] border-t border-[#262626] flex justify-end gap-2.5">
                        <button 
                          type="button" 
                          onClick={() => setIsNewProjectModalOpen(false)}
                          className="px-4 py-2 bg-gray-800 text-gray-400 font-bold text-xs uppercase rounded hover:bg-gray-700"
                        >
                          Hủy Bỏ
                        </button>
                        <button 
                          type="submit" 
                          className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-[#0A0A0A] font-bold text-xs uppercase rounded"
                        >
                          Triển Khai Dự Án
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Visual Project Details, Analytics & Security Audit Modal Overlay */}
                {selectedProjectForDetail && (() => {
                  const modalProject = projects.find(p => p.id === selectedProjectForDetail.id) || selectedProjectForDetail;
                  const totalCommits = getCommitHistory30Days(modalProject.id, modalProject.commits).reduce((sum, d) => sum + d.commits, 0);
                  
                  // Filter real audit logs matching this project
                  const realProjLogs = auditLogs.filter(log => {
                    const term = modalProject.name.toLowerCase();
                    return (log.details || '').toLowerCase().includes(term) || (log.action || '').toLowerCase().includes(term);
                  });
                  
                  // Synthesize default historical logs if none / too few are found to make the details rich
                  const synthLogs: AuditLog[] = [
                    {
                      id: `synth-1-${modalProject.id}`,
                      user: modalProject.owner,
                      action: 'INIT_PROJECT',
                      details: `Khởi tạo phân khu hệ thống ${modalProject.name} và liên kết với Git.`,
                      timestamp: modalProject.createdAt,
                      ip: '10.244.1.92'
                    },
                    {
                      id: `synth-2-${modalProject.id}`,
                      user: 'system',
                      action: 'STORAGE_ALLOC',
                      details: `Đã phân bổ dung lượng tối đa ${modalProject.size.toFixed(1)} MB trên phân vùng live.`,
                      timestamp: new Date(new Date(modalProject.createdAt).getTime() + 1000 * 60 * 15).toISOString(),
                      ip: 'localhost'
                    },
                    {
                      id: `synth-3-${modalProject.id}`,
                      user: modalProject.owner,
                      action: 'SSH_ACCESS_CONF',
                      details: `Cấu hình định tuyến SSH kho lưu trữ Git ${modalProject.repoUrl}.`,
                      timestamp: modalProject.updatedAt,
                      ip: '10.244.1.93'
                    }
                  ];
                  
                  // Merge logs, keep real log entries first then pad with synthesized logs to ensure a rich list of at least 3-4 logs
                  const mergedLogs = [...realProjLogs, ...synthLogs].slice(0, 5);

                  return (
                    <div className="fixed inset-0 bg-[#0A0A0A]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                      {/* Modal Card */}
                      <div className="bg-[#111] border border-[#262626] rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col font-mono text-xs max-h-[90vh]">
                        {/* Header */}
                        <div className="p-5 border-b border-[#262626] flex justify-between items-center bg-[#151515]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/30 flex items-center justify-center text-xs text-[#00D4FF] font-black shrink-0 animate-pulse">
                              {modalProject.tags[0]?.toUpperCase() || 'SYS'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{modalProject.name}</h3>
                                <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  modalProject.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                  modalProject.status === 'Development' ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20' :
                                  modalProject.status === 'Testing' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-gray-800 text-gray-400 border border-[#444]'
                                }`}>
                                  {modalProject.status === 'Active' ? 'Hoạt động' : modalProject.status === 'Development' ? 'Phát triển' : modalProject.status === 'Testing' ? 'Kiểm thử QA' : modalProject.status === 'Maintenance' ? 'Bảo trì' : 'Lưu trữ'}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 font-sans mt-0.5 truncate max-w-[400px]" title={modalProject.repoUrl}>
                                {modalProject.repoUrl}
                              </p>
                            </div>
                          </div>
                          
                          <button 
                            type="button" 
                            onClick={() => setSelectedProjectForDetail(null)} 
                            className="text-gray-400 hover:text-white transition-colors p-1"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-white">
                          
                          {/* Metadata Summary Blocks */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Owner */}
                            <div className="bg-[#151515] border border-[#222] p-3.5 rounded-lg flex items-center gap-3">
                              <div className="p-2 bg-gray-900 rounded border border-[#333]">
                                <User className="h-4 w-4 text-gray-400" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold block">Quản trị viên</span>
                                <span className="text-[11px] font-bold text-gray-200 truncate block max-w-[140px]" title={modalProject.owner}>{modalProject.owner}</span>
                              </div>
                            </div>
                            
                            {/* Capacity size */}
                            <div className="bg-[#151515] border border-[#222] p-3.5 rounded-lg flex items-center gap-3">
                              <div className="p-2 bg-gray-900 rounded border border-[#333]">
                                <Database className="h-4 w-4 text-[#00D4FF]" />
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-500 uppercase font-semibold block">Dung Lượng</span>
                                <span className="text-xs font-black text-[#00D4FF] block">{modalProject.size.toFixed(1)} MB</span>
                              </div>
                            </div>

                            {/* Git Branch */}
                            <div className="bg-[#151515] border border-[#222] p-3.5 rounded-lg flex items-center gap-3">
                              <div className="p-2 bg-gray-900 rounded border border-[#333]">
                                <GitBranch className="h-4 w-4 text-amber-400" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold block">Nhánh hiện tại</span>
                                <span className="text-[11px] font-bold text-gray-200 block truncate max-w-[140px]" title={modalProject.currentBranch}><span className="text-gray-500">⌥ </span>{modalProject.currentBranch}</span>
                              </div>
                            </div>

                            {/* Total Commits */}
                            <div className="bg-[#151515] border border-[#222] p-3.5 rounded-lg flex items-center gap-3">
                              <div className="p-2 bg-gray-900 rounded border border-[#333]">
                                <GitCommit className="h-4 w-4 text-emerald-400" />
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-500 uppercase font-semibold block">Tần suất commit</span>
                                <span className="text-[11px] font-bold text-emerald-400 block">{totalCommits} commits <span className="text-[9px] text-gray-500 font-normal">(30d)</span></span>
                              </div>
                            </div>
                          </div>

                          {/* Split layout: Metadata details and clone URLs */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Description & Technical parameters */}
                            <div className="bg-[#141414] border border-[#222] p-4 rounded-xl space-y-4">
                              <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#00D4FF] border-b border-[#222] pb-2">mô tả & thông số hệ thống</h4>
                              <p className="text-gray-400 text-xs font-sans leading-relaxed min-h-[50px]">
                                {modalProject.description || "Không có mô tả chi tiết được định cấu hình cho phân khu này."}
                              </p>
                              
                              <div className="space-y-2 pt-1">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-gray-500">Mã nhận diện (ID):</span>
                                  <span className="text-gray-300 select-all font-mono bg-gray-900 px-1.5 py-0.5 rounded">{modalProject.id}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-gray-500">Được tạo ngày:</span>
                                  <span className="text-gray-300 font-mono">{new Date(modalProject.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-gray-500">Cập nhật lúc:</span>
                                  <span className="text-gray-300 font-mono">{new Date(modalProject.updatedAt).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-gray-500">Danh mục nhãn:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {modalProject.tags.map(tag => (
                                      <span key={tag} className="text-[9px] bg-[#1c1c1c] text-gray-400 px-1.5 py-0.5 rounded border border-[#262626]">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Git routing details & Clones */}
                            <div className="bg-[#141414] border border-[#222] p-4 rounded-xl space-y-4">
                              <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#00D4FF] border-b border-[#222] pb-2">định tuyến kết nối git</h4>
                              
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <span className="text-[10px] text-gray-400 uppercase block font-semibold">Địa chỉ SSH (Khuyên dùng)</span>
                                  <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      value={getSshUrl(modalProject.repoUrl)} 
                                      readOnly
                                      className="flex-1 bg-gray-950 border border-[#222] p-1.5 rounded text-[10px] text-gray-300 select-all outline-none font-mono"
                                    />
                                    <button 
                                      onClick={() => handleQuickClone(modalProject.id, modalProject.repoUrl)}
                                      className={`px-2.5 py-1.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                                        copiedId === modalProject.id 
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.1)]' 
                                          : 'bg-gray-900 text-gray-300 border-[#222] hover:bg-gray-800'
                                      }`}
                                    >
                                      {copiedId === modalProject.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] text-gray-400 uppercase block font-semibold">Đường liên kết HTTPS</span>
                                  <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      value={modalProject.repoUrl} 
                                      readOnly
                                      className="flex-1 bg-gray-950 border border-[#222] p-1.5 rounded text-[10px] text-gray-300 select-all outline-none font-mono"
                                    />
                                    <button 
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(modalProject.repoUrl);
                                          alert('Đã copy HTTPS Repo Link!');
                                        } catch (e) {}
                                      }}
                                      className="px-2.5 py-1.5 rounded text-[11px] font-bold border bg-gray-900 text-gray-300 border-[#222] hover:bg-gray-800"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Active checkout branch list */}
                                <div className="space-y-1">
                                  <span className="text-[10px] text-gray-400 uppercase block font-semibold">Tất cả nhánh ({modalProject.branches?.length || 0})</span>
                                  <div className="flex flex-wrap gap-1.5 max-h-[70px] overflow-y-auto p-1.5 bg-gray-950 border border-[#222] rounded">
                                    {modalProject.branches?.map(b => (
                                      <span key={b} className={`text-[9px] px-2 py-0.5 rounded flex items-center gap-1 ${
                                        b === modalProject.currentBranch 
                                          ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/35 font-bold' 
                                          : 'bg-gray-900 text-gray-400 border border-[#222]'
                                      }`}>
                                        <GitBranch className="h-2.5 w-2.5" /> {b}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Larger Commit History Chart Section */}
                          <div className="bg-[#141414] border border-[#222] p-4 rounded-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-[#222] pb-2">
                              <div className="flex items-center gap-2">
                                <GitCommit className="h-4 w-4 text-[#00D4FF]" />
                                <h4 className="text-[11px] uppercase tracking-wider font-bold text-white">Biểu đồ commit chi tiết (Tần suất 30 ngày qua)</h4>
                              </div>
                              <span className="text-gray-400 text-[10px]">Tổng số: <strong className="text-[#00D4FF]">{totalCommits} commits</strong></span>
                            </div>

                            <div className="h-44 w-full mt-2 bg-gray-950/60 p-3 rounded-lg border border-[#222] relative overflow-hidden">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={getCommitHistory30Days(modalProject.id, modalProject.commits)} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1d1d1d" />
                                  <XAxis 
                                    dataKey="shortDate" 
                                    stroke="#555" 
                                    style={{ fontSize: 9 }}
                                    tickLine={false}
                                  />
                                  <YAxis 
                                    stroke="#555" 
                                    style={{ fontSize: 9 }}
                                    tickLine={false}
                                    allowDecimals={false}
                                  />
                                  <RechartsTooltip 
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        const item = payload[0].payload;
                                        return (
                                          <div className="bg-[#151515] border border-[#262626] p-2 rounded text-[10px] font-mono text-white shadow-xl">
                                            <p className="font-semibold text-gray-400">{item.date}</p>
                                            <p className="text-[#00D4FF] mt-0.5 font-bold">{item.commits} commits</p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="commits" 
                                    stroke="#00D4FF" 
                                    strokeWidth={1.5} 
                                    dot={{ r: 1.5, stroke: '#00D4FF', fill: '#00D4FF', strokeWidth: 1 }} 
                                    activeDot={{ r: 3, stroke: '#00D4FF', fill: '#0a0a0a', strokeWidth: 1 }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Detailed security logs column and Recent audits */}
                          <div className="bg-[#141414] border border-[#222] p-4 rounded-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-[#222] pb-2">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4.5 w-4.5 text-emerald-400" />
                                <h4 className="text-[11px] uppercase tracking-wider font-bold text-white">Nhật ký bảo mật & Kiểm thử ({mergedLogs.length}) Built-in</h4>
                              </div>
                              <span className="text-[8px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/10 uppercase">Security Cluster Verified</span>
                            </div>

                            <div className="divide-y divide-[#222]/60 max-h-[200px] overflow-y-auto pr-1">
                              {mergedLogs.map((log) => (
                                <div key={log.id} className="py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-[#151515]/30 transition-colors px-1 rounded">
                                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                    <div className={`mt-0.5 shrink-0 px-1 py-0.5 rounded text-[8px] font-bold font-mono tracking-wider text-center w-24 uppercase truncate ${
                                      log.action.includes('INIT') || log.action.includes('SUCCESS') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                                      log.action.includes('ERROR') || log.action.includes('FAIL') ? 'bg-rose-500/10 text-rose-450 border border-rose-500/10' :
                                      log.action.includes('DEPLOY') || log.action.includes('PUSH') ? 'bg-purple-500/10 text-purple-400 border border-purple-500/10' :
                                      log.action.includes('BACKUP') || log.action.includes('SWEEP') ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                                      'bg-blue-500/10 text-[#00D4FF] border border-[#00D4FF]/10'
                                    }`}>
                                      {log.action}
                                    </div>
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                      <p className="text-[11px] text-gray-200 leading-normal break-all md:break-normal">{log.details}</p>
                                      <div className="flex items-center gap-3 text-[10px] text-gray-555 font-sans">
                                        <span className="truncate max-w-[124px]">User: {log.user}</span>
                                        <span className="text-gray-750">|</span>
                                        <span>IP: {log.ip}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap self-end md:self-auto pl-2">
                                    {new Date(log.timestamp).toLocaleString('vi-VN')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>

                        {/* Modal Footer Controls */}
                        <div className="p-4 bg-[#151515] border-t border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 font-sans">
                          {/* Live Dynamic Operations on this project */}
                          <div className="flex flex-wrap items-center gap-2 font-mono">
                            <select 
                              value={modalProject.status} 
                              onChange={(e) => handleUpdateStatus(modalProject.id, e.target.value as any)}
                              className="bg-[#1c1c1c] border border-[#2a2a2a] text-[10px] px-2 py-1 rounded text-white cursor-pointer focus:outline-none focus:border-[#00D4FF] font-mono h-7"
                            >
                              <option value="Active">Hoạt động</option>
                              <option value="Development">Phát triển</option>
                              <option value="Testing">Kiểm thử QA</option>
                              <option value="Maintenance">Bảo trì</option>
                              <option value="Archived">Đã lưu trữ</option>
                            </select>

                            <button 
                              onClick={() => handleTestConnection(modalProject.id)}
                              disabled={connectionStatus[modalProject.id] === 'loading'}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold border transition-all cursor-pointer h-7 ${
                                connectionStatus[modalProject.id] === 'success'
                                  ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 font-bold'
                                  : connectionStatus[modalProject.id] === 'failed'
                                  ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                                  : 'bg-gray-900 border border-[#2a2a2a] hover:border-[#00D4FF]/30 text-white hover:text-[#00D4FF]'
                              }`}
                            >
                              {connectionStatus[modalProject.id] === 'loading' ? (
                                <Loader2 className="h-3 w-3 animate-spin text-[#00D4FF]" />
                              ) : (
                                <Globe className="h-3 w-3 shrink-0" />
                              )}
                              <span>
                                {connectionStatus[modalProject.id] === 'loading' ? 'Checking...' : 
                                 connectionStatus[modalProject.id] === 'success' ? 'Reachable' : 
                                 connectionStatus[modalProject.id] === 'failed' ? 'Failed' : 'Test Git Link'}
                              </span>
                            </button>

                            <button 
                              onClick={() => {
                                setSelectedProjectForGit(modalProject);
                                setSelectedProjectForDetail(null);
                              }}
                              className="px-2.5 py-1 bg-[#00D4FF]/10 border border-[#00D4FF]/25 hover:bg-[#00D4FF]/20 text-[#00D4FF] font-black text-[11px] rounded transition-all cursor-pointer flex items-center gap-1 h-7"
                            >
                              <GitCommit className="h-3.5 w-3.5" /> Điều khiển Git
                            </button>
                          </div>

                          <button 
                            type="button" 
                            onClick={() => setSelectedProjectForDetail(null)}
                            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs uppercase rounded text-center h-7 flex items-center justify-center transition-colors font-mono"
                          >
                            Đóng cửa sổ
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* View Toggles & Stats Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111] p-4 rounded-xl border border-[#262626] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold mr-1.5">Chế độ xem dự án:</span>
                    <button
                      id="btn-view-mode-grid"
                      type="button"
                      onClick={() => setProjectsViewMode('grid')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all border cursor-pointer ${
                        projectsViewMode === 'grid'
                          ? 'bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30 shadow-[0_0_8px_rgba(0,212,255,0.05)]'
                          : 'bg-[#151515] text-gray-400 border-[#222] hover:text-white hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Lưới (Grid)
                    </button>
                    <button
                      id="btn-view-mode-table"
                      type="button"
                      onClick={() => setProjectsViewMode('table')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all border cursor-pointer ${
                        projectsViewMode === 'table'
                          ? 'bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30 shadow-[0_0_8px_rgba(0,212,255,0.05)]'
                          : 'bg-[#151515] text-gray-400 border-[#222] hover:text-white hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <TableProperties className="h-3.5 w-3.5" />
                      Bảng (Table)
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
                    <div>Tổng dung lượng: <span className="text-[#00D4FF] font-bold">{projects.reduce((acc, p) => acc + p.size, 0).toFixed(1)} MB</span></div>
                    <div>Số dự án: <span className="text-white font-bold">{projects.length}</span></div>
                  </div>
                </div>

                {/* Grid lists of Registered Project Catalogs */}
                {projectsViewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
                    {filteredProjects.map((p) => {
                      const totalCommits = getCommitHistory30Days(p.id, p.commits).reduce((sum, d) => sum + d.commits, 0);
                      return (
                        <div 
                          key={p.id} 
                          onClick={() => setSelectedProjectForDetail(p)}
                          className="bg-[#111] border border-[#262626] hover:border-[#00D4FF]/45 hover:shadow-[0_0_15px_rgba(0,194,255,0.04)] p-5 rounded-xl shadow-md relative flex flex-col justify-between cursor-pointer transition-all duration-200"
                        >
                          {/* Simulated Progress overlay representation */}
                          {projectProgress[p.id] && (
                            <div className="absolute inset-0 bg-[#0A0A0AF3] backdrop-blur-[2px] flex flex-col justify-center p-5 rounded-xl z-20 font-mono animate-fade-in font-mono">
                              <div className="flex items-center justify-between text-[11px] mb-2.5">
                                <span className="text-[#00D4FF] font-bold uppercase flex items-center gap-1.5 animate-pulse">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00D4FF]" />
                                  {projectProgress[p.id].type === 'backup' ? 'Đang Sao Lưu...' : 'Đang Nén ZIP...'}
                                </span>
                                <span className="text-emerald-400 font-bold">{projectProgress[p.id].progress}%</span>
                              </div>
                              
                              <p className="text-[10px] text-gray-400 font-sans mb-3 min-h-[14px] truncate" title={projectProgress[p.id].message}>
                                {projectProgress[p.id].message}
                              </p>

                              <div className="w-full bg-[#181818] h-2 rounded-full overflow-hidden border border-[#222]">
                                <div 
                                  className="bg-gradient-to-r from-[#00D4FF] to-emerald-500 h-full rounded-full transition-all duration-100 ease-out"
                                  style={{ width: `${projectProgress[p.id].progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <span className={`text-[9px] px-2 py-0.2 rounded font-bold uppercase tracking-wider ${
                                p.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                p.status === 'Development' ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20' :
                                p.status === 'Testing' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-gray-800 text-gray-400'
                              }`}>
                                {p.status === 'Active' ? 'Hoạt động' : p.status === 'Development' ? 'Phát triển' : p.status === 'Testing' ? 'Kiểm thử QA' : p.status === 'Maintenance' ? 'Bảo trì' : 'Lưu trữ'}
                              </span>
                              <span className="text-xs text-gray-550 font-bold font-mono">{p.size.toFixed(1)} MB</span>
                            </div>

                            <h4 className="text-sm font-bold text-white truncate">{p.name}</h4>
                            <p className="text-xs text-gray-400 font-sans mt-2 line-clamp-3 min-h-[50px]">{p.description}</p>

                            <div className="flex flex-wrap gap-1 mt-3">
                              {p.tags.map((tag) => (
                                <span key={tag} className="text-[10px] bg-[#1a1a1a] text-gray-400 px-2 py-0.5 rounded border border-[#222]">
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            {/* Commit Frequency Sparkline Graph inside Project Card */}
                            <div className="mt-4 pt-3 border-t border-[#262626]/40" id={`commit-section-${p.id}`}>
                              <div className="flex justify-between items-center mb-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-semibold font-mono">
                                <span>Commit Sparkline (30d)</span>
                                <span className="text-[#00D4FF] font-bold">{totalCommits} commits</span>
                              </div>
                              <div className="h-10 w-full overflow-hidden" id={`sparkline-${p.id}`}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={getCommitHistory30Days(p.id, p.commits)} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                                    <RechartsTooltip 
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const item = payload[0].payload;
                                          return (
                                            <div className="bg-[#151515] border border-[#262626] p-1.5 px-2 rounded text-[10px] font-mono text-white shadow-xl z-30">
                                              <p className="font-semibold text-gray-400">{item.shortDate}</p>
                                              <p className="text-[#00D4FF]">{item.commits} commits</p>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Line 
                                      type="monotone" 
                                      dataKey="commits" 
                                      stroke="#00D4FF" 
                                      strokeWidth={1.5} 
                                      dot={false} 
                                      activeDot={{ r: 3, stroke: '#00D4FF', fill: '#0a0a0a' }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 border-t border-[#262626]/70 pt-4 space-y-3">
                            <div className="flex items-center justify-between text-xs text-gray-550">
                              <span>Quản trị viên:</span>
                              <span className="text-white font-medium">{p.owner}</span>
                            </div>

                            {/* SSH Copy Helper & Connection Diagnostics */}
                            <div className="grid grid-cols-2 gap-2">
                              <button 
                                id={`btn-clone-${p.id}`}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleQuickClone(p.id, p.repoUrl); }}
                                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                                  copiedId === p.id 
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.1)]' 
                                    : 'bg-[#151515] text-gray-300 border-[#222] hover:bg-[#1f1f1f] hover:text-white hover:border-[#333]'
                                }`}
                              >
                                {copiedId === p.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 text-gray-555 shrink-0" />
                                    <span>Quick Clone</span>
                                  </>
                                )}
                              </button>

                              <button 
                                id={`btn-test-conn-${p.id}`}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleTestConnection(p.id); }}
                                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                                  connectionStatus[p.id] === 'success'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                                    : connectionStatus[p.id] === 'failed'
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/40'
                                    : 'bg-[#151515] text-gray-300 border-[#222] hover:bg-[#1f1f1f] hover:text-white hover:border-[#333]'
                                }`}
                                disabled={connectionStatus[p.id] === 'loading'}
                              >
                                {connectionStatus[p.id] === 'loading' ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin text-[#00D4FF] shrink-0" />
                                    <span>Đang test...</span>
                                  </>
                                ) : connectionStatus[p.id] === 'success' ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                                    <span>Reachable</span>
                                  </>
                                ) : connectionStatus[p.id] === 'failed' ? (
                                  <>
                                    <AlertTriangle className="h-3 w-3 text-rose-455 shrink-0" />
                                    <span>Failed</span>
                                  </>
                                ) : (
                                  <>
                                    <Globe className="h-3 w-3 text-gray-555 shrink-0" />
                                    <span>Test Link</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Lifecycle update operations */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#262626]/40">
                              <select 
                                value={p.status} 
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => { e.stopPropagation(); handleUpdateStatus(p.id, e.target.value as any); }}
                                className="bg-[#1e1e1e] border border-[#2a2a2a] text-xs px-2 py-1.5 text-white rounded cursor-pointer focus:outline-none focus:border-[#00D4FF]"
                              >
                                <option value="Active">Hoạt động</option>
                                <option value="Development">Phát triển</option>
                                <option value="Testing">Kiểm thử QA</option>
                                <option value="Maintenance">Bảo trì</option>
                                <option value="Archived">Đã lưu trữ</option>
                              </select>

                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedProjectForGit(p); }}
                                className="bg-[#00D4FF]/10 border border-[#00D4FF]/25 text-[#00D4FF] font-bold text-xs px-2 py-1.5 rounded hover:bg-[#00D4FF]/20 transition-all text-center cursor-pointer"
                              >
                                Điều khiển Git
                              </button>
                            </div>

                            {/* Trigger database backup or delete */}
                            <div className="flex items-center justify-between mt-1 text-[10px] text-gray-555 pt-1.5 border-t border-[#1e1e1e]">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleTriggerBackup(p.id, 'Incremental'); }}
                                className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <RefreshCw className="h-3 w-3" /> Sao lưu nhanh
                              </button>
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                                className="text-rose-400/80 hover:text-rose-500 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" /> Giải phóng phân khu
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Tabular Table layout for high-density capacity comparison and detailed tracking */
                  <div className="bg-[#111] border border-[#262626] rounded-xl overflow-hidden shadow-md overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[850px] font-mono text-xs">
                      <thead>
                        <tr className="bg-[#141414] border-b border-[#262626] text-[10px] uppercase text-gray-500 tracking-wider">
                          <th className="py-3 px-4 font-bold">Phân Khu / Mô Tả Dự Án</th>
                          <th className="py-3 px-4 font-bold">Trạng Thái</th>
                          <th className="py-3 px-4 font-bold">Dung Lượng</th>
                          <th className="py-3 px-4 font-bold">Quản Trị Viên</th>
                          <th className="py-3 px-4 font-bold">Tần Suất Commit (30d)</th>
                          <th className="py-3 px-4 font-bold text-center">Kết nối & SSH</th>
                          <th className="py-3 px-4 font-bold">Cập Nhật Lần Cuối</th>
                          <th className="py-3 px-4 font-bold text-right pr-6">Thao Tác Hệ Thống</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#262626]/40">
                        {filteredProjects.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-gray-400 font-sans">
                              Không tìm thấy phân khu dự án nào phù hợp với bộ lọc hiển thị.
                            </td>
                          </tr>
                        ) : (
                          filteredProjects.map((p) => {
                            const isProgressing = !!projectProgress[p.id];
                            if (isProgressing) {
                              const info = projectProgress[p.id];
                              return (
                                <tr key={p.id} className="bg-[#121212]/40 animate-fade-in border-b border-[#262626]/60">
                                  <td colSpan={8} className="p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono w-full">
                                      <div className="flex items-center gap-3">
                                        <Loader2 className="h-4 w-4 animate-spin text-[#00D4FF]" />
                                        <div>
                                          <span className="text-white font-bold text-xs">{p.name}</span>
                                          <span className="text-[#00D4FF] font-bold text-[10px] bg-[#00D4FF]/10 border border-[#00D4FF]/20 px-1.5 py-0.5 rounded ml-3">
                                            {info?.type === 'backup' ? 'SAO LƯU' : 'NÉN ZIP'}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex-1 max-w-sm sm:max-w-md lg:max-w-xl mx-2">
                                        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                          <span className="truncate max-w-[250px]">{info?.message}</span>
                                          <span className="text-emerald-400 font-bold ml-2">{info?.progress}%</span>
                                        </div>
                                        <div className="w-full bg-[#1c1c1c] h-1.5 rounded-full overflow-hidden border border-[#222]">
                                          <div 
                                            className="bg-gradient-to-r from-[#00D4FF] to-emerald-500 h-full rounded-full transition-all duration-100 ease-out"
                                            style={{ width: `${info?.progress || 0}%` }}
                                          />
                                        </div>
                                      </div>
                                      <span className="text-gray-500 text-[11px] self-end sm:self-auto italic">Vui lòng chờ...</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={p.id} className="hover:bg-[#151515]/40 transition-all border-b border-[#262626]/30">
                                {/* Project details */}
                                <td className="py-4 px-4 max-w-[280px]">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded bg-[#1a1a1a] border border-[#262626] flex items-center justify-center text-[10px] text-[#00D4FF] font-bold shrink-0">
                                      {p.tags[0]?.toUpperCase() || 'SYS'}
                                    </div>
                                    <div className="min-w-0">
                                      <span 
                                        onClick={() => setSelectedProjectForDetail(p)}
                                        className="font-bold text-white block truncate text-xs hover:text-[#00D4FF] hover:underline cursor-pointer transition-colors"
                                      >
                                        {p.name}
                                      </span>
                                      <span className="text-gray-400 text-[11px] font-sans block mt-0.5 max-w-[250px] truncate" title={p.description}>
                                        {p.description}
                                      </span>
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {p.tags.map(tag => (
                                          <span key={tag} className="text-[9px] bg-[#161616] text-gray-400 px-1.5 py-0.2 rounded border border-[#222]">
                                            #{tag}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="py-4 px-4 whitespace-nowrap align-middle">
                                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                    p.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                    p.status === 'Development' ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20' :
                                    p.status === 'Testing' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                    'bg-gray-800 text-gray-400'
                                  }`}>
                                    {p.status === 'Active' ? 'Hoạt động' : p.status === 'Development' ? 'Phát triển' : p.status === 'Testing' ? 'Kiểm thử QA' : p.status === 'Maintenance' ? 'Bảo trì' : 'Lưu trữ'}
                                  </span>
                                </td>

                                {/* Capacity size */}
                                <td className="py-4 px-4 whitespace-nowrap align-middle">
                                  <div className="flex flex-col">
                                    <span className="text-xs text-white font-bold font-mono">{p.size.toFixed(1)} MB</span>
                                    <span className="text-[10px] text-gray-500 font-sans mt-0.5">Kích thước đĩa</span>
                                  </div>
                                </td>

                                {/* Administrator Owner */}
                                <td className="py-4 px-4 whitespace-nowrap align-middle text-gray-300">
                                  <div className="flex items-center gap-1.5">
                                    <User className="h-3 w-3 text-gray-500" />
                                    <span className="font-sans text-[11px]" title={p.owner}>{p.owner.split('@')[0]}</span>
                                  </div>
                                </td>

                                {/* Commit Frequency Sparkline Graph Column */}
                                <td className="py-4 px-4 whitespace-nowrap align-middle">
                                  <div className="h-8 w-28" id={`tbl-sparkline-${p.id}`}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={getCommitHistory30Days(p.id, p.commits)} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                                        <RechartsTooltip 
                                          content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                              const item = payload[0].payload;
                                              return (
                                                <div className="bg-[#151515] border border-[#262626] p-1 px-1.5 rounded text-[9px] font-mono text-white shadow-xl z-30">
                                                  <p className="font-semibold text-gray-400">{item.shortDate}</p>
                                                  <p className="text-[#00D4FF]">{item.commits} commits</p>
                                                </div>
                                              );
                                            }
                                            return null;
                                          }}
                                        />
                                        <Line 
                                          type="monotone" 
                                          dataKey="commits" 
                                          stroke="#00D4FF" 
                                          strokeWidth={1.2} 
                                          dot={false} 
                                          activeDot={{ r: 2.5, stroke: '#00D4FF', fill: '#0a0a0a' }}
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                  <div className="text-[9px] text-gray-500 font-sans mt-1">
                                    Tổng: <span className="text-[#00D4FF] font-bold">{getCommitHistory30Days(p.id, p.commits).reduce((sum, d) => sum + d.commits, 0)} commits</span>
                                  </div>
                                </td>

                                {/* Quick Diagnostics Connect & Copy-SSH SSH address */}
                                <td className="py-4 px-4 whitespace-nowrap align-middle text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {/* Test Link Button */}
                                    <button 
                                      id={`btn-tbl-test-conn-${p.id}`}
                                      type="button"
                                      onClick={() => handleTestConnection(p.id)}
                                      title="Kiểm tra kết nối kho Git"
                                      className={`flex items-center justify-center p-1.5 rounded text-xs border transition-all cursor-pointer ${
                                        connectionStatus[p.id] === 'success'
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                                          : connectionStatus[p.id] === 'failed'
                                          ? 'bg-rose-500/10 text-rose-450 border-rose-500/45'
                                          : 'bg-[#151515] text-gray-400 border-[#222] hover:bg-[#1f1f1f] hover:text-white hover:border-[#333]'
                                      }`}
                                      disabled={connectionStatus[p.id] === 'loading'}
                                    >
                                      {connectionStatus[p.id] === 'loading' ? (
                                        <Loader2 className="h-3 w-3 animate-spin text-[#00D4FF]" />
                                      ) : connectionStatus[p.id] === 'success' ? (
                                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                      ) : connectionStatus[p.id] === 'failed' ? (
                                        <AlertTriangle className="h-3 w-3 text-rose-455" />
                                      ) : (
                                        <Globe className="h-3 w-3 text-gray-500" />
                                      )}
                                    </button>

                                    {/* Quick Clone Button */}
                                    <button 
                                      id={`btn-tbl-clone-${p.id}`}
                                      type="button"
                                      onClick={() => handleQuickClone(p.id, p.repoUrl)}
                                      title="Sao chép địa chỉ SSH kho chứa"
                                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                        copiedId === p.id 
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.1)]' 
                                          : 'bg-[#151515] text-gray-300 border-[#222] hover:bg-[#1f1f1f] hover:text-white hover:border-[#333]'
                                      }`}
                                    >
                                      {copiedId === p.id ? (
                                        <>
                                          <Check className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                                          <span>Copied!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-2.5 w-2.5 text-gray-500 shrink-0" />
                                          <span>Clone SSH</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </td>

                                {/* Updated At date */}
                                <td className="py-4 px-4 whitespace-nowrap align-middle font-mono text-[11px] text-gray-400">
                                  <div className="flex flex-col">
                                    <span>{new Date(p.updatedAt).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                                    <span className="text-[10px] text-gray-500 font-sans mt-0.5">Cập nhật</span>
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="py-4 px-4 text-right align-middle whitespace-nowrap pr-6">
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    <select 
                                      value={p.status} 
                                      onChange={(e) => handleUpdateStatus(p.id, e.target.value as any)}
                                      className="bg-[#1a1a1a] border border-[#2a2a2a] text-xs px-2 py-1 text-white rounded cursor-pointer focus:outline-none focus:border-[#00D4FF]"
                                    >
                                      <option value="Active">Hoạt động</option>
                                      <option value="Development">Phát triển</option>
                                      <option value="Testing">Kiểm thử</option>
                                      <option value="Maintenance">Bảo trì</option>
                                      <option value="Archived">Đóng lưu</option>
                                    </select>

                                    <button 
                                      onClick={() => setSelectedProjectForGit(p)}
                                      className="bg-[#00D4FF]/10 hover:bg-[#00D4FF]/25 border border-[#00D4FF]/20 text-[#00D4FF] font-bold text-xs px-2.5 py-1 rounded transition-colors"
                                    >
                                      Git
                                    </button>

                                    <button 
                                      id={`btn-tbl-backup-${p.id}`}
                                      onClick={() => handleTriggerBackup(p.id, 'Incremental')}
                                      title="Sao lưu nhanh"
                                      className="p-1 px-1.5 hover:bg-[#1a1a1a] text-gray-400 hover:text-white rounded border border-[#222]/80 transition-colors"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
                                    </button>

                                    <button 
                                      id={`btn-tbl-delete-${p.id}`}
                                      onClick={() => handleDeleteProject(p.id)}
                                      title="Giải phóng phân khu"
                                      className="p-1 px-1.5 hover:bg-[#2c1a1d] text-rose-450 hover:text-rose-450 rounded border border-[#222]/80 transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            )}

            {/* TAB CONTENT: BACKUP SNAPSHOTS */}
            {activeTab === 'backup' && (
              <div id="section-backup" className="space-y-6 animate-fade-in font-mono">
                
                {/* Visual grid explaining Backup capabilities */}
                <div className="bg-[#111] p-5 rounded-xl border border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hệ Thống Đảm Bảo Khôi Phục Sau Sự Cố</h3>
                    <p className="text-xs text-gray-400 mt-1">Sao chụp snapshot thủ công, khôi phục phân vùng toàn hệ thống, giám sát nhật ký truyền dữ liệu cổng S3.</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <select id="backup-p-selector" className="bg-[#151515] border border-[#262626] text-xs py-1.5 px-3 rounded text-white font-mono">
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button 
                      onClick={() => {
                        const sel = document.getElementById('backup-p-selector') as HTMLSelectElement;
                        if (sel) handleTriggerBackup(sel.value, 'Full');
                      }}
                      className="px-4 py-1.5 bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-[#0A0A0A] font-bold text-xs uppercase rounded"
                    >
                      Sao Lưu Toàn Diện
                    </button>
                  </div>
                </div>

                {/* Active Backups Progress Indicators */}
                {Object.keys(projectProgress).some(pId => projectProgress[pId]?.type === 'backup') && (
                  <div className="bg-[#111] p-5 rounded-xl border border-[#262626] space-y-4 animate-fade-in">
                    <span className="text-xs font-bold text-[#00D4FF] uppercase tracking-wider block">Tiến Trình Sao Lưu Đang Hoạt Động</span>
                    <div className="space-y-4">
                      {Object.keys(projectProgress)
                        .filter(pId => projectProgress[pId]?.type === 'backup')
                        .map((pId) => {
                          const info = projectProgress[pId];
                          const pObj = projects.find(proj => proj.id === pId);
                          return (
                            <div key={pId} className="space-y-1.5 p-3 rounded bg-[#161616] border border-[#222]">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-white uppercase">{pObj?.name || 'Vùng nhớ'}</span>
                                <span className="text-gray-400 font-sans text-[11px] truncate max-w-[200px] md:max-w-[400px]">{info?.message}</span>
                                <span className="text-emerald-400 font-bold">{info?.progress}%</span>
                              </div>
                              <div className="w-full bg-[#202020] h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-[#00D4FF] to-emerald-500 h-full rounded-full transition-all duration-100" 
                                  style={{ width: `${info?.progress || 0}%` }} 
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Checkpoint logs of backups */}
                <div className="bg-[#111] rounded-xl border border-[#262626] overflow-hidden">
                  <div className="p-4 bg-[#141414] border-b border-[#262626]">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Mục Lục Các Bản Snapshot Lịch Sử</span>
                  </div>

                  <div className="divide-y divide-[#262626]">
                    {backups.map((b) => (
                      <div key={b.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-[#151515]/50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded border flex flex-col items-center justify-center text-[9px] font-bold leading-none shrink-0 ${
                            b.status === 'Success' ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-400' : 'bg-rose-950/20 border-rose-900/60 text-rose-400'
                          }`}>
                            <span>{b.type === 'Incremental' ? 'TĂNG DẦN' : b.type === 'Snapshot' ? 'ẢNH CHỤP' : 'TOÀN BỘ'}</span>
                            <span className="text-[8px] mt-1 font-normal">PHÂN KHU</span>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white">{b.name}</h4>
                            <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                              <span>Đối tượng: <span className="text-[#00D4FF] font-semibold">{b.projectName || 'Cluster'}</span></span>
                              <span>•</span>
                              <span>Dung lượng: {b.size.toFixed(1)} MB</span>
                              <span>•</span>
                              <span>Thời gian: {new Date(b.date).toLocaleString('vi-VN')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 md:mt-0 flex items-center gap-3 pl-14 md:pl-0">
                          <span className={`text-[9px] font-bold uppercase py-0.5 px-2 rounded ${b.status === 'Success' ? 'bg-emerald-950/40 text-emerald-400 text-xs border border-emerald-900/40' : 'bg-rose-950/40 text-rose-400 text-xs border border-rose-900/40'}`}>
                            {b.status === 'Success' ? 'Thành công' : 'Thất bại'}
                          </span>
                          
                          {b.status === 'Success' && (
                            <button 
                              onClick={() => handleRestoreBackup(b.id, b.name)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-[10px] uppercase rounded"
                            >
                              Khôi Phục Trạng Thái
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: BULK COMPRESSION & ARCHIVE ROOM */}
            {activeTab === 'archive' && (
              <div id="section-archive" className="space-y-6 animate-fade-in font-mono">
                
                {/* Explain Archive Room */}
                <div className="bg-[#111] p-5 rounded-xl border border-[#262626] space-y-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Trung Tâm Lưu Trữ Hệ Thống</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    Lưu trữ các phân vùng không hoạt động vào các tệp đóng gói .ZIP, giải phóng tới 55% tệp cache dung lượng ổ đĩa. 
                    Chọn dự án từ danh sách dưới đây để bắt đầu gói nén và tải về.
                  </p>
                </div>

                {zipResult && (
                  <div className="bg-emerald-950/20 border border-emerald-900/60 p-5 rounded-xl flex items-start gap-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-widest">Nén Phân Vùng Thành Công</h4>
                      <p className="text-xs text-gray-300 mt-2">Đôi tệp nén lưu trữ đã được khởi tạo từ các phân khối đích:</p>
                      <ul className="text-xs text-gray-400 mt-2 space-y-1 pl-4 list-disc font-sans">
                        <li>Tên phân khối tệp: <span className="text-white font-mono">{zipResult.archiveName}</span></li>
                        <li>Dung lượng đĩa khôi phục được: <span className="text-emerald-400 font-bold font-mono">{zipResult.totalCompressedSizeMb.toFixed(2)} MB</span></li>
                        <li>Số lượng phân khu đã đóng gói: <span className="text-white font-mono">{zipResult.filesCount} thư mục</span></li>
                      </ul>
                      <button 
                        onClick={() => {
                          alert(`Đang tải tệp tin lưu trữ: ${zipResult.archiveName}`);
                        }}
                        className="mt-4 px-3 py-1 bg-[#00D4FF] text-[#0A0A0A] text-[10px] font-bold uppercase rounded flex items-center gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" /> Tải Xuống Tệp ZIP
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-[#111] border border-[#262626] rounded-xl overflow-hidden shadow-lg">
                  <div className="p-4 bg-[#141414] border-b border-[#262626] flex justify-between items-center">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Danh Sách Dự Án Đóng Gói ZIP</span>
                    <button 
                      onClick={handleZipSelection}
                      disabled={archiveSelection.length === 0}
                      className={`px-4 py-1 bg-[#00D4FF] text-[#0A0A0A] font-bold text-xs uppercase rounded hover:bg-[#00D4FF]/80 ${archiveSelection.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      Nén Thành Tệp ZIP ({archiveSelection.length})
                    </button>
                  </div>

                  <div className="p-4 divide-y divide-[#262626]/70">
                    {projects.map((p) => {
                      const isChecked = archiveSelection.includes(p.id);
                      return (
                        <div key={p.id} className="py-3 flex flex-col justify-center relative min-h-[44px]">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                disabled={!!projectProgress[p.id]}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setArchiveSelection(prev => [...prev, p.id]);
                                  } else {
                                    setArchiveSelection(prev => prev.filter(id => id !== p.id));
                                  }
                                }}
                                className="accent-[#00D4FF] h-4 w-4 rounded border-[#262626] bg-[#151515] disabled:opacity-35"
                              />
                              <div>
                                <span className="text-white font-bold">{p.name}</span>
                                <span className="text-gray-550 ml-2">({p.status === 'Active' ? 'Hoạt động' : p.status === 'Development' ? 'Phát triển' : 'Khác'})</span>
                              </div>
                            </div>
                            <span className="text-gray-400 font-mono">{p.size.toFixed(1)} MB</span>
                          </div>

                          {/* Inline Progress Bar for Archive Room */}
                          {projectProgress[p.id] && (
                            <div className="mt-2 text-[11px] font-mono animate-fade-in bg-[#151515] p-2.5 rounded border border-[#222]">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[#00D4FF] font-bold flex items-center gap-1.5 animate-pulse">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {projectProgress[p.id].message}
                                </span>
                                <span className="text-emerald-400 font-bold">{projectProgress[p.id].progress}%</span>
                              </div>
                              <div className="w-full bg-[#202020] h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-[#00D4FF] to-emerald-500 h-full rounded-full transition-all duration-100 shadow-[0_0_4px_rgba(0,212,255,0.3)]"
                                  style={{ width: `${projectProgress[p.id].progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>



                {/* HISTORICAL ARCHIVE METADATA LOGS & EXPORTING CONTROLS */}
                <div id="section-archive-logs-registry" className="bg-[#111] border border-[#262626] rounded-xl overflow-hidden shadow-lg space-y-4">
                  <div className="p-4 bg-[#141414] border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                    <div>
                      <span className="text-xs font-bold text-white uppercase tracking-wider block">Sổ Đăng Ký Các Gói Lưu Trữ</span>
                      <span className="text-[10px] text-gray-500 font-sans mt-0.5 block">Cơ sở dữ liệu lịch sử các phân vùng hệ thống và các khối logic đã nén.</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        id="btn-export-all-json"
                        onClick={handleExportAllJSON}
                        disabled={archives.length === 0}
                        className="px-2.5 py-1 bg-[#1A1A1A] text-white hover:bg-[#252525] border border-[#333] hover:border-[#444] rounded text-[10px] font-bold uppercase flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Xuất toàn bộ lịch sử lưu trữ dưới dạng tệp JSON"
                      >
                        <FileJson className="h-3.5 w-3.5 text-[#00D4FF]" /> Xuất Toàn Bộ JSON
                      </button>
                      <button 
                        id="btn-export-all-csv"
                        onClick={handleExportAllCSV}
                        disabled={archives.length === 0}
                        className="px-2.5 py-1 bg-[#1A1A1A] text-white hover:bg-[#252525] border border-[#333] hover:border-[#444] rounded text-[10px] font-bold uppercase flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Xuất toàn bộ lịch sử lưu trữ dưới dạng tệp CSV"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Xuất Toàn Bộ CSV
                      </button>
                    </div>
                  </div>

                  {archives.length === 0 ? (
                    <div className="p-8 text-center text-gray-550 text-xs font-mono">
                      Không tìm thấy lịch sử lưu trữ tệp tin trong phân vùng đĩa vật lý.
                    </div>
                  ) : (
                    <div className="p-4 space-y-4 font-mono">
                      {/* Responsive Grid list of archived bundles */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {archives.map((arch) => (
                          <div 
                            key={arch.id} 
                            style={{ contentVisibility: 'auto' }}
                            className="bg-[#0D0D0D] border border-[#222] hover:border-[#2a2a2a] p-4 rounded-lg flex flex-col justify-between gap-3 transition-colors"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <button 
                                  id={`btn-show-archive-details-${arch.id}`}
                                  onClick={() => setSelectedArchiveForTree(arch)}
                                  className="flex items-center gap-2 overflow-hidden text-left hover:underline group/title select-none focus:outline-none"
                                  title={`Nhấp để xem danh sách cây thư mục tệp tin bên trong ${arch.archiveName}`}
                                >
                                  <Archive className="h-4 w-4 text-[#00D4FF] shrink-0 group-hover/title:scale-115 transition-transform" />
                                  <span className="text-white font-bold text-xs truncate group-hover/title:text-[#00D4FF] transition-colors">
                                    {arch.archiveName}
                                  </span>
                                </button>
                                <span className="text-[9px] bg-[#1a1a1a] border border-[#222] text-[#00D4FF] font-mono px-1.5 py-0.5 rounded uppercase shrink-0">
                                  {arch.id}
                                </span>
                              </div>

                              <div className="space-y-1 font-sans text-xs text-gray-400">
                                <div className="flex justify-between">
                                  <span className="text-[10px] uppercase font-mono text-gray-500">Đã đóng gói:</span>
                                  <span className="text-white font-mono break-all text-right max-w-[200px] truncate" title={arch.projectNames.join(', ')}>
                                    {arch.projectNames.join(', ')}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[10px] uppercase font-mono text-gray-500">Dung lượng cache đã nén:</span>
                                  <span className="text-emerald-400 font-mono font-bold">
                                    {arch.totalCompressedSizeMb.toFixed(2)} MB
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[10px] uppercase font-mono text-gray-500">Khởi tạo lúc:</span>
                                  <span className="text-gray-300 font-mono">
                                    {new Date(arch.createdAt).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Export / actions tray */}
                            <div className="border-t border-[#222]/60 pt-2.5 flex items-center justify-between gap-2 overflow-x-auto">
                              <button 
                                onClick={() => alert(`Đang tải xuống tệp lưu trữ vật lý: ${arch.archiveName}`)}
                                className="px-2 py-1 bg-[#151515] hover:bg-[#1f1f1f] text-gray-300 hover:text-white rounded text-[10px] uppercase font-bold flex items-center gap-1 transition-all shrink-0"
                              >
                                <Download className="h-3 w-3 text-gray-400" /> TẢI ZIP
                              </button>

                              <div className="flex items-center gap-1.5 shrink-0 font-sans">
                                <button 
                                  onClick={() => handleExportSingleJSON(arch)}
                                  className="px-2 py-1 bg-[#151515] hover:bg-[#1f1f1f] text-gray-300 hover:text-[#00D4FF] rounded text-[10px] uppercase font-bold flex items-center gap-1 transition-all"
                                  title="Xuất bản ghi thông tin lưu trữ đơn lẻ dưới dạng JSON"
                                >
                                  <FileJson className="h-3 w-3 text-gray-400" /> JSON
                                </button>
                                <button 
                                  onClick={() => handleExportSingleCSV(arch)}
                                  className="px-2 py-1 bg-[#151515] hover:bg-[#1f1f1f] text-gray-300 hover:text-emerald-400 rounded text-[10px] uppercase font-bold flex items-center gap-1 transition-all"
                                  title="Xuất bản ghi thông tin lưu trữ đơn lẻ dưới dạng CSV"
                                >
                                  <FileSpreadsheet className="h-3 w-3 text-gray-400" /> CSV
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB CONTENT: SECURITY & AUDIT TRAIL */}
            {activeTab === 'security' && (
              <div id="section-security" className="space-y-6 animate-fade-in font-mono">
                
                {/* Explainer Block */}
                <div className="bg-[#111] p-5 rounded-xl border border-[#262626]">
                  <span className="text-[10px] text-gray-550 uppercase tracking-widest font-bold">Mã Hóa Hệ Thống & Khóa Truy Cập</span>
                  <h3 className="text-sm font-bold text-white mt-1 uppercase tracking-wide">Nhật ký khảo sát sự kiện kiểm toán</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-sans mt-1.5">
                    Tất cả các hành động liên quan đến cấu trúc file vật lý, sửa đổi mã nguồn git commits, hoặc khôi phục snapshot đều được ký mã hóa và ghi chép chi tiết dưới IP của nhà điều hành trong nhật ký sự kiện hệ thống.
                  </p>
                </div>

                {/* Detailed Table listing Audit activities */}
                <div className="bg-[#111] rounded-xl border border-[#262626] overflow-hidden">
                  <div className="p-4 bg-[#141414] border-b border-[#262626]">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Danh Sách Sự Kiện Truy Cập</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#161616] text-gray-200 border-b border-[#262626]">
                        <tr>
                          <th className="p-4">Hành Động Hệ Thống</th>
                          <th className="p-4">Tài Khoản Điều Hành</th>
                          <th className="p-4">Chi Tiết Phân Phối</th>
                          <th className="p-4">Địa Chỉ IP</th>
                          <th className="p-4">Thời Gian Xác Thực</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#262626]">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-[#151515]/60 transition-colors">
                            <td className="p-4 font-bold text-[#00D4FF]">{log.action}</td>
                            <td className="p-4 text-white font-medium">{log.user}</td>
                            <td className="p-4 text-gray-300 max-w-sm truncate">{log.details}</td>
                            <td className="p-4 text-gray-500">{log.ip}</td>
                            <td className="p-4 text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: INTEGRATED GEMINI AI CO-PILOT */}
            {activeTab === 'ai' && (
              <div id="section-ai" className="space-y-6 animate-fade-in flex flex-col h-[calc(100vh-140px)]">
                
                {/* Header explaining AI capabilities */}
                <div className="bg-[#111] p-4 rounded-xl border border-[#262626] shrink-0">
                  <div className="flex items-center gap-2.5">
                    <Zap className="h-4.5 w-4.5 text-[#00D4FF]" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Trợ Lý Ảo RKix AI Co-Pilot</h3>
                  </div>
                  <p className="text-xs text-gray-400 font-sans mt-1">
                    Được hỗ trợ bởi **Gemini 3.5**, giao diện này phân tích sức khỏe thư mục đĩa, viết kịch bản script, tối ưu và quản lý cấu hình các cụm lưu trữ S3.
                  </p>
                </div>

                {/* Split layout: presets on left/top, chat interface on remaining */}
                <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">

                  {/* Left Column: Preset triggers / Quick tips */}
                  <div className="w-full lg:w-72 bg-[#111] border border-[#262626] p-4 rounded-xl flex flex-col justify-between shrink-0 font-mono">
                    <div>
                      <span className="text-[10px] text-gray-550 uppercase tracking-widest font-bold">Câu hỏi gợi ý nhanh</span>
                      <p className="text-[11px] text-gray-405 font-sans mt-1">Nhấp vào gợi ý để điền nhanh câu hỏi:</p>
                      
                      <div className="mt-4 space-y-2 text-xs">
                        <button 
                          onClick={() => handlePresetAiPrompt('Hãy phân tích mức độ sử dụng dung lượng lưu trữ hiện tại và đề xuất tối ưu.')}
                          className="w-full p-2.5 bg-[#151515] hover:bg-[#1f1f1f] text-gray-300 hover:text-[#00D4FF] border border-[#222] rounded-lg text-left transition-all leading-tight font-sans"
                        >
                          📊 Phân tích & tối ưu dung lượng đĩa
                        </button>
                        
                        <button 
                          onClick={() => handlePresetAiPrompt('Viết file docker-compose chuẩn cho dự án rkix-storage-gateway chạy dịch vụ Go và cụm MinIO.')}
                          className="w-full p-2.5 bg-[#151515] hover:bg-[#1f1f1f] text-gray-300 hover:text-[#00D4FF] border border-[#222] rounded-lg text-left transition-all leading-tight font-sans"
                        >
                          🐳 Tạo file Docker-compose Go & MinIO
                        </button>

                        <button 
                          onClick={() => handlePresetAiPrompt('Làm thế nào để cấu hình CI tự động lưu trữ backup lên Amazon S3?')}
                          className="w-full p-2.5 bg-[#151515] hover:bg-[#1f1f1f] text-gray-300 hover:text-[#00D4FF] border border-[#222] rounded-lg text-left transition-all leading-tight font-sans"
                        >
                          ☁️ Cấu hình GitHub Actions S3 block
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-[#151515] border border-[#262626] rounded-lg mt-4 text-[10px] text-gray-400 font-sans">
                      <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#00D4FF] font-bold uppercase mb-1">
                        <Loader2 className="h-3 w-3 animate-pulse" /> Dữ liệu trực tiếp
                      </div>
                      AI có thể nhận diện danh sách dự án của bạn, thư mục đang mở ({selectedFolderId}), và kho lưu trữ được lựa chọn.
                    </div>
                  </div>

                  {/* Right Column: Chat interface */}
                  <div className="flex-1 bg-[#111] border border-[#262626] rounded-xl flex flex-col overflow-hidden min-h-0 shadow-lg">
                    {/* Chat log displays */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`flex flex-col max-w-[85%] ${msg.isAi ? 'self-start mr-auto' : 'self-end ml-auto items-end'}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-mono shrink-0 ${msg.isAi ? 'text-[#00D4FF] font-bold' : 'text-gray-400'}`}>
                              {msg.sender === 'RKix AI' ? 'Trợ Lý AI' : msg.sender}
                            </span>
                            <span className="text-[9px] text-gray-550 font-mono">{msg.time}</span>
                            {msg.isOffline && (
                              <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded font-mono font-bold leading-none">
                                OFFLINE
                              </span>
                            )}
                          </div>

                          <div 
                            className={`p-3 rounded-lg text-xs font-sans ring-1 leading-relaxed ${
                              msg.isAi 
                                ? 'bg-[#151515]/90 text-gray-200 border border-[#242424] ring-transparent' 
                                : 'bg-[#00D4FF]/10 text-white border border-[#00D4FF]/20 ring-transparent'
                            }`}
                          >
                            <div className="whitespace-pre-line prose prose-invert max-w-none">
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      ))}
                      {aiLoading && (
                        <div className="flex gap-2 items-center text-xs font-mono text-[#00D4FF] bg-[#00D4FF]/5 border border-[#00D4FF]/10 p-3 rounded-lg w-[200px] animate-pulse">
                          <Loader2 className="h-4 w-4 animate-spin" /> Trợ lý AI đang phân tích dữ liệu...
                        </div>
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Chat console input box */}
                    <form onSubmit={handleSendAiMessage} className="p-3 bg-[#131313] border-t border-[#262626] flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Hỏi AI Co-Pilot về cấu hình S3, Docker, hoặc phân tích ổ đĩa..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={aiLoading}
                        className="flex-1 bg-[#090909] border border-[#262626] hover:border-[#383838] focus:border-[#00D4FF] px-3.5 py-2 rounded-lg text-xs text-white focus:outline-none transition-all placeholder-gray-500"
                        required
                      />
                      <button 
                        type="submit"
                        disabled={aiLoading}
                        className="p-2 bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-[#0A0A0A] rounded-lg cursor-pointer flex items-center justify-center shrink-0 hover:scale-101 active:scale-99 transition-all disabled:opacity-40"
                      >
                        <Send className="h-4.5 w-4.5" />
                      </button>
                    </form>
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {/* 3. Global fixed-height status footer container matching the elegant theme specification */}
        <footer className="h-12 border-t border-[#262626] flex items-center justify-between px-8 text-[10px] text-gray-500 uppercase tracking-widest bg-[#0D0D0D] shrink-0 font-mono">
          <div className="flex gap-6 font-mono">
            <span>v4.2.1-ổn định</span>
            <span className="hidden md:inline text-[#00D4FF]">API: Độ trễ dưới 12ms</span>
          </div>
          <div className="flex gap-6 items-center">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 
              Cụm Máy Chủ: Đang Hoạt Động
            </span>
            <span>© 2026 Terkix Labs</span>
          </div>
        </footer>

        {/* INTERACTIVE ZIP ARCHIVE TREE MODAL POPUP */}
        {selectedArchiveForTree && (
          <div 
            id="archive-tree-modal-overlay"
            className="fixed inset-0 bg-[#000000]/85 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all duration-300"
            onClick={() => setSelectedArchiveForTree(null)}
          >
            <div 
              id="archive-tree-modal-container"
              className="bg-[#0D0D0D] border border-[#262626] rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="p-4 bg-[#141414] border-b border-[#262626] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1 px-2 rounded bg-cyan-950/40 border border-[#00D4FF]/30">
                    <Archive className="h-4 w-4 text-[#00D4FF]" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-mono font-bold text-white block tracking-wider">Trình Khám Phá Nội Dung Gói Lưu Trữ ZIP</span>
                    <span className="text-[10px] text-gray-400 font-sans block mt-0.5">Sơ đồ cây hệ thống tệp tin ảo biểu diễn cấu trúc tệp nén dạng ZIP.</span>
                  </div>
                </div>
                
                <button 
                  id="btn-close-archive-tree-modal"
                  onClick={() => setSelectedArchiveForTree(null)}
                  className="p-1.5 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] hover:border-gray-600 rounded-md text-gray-400 hover:text-white transition-all cursor-pointer"
                  title="Đóng trình khám phá"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Pack details band */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-4 bg-[#111] border-b border-[#222] text-[11px] font-mono">
                <div className="space-y-1">
                  <div className="text-gray-500 uppercase text-[9px] tracking-wider">Tên Gói Lưu Trữ</div>
                  <div className="text-[#00D4FF] font-bold truncate max-w-[150px]" title={selectedArchiveForTree.archiveName}>
                    {selectedArchiveForTree.archiveName}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500 uppercase text-[9px] tracking-wider font-semibold">Khóa Định Danh ID</div>
                  <div className="text-white truncate">{selectedArchiveForTree.id}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500 uppercase text-[9px] tracking-wider font-semibold">Dung Lượng Nén</div>
                  <div className="text-emerald-400 font-bold">{selectedArchiveForTree.totalCompressedSizeMb.toFixed(2)} MB</div>
                </div>
                <div className="space-y-1">
                  <div className="text-gray-500 uppercase text-[9px] tracking-wider font-semibold">Phân Khu Đóng Gói</div>
                  <div className="text-orange-400">{selectedArchiveForTree.projectNames.length} dự án / phân vùng</div>
                </div>
              </div>

              {/* Interactive Tree View container */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#090909] space-y-3 min-h-[300px]">
                {/* The root node of the ZIP file */}
                <div id="zip-tree-root-element" className="space-y-2">
                  <div 
                    onClick={() => {
                      const zipRootId = `zip-root-${selectedArchiveForTree.id}`;
                      setArchiveTreeExpandedNodes(prev => ({
                        ...prev,
                        [zipRootId]: !prev[zipRootId]
                      }));
                    }}
                    className="flex items-center gap-2 py-1.5 px-2.5 rounded bg-[#141414] border border-[#222] hover:border-[#333] cursor-pointer text-white font-mono text-xs transition-colors select-none"
                  >
                    <ChevronDown className="h-3.5 w-3.5 text-[#00D4FF]" />
                    <Archive className="h-4 w-4 text-[#00D4FF] shrink-0" />
                    <span className="font-bold text-white truncate">{selectedArchiveForTree.archiveName}</span>
                    <span className="text-[9px] text-[#00D4FF] bg-[#1a1a1a] border border-[#222] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 font-sans ml-auto font-mono">
                      GỐC TỆP ZIP
                    </span>
                  </div>
                  
                  <div className="border-l border-[#262626] ml-4 pl-1 space-y-1">
                    {getArchiveContentsTree(selectedArchiveForTree).map(projNode => renderArchiveTreeNode(projNode))}
                  </div>
                </div>
              </div>

              {/* Footer action bar */}
              <div className="p-4 bg-[#141414] border-t border-[#262626] flex items-center justify-between font-mono">
                <span className="text-[10px] text-gray-500 font-sans tracking-wide">
                  Có thể đóng/mở từng thư mục để mở rộng hoặc thu gọn cây cấu trúc tệp nén.
                </span>

                <button 
                  id="btn-footer-close-explorer"
                  onClick={() => setSelectedArchiveForTree(null)}
                  className="px-3.5 py-1.5 text-xs font-bold uppercase text-white bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] hover:border-gray-600 rounded transition-all cursor-pointer"
                >
                  Đóng Cửa Sổ
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
