import { 
  FolderGit2, 
  Database, 
  Archive, 
  RefreshCw, 
  Grid, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react';
import { StorageStats, Project } from '../types';

interface DashboardStatsProps {
  stats: StorageStats;
  projects: Project[];
  role: string;
  onNavigateSection: (section: string) => void;
}

export default function DashboardStats({ stats, projects, role, onNavigateSection }: DashboardStatsProps) {
  const activeCount = projects.filter(p => p.status !== 'Archived').length;
  const archivedCount = projects.filter(p => p.status === 'Archived').length;
  
  // Format numbers nicely
  const usedPercent = ((stats.usedGb / stats.totalCapacityGb) * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Widget 1: Project Counter */}
      <div 
        id="widget-project-counter"
        onClick={() => onNavigateSection('projects')}
        className="group relative bg-[#111111] hover:bg-[#161616] border border-[#262626] hover:border-[#00D4FF]/50 p-5 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#00D4FF]/5 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Danh Sách Hệ Thống</span>
          <FolderGit2 className="h-4 w-4 text-[#00D4FF] group-hover:scale-110 transition-transform duration-200" />
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-display font-medium tracking-tight text-white">{projects.length}</span>
          <span className="text-xs text-gray-400">Hệ thống</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 font-mono">
          <span>{activeCount} Đang hoạt động</span>
          <span>{archivedCount} Đã lưu trữ</span>
        </div>
      </div>

      {/* Widget 2: Storage Capacity Usage */}
      <div 
        id="widget-storage-usage"
        onClick={() => onNavigateSection('analytics')}
        className="group relative bg-[#111111] hover:bg-[#161616] border border-[#262626] hover:border-[#00D4FF]/50 p-5 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#00D4FF]/5 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest font-semibold text-[#00D4FF]">Dung Lượng Bộ Nhớ</span>
          <Database className="h-4 w-4 text-[#00D4FF] group-hover:rotate-12 transition-transform duration-200" />
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-display font-medium tracking-tight text-white">{stats.usedGb.toFixed(2)}</span>
          <span className="text-xs text-gray-400">/ 1,024 GB</span>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 w-full bg-[#1e1e1e] h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-[#00D4FF] h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(parseFloat(usedPercent), 100)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-gray-400">
          <span>Đã dùng {usedPercent}%</span>
          <span>Bộ nhớ S3 & MinIO Pool</span>
        </div>
      </div>

      {/* Widget 3: Archive Center Status */}
      <div 
        id="widget-archive-center"
        onClick={() => onNavigateSection('archive')}
        className="group relative bg-[#111111] hover:bg-[#161616] border border-[#262626] hover:border-[#00D4FF]/50 p-5 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/5 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Kho Lưu Trữ</span>
          <Archive className="h-4 w-4 text-amber-500 group-hover:-translate-y-0.5 transition-transform duration-200" />
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-display font-medium tracking-tight text-white">{(stats.byCategory.archived * 1024).toFixed(0)}</span>
          <span className="text-xs text-gray-400">MB Đã Nén</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 font-mono">
          <span>{projects.filter(p => p.status === 'Archived').length} Mô-đun lưu trữ</span>
          <span className="text-amber-500 flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Lưu Trữ Tĩnh An Toàn
          </span>
        </div>
      </div>

      {/* Widget 4: Backup Status Integrity */}
      <div 
        id="widget-backup-status"
        onClick={() => onNavigateSection('backup')}
        className="group relative bg-[#111111] hover:bg-[#161616] border border-[#262626] hover:border-[#00D4FF]/50 p-5 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Nạp & Sao Lưu</span>
          <RefreshCw className="h-4 w-4 text-emerald-500 group-hover:scale-115 transition-transform" />
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-display font-medium tracking-tight text-white">99.8%</span>
          <span className="text-xs text-gray-400">Độ Khả Dụng</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 font-mono">
          <span>Quét phân vùng thành công</span>
          <span className="text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Đồng Bộ Hoạt Động
          </span>
        </div>
      </div>
    </div>
  );
}
