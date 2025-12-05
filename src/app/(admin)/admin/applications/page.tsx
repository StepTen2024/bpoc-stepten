'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Briefcase,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Badge } from '@/components/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/ui/avatar';

interface Application {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateAvatar?: string;
  jobTitle: string;
  company: string;
  status: 'pending' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired';
  appliedAt: string;
  notes?: string;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from API
    setApplications([
      {
        id: '1',
        candidateName: 'John Smith',
        candidateEmail: 'john@email.com',
        jobTitle: 'Senior Software Engineer',
        company: 'TechCorp Inc.',
        status: 'reviewing',
        appliedAt: '2024-03-15T10:30:00Z',
      },
      {
        id: '2',
        candidateName: 'Sarah Johnson',
        candidateEmail: 'sarah@email.com',
        jobTitle: 'Product Designer',
        company: 'StartupXYZ',
        status: 'shortlisted',
        appliedAt: '2024-03-14T14:20:00Z',
      },
      {
        id: '3',
        candidateName: 'Mike Williams',
        candidateEmail: 'mike@email.com',
        jobTitle: 'Marketing Manager',
        company: 'BrandCo',
        status: 'pending',
        appliedAt: '2024-03-13T09:15:00Z',
      },
    ]);
    setLoading(false);
  }, []);

  const getStatusBadge = (status: Application['status']) => {
    const styles = {
      pending: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
      reviewing: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
      shortlisted: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
      hired: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    };
    const style = styles[status];
    return (
      <Badge variant="outline" className={`${style.bg} ${style.text} ${style.border} capitalize`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Applications</h1>
        <p className="text-gray-400 mt-1">Review and manage job applications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {['pending', 'reviewing', 'shortlisted', 'rejected', 'hired'].map((status) => (
          <Card key={status} className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">
                {applications.filter(a => a.status === status).length}
              </p>
              <p className="text-gray-400 text-sm capitalize">{status}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search applications..."
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
          <option value="pending">Pending</option>
          <option value="reviewing">Reviewing</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
          <option value="hired">Hired</option>
        </select>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {applications.map((app, index) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-white/5 border-white/10 hover:border-cyan-500/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={app.candidateAvatar} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-600 text-white">
                        {app.candidateName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-white font-semibold">{app.candidateName}</h3>
                      <p className="text-gray-400 text-sm">{app.candidateEmail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Briefcase className="h-4 w-4" />
                      <span>{app.jobTitle}</span>
                    </div>
                    <p className="text-gray-500 text-sm">{app.company}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(app.status)}
                    <span className="text-gray-500 text-sm flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

