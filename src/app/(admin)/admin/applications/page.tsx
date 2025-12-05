'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Calendar,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Video,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Badge } from '@/components/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/ui/avatar';

interface Application {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateAvatar?: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: string;
  appliedAt: string;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      const response = await fetch(`/api/admin/applications?status=${statusFilter}`);
      const data = await response.json();
      
      if (response.ok) {
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleRequestInterview = async (applicationId: string) => {
    setActionLoading(applicationId);
    try {
      const response = await fetch('/api/admin/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          interviewType: 'screening',
          durationMinutes: 30,
        }),
      });

      if (response.ok) {
        // Update local state
        setApplications(prev => prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: 'interview_scheduled' }
            : app
        ));
      }
    } catch (error) {
      console.error('Failed to request interview:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (applicationId: string, status: string) => {
    setActionLoading(applicationId);
    try {
      const response = await fetch('/api/admin/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, status }),
      });

      if (response.ok) {
        setApplications(prev => prev.map(app => 
          app.id === applicationId ? { ...app, status } : app
        ));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      submitted: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      under_review: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      shortlisted: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      interview_scheduled: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      interviewed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      hired: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return (
      <Badge variant="outline" className={`${styles[status] || styles.submitted} capitalize`}>
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const filteredApps = applications.filter(app =>
    app.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count by status
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Applications</h1>
        <p className="text-gray-400 mt-1">Review and manage job applications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {['submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'hired'].map((status) => (
          <Card key={status} className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">
                {statusCounts[status] || 0}
              </p>
              <p className="text-gray-400 text-sm capitalize">{status.replace(/_/g, ' ')}</p>
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
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="interview_scheduled">Interview Scheduled</option>
          <option value="rejected">Rejected</option>
          <option value="hired">Hired</option>
        </select>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
          <p className="text-gray-400 mt-2">Loading applications...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Applications Yet</h3>
            <p className="text-gray-400">Applications will appear here when candidates apply to jobs.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app, index) => (
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
                        {app.status === 'submitted' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-cyan-400 hover:bg-cyan-500/10"
                              onClick={() => handleUpdateStatus(app.id, 'under_review')}
                              disabled={actionLoading === app.id}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </>
                        )}
                        {(app.status === 'under_review' || app.status === 'shortlisted') && (
                          <>
                            <Button 
                              size="sm" 
                              className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                              onClick={() => handleRequestInterview(app.id)}
                              disabled={actionLoading === app.id}
                            >
                              {actionLoading === app.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Video className="h-4 w-4 mr-1" />
                                  Request Interview
                                </>
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-400 hover:bg-red-500/10"
                              onClick={() => handleUpdateStatus(app.id, 'rejected')}
                              disabled={actionLoading === app.id}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {app.status === 'interview_scheduled' && (
                          <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                            <Calendar className="h-3 w-3 mr-1" />
                            Interview Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
