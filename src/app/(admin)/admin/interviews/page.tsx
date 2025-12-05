'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Search,
  Plus,
  Clock,
  Video,
  Phone,
  MapPin,
  User,
  Briefcase,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Badge } from '@/components/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/ui/avatar';

interface Interview {
  id: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  company: string;
  type: 'video' | 'phone' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  scheduledAt: string;
  duration: number; // minutes
  outcome?: 'passed' | 'failed' | 'pending';
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from API
    setInterviews([
      {
        id: '1',
        candidateName: 'John Smith',
        candidateEmail: 'john@email.com',
        jobTitle: 'Senior Software Engineer',
        company: 'TechCorp Inc.',
        type: 'video',
        status: 'scheduled',
        scheduledAt: '2024-03-20T14:00:00Z',
        duration: 60,
      },
      {
        id: '2',
        candidateName: 'Sarah Johnson',
        candidateEmail: 'sarah@email.com',
        jobTitle: 'Product Designer',
        company: 'StartupXYZ',
        type: 'in-person',
        status: 'completed',
        scheduledAt: '2024-03-18T10:00:00Z',
        duration: 45,
        outcome: 'passed',
      },
      {
        id: '3',
        candidateName: 'Mike Williams',
        candidateEmail: 'mike@email.com',
        jobTitle: 'Marketing Manager',
        company: 'BrandCo',
        type: 'phone',
        status: 'cancelled',
        scheduledAt: '2024-03-17T15:30:00Z',
        duration: 30,
      },
    ]);
    setLoading(false);
  }, []);

  const getStatusBadge = (status: Interview['status']) => {
    const styles = {
      scheduled: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', icon: Clock },
      completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle },
      cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: XCircle },
      'no-show': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', icon: AlertCircle },
    };
    const style = styles[status];
    const Icon = style.icon;
    return (
      <Badge variant="outline" className={`${style.bg} ${style.text} ${style.border} capitalize`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('-', ' ')}
      </Badge>
    );
  };

  const getTypeIcon = (type: Interview['type']) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4 text-purple-400" />;
      case 'phone': return <Phone className="h-4 w-4 text-cyan-400" />;
      case 'in-person': return <MapPin className="h-4 w-4 text-orange-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Interviews</h1>
          <p className="text-gray-400 mt-1">Manage interview schedules and outcomes</p>
        </div>
        <Button className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Interview
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">
              {interviews.filter(i => i.status === 'scheduled').length}
            </p>
            <p className="text-gray-400 text-sm">Upcoming</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {interviews.filter(i => i.status === 'completed').length}
            </p>
            <p className="text-gray-400 text-sm">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">
              {interviews.filter(i => i.status === 'cancelled').length}
            </p>
            <p className="text-gray-400 text-sm">Cancelled</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">
              {interviews.filter(i => i.outcome === 'passed').length}
            </p>
            <p className="text-gray-400 text-sm">Passed</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search interviews..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white"
        />
      </div>

      {/* Interviews List */}
      <div className="space-y-4">
        {interviews.map((interview, index) => (
          <motion.div
            key={interview.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-white/5 border-white/10 hover:border-purple-500/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                        {interview.candidateName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-white font-semibold">{interview.candidateName}</h3>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Briefcase className="h-4 w-4" />
                        <span>{interview.jobTitle} at {interview.company}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-white">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(interview.scheduledAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Clock className="h-4 w-4" />
                        {new Date(interview.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <span>({interview.duration} min)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(interview.type)}
                      <span className="text-gray-400 text-sm capitalize">{interview.type}</span>
                    </div>
                    {getStatusBadge(interview.status)}
                    {interview.outcome && (
                      <Badge variant="outline" className={
                        interview.outcome === 'passed' 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }>
                        {interview.outcome}
                      </Badge>
                    )}
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

