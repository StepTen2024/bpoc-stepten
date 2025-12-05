'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Pause,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Badge } from '@/components/shared/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';

interface Job {
  id: string;
  title: string;
  company: string;
  agencyId: string;
  agencyName: string;
  location: string;
  salary: string;
  type: 'full-time' | 'part-time' | 'contract' | 'remote';
  status: 'active' | 'paused' | 'closed' | 'pending_approval';
  applicantsCount: number;
  createdAt: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from API
    setJobs([
      {
        id: '1',
        title: 'Senior Software Engineer',
        company: 'TechCorp Inc.',
        agencyId: '1',
        agencyName: 'TechRecruit Pro',
        location: 'San Francisco, CA',
        salary: '$150,000 - $180,000',
        type: 'full-time',
        status: 'active',
        applicantsCount: 45,
        createdAt: '2024-01-15',
      },
      {
        id: '2',
        title: 'Product Designer',
        company: 'StartupXYZ',
        agencyId: '2',
        agencyName: 'Global Talent Solutions',
        location: 'Remote',
        salary: '$90,000 - $120,000',
        type: 'remote',
        status: 'pending_approval',
        applicantsCount: 0,
        createdAt: '2024-03-01',
      },
      {
        id: '3',
        title: 'Marketing Manager',
        company: 'BrandCo',
        agencyId: '1',
        agencyName: 'TechRecruit Pro',
        location: 'New York, NY',
        salary: '$80,000 - $100,000',
        type: 'full-time',
        status: 'paused',
        applicantsCount: 23,
        createdAt: '2024-02-10',
      },
    ]);
    setLoading(false);
  }, []);

  const getStatusBadge = (status: Job['status']) => {
    const styles = {
      active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle },
      paused: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', icon: Pause },
      closed: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', icon: XCircle },
      pending_approval: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30', icon: Clock },
    };
    const style = styles[status];
    const Icon = style.icon;
    const label = status === 'pending_approval' ? 'Pending Approval' : status;
    return (
      <Badge variant="outline" className={`${style.bg} ${style.text} ${style.border}`}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getTypeBadge = (type: Job['type']) => {
    return (
      <Badge variant="outline" className="bg-white/5 text-gray-300 border-white/20">
        {type.replace('-', ' ')}
      </Badge>
    );
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Jobs</h1>
          <p className="text-gray-400 mt-1">Manage job postings and approvals</p>
        </div>
        <Button className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700">
          <Plus className="h-4 w-4 mr-2" />
          Post New Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-white">{jobs.filter(j => j.status === 'active').length}</p>
            <p className="text-gray-400 text-sm">Active Jobs</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-purple-400">{jobs.filter(j => j.status === 'pending_approval').length}</p>
            <p className="text-gray-400 text-sm">Pending Approval</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-orange-400">{jobs.filter(j => j.status === 'paused').length}</p>
            <p className="text-gray-400 text-sm">Paused</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-cyan-400">{jobs.reduce((sum, j) => sum + j.applicantsCount, 0)}</p>
            <p className="text-gray-400 text-sm">Total Applicants</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.map((job, index) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-white/5 border-white/10 hover:border-red-500/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                      {getStatusBadge(job.status)}
                      {getTypeBadge(job.type)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {job.salary}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-gray-500">
                        Posted by: <span className="text-cyan-400">{job.agencyName}</span>
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        <Users className="h-4 w-4" />
                        {job.applicantsCount} applicants
                      </span>
                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock className="h-4 w-4" />
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-gray-400">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-white/10">
                      <DropdownMenuItem className="text-white hover:bg-white/10">
                        <Eye className="h-4 w-4 mr-2" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-white hover:bg-white/10">
                        <Edit className="h-4 w-4 mr-2" /> Edit Job
                      </DropdownMenuItem>
                      {job.status === 'pending_approval' && (
                        <DropdownMenuItem className="text-emerald-400 hover:bg-emerald-500/10">
                          <CheckCircle className="h-4 w-4 mr-2" /> Approve
                        </DropdownMenuItem>
                      )}
                      {job.status === 'active' && (
                        <DropdownMenuItem className="text-orange-400 hover:bg-orange-500/10">
                          <Pause className="h-4 w-4 mr-2" /> Pause
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

