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
  Briefcase,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Gift,
  DollarSign,
  X
} from 'lucide-react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Badge } from '@/components/shared/ui/badge';
import { Avatar, AvatarFallback } from '@/components/shared/ui/avatar';

interface Interview {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  type: string;
  status: string;
  outcome?: string;
  scheduledAt?: string;
  duration: number;
  meetingLink?: string;
  notes?: string;
  createdAt: string;
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [offerModal, setOfferModal] = useState<Interview | null>(null);
  const [offerData, setOfferData] = useState({ salary: '', startDate: '' });
  const [sendingOffer, setSendingOffer] = useState(false);

  const fetchInterviews = async () => {
    try {
      const response = await fetch('/api/admin/interviews');
      const data = await response.json();
      
      if (response.ok) {
        setInterviews(data.interviews || []);
      }
    } catch (error) {
      console.error('Failed to fetch interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const handleUpdateOutcome = async (interviewId: string, outcome: string) => {
    setActionLoading(interviewId);
    try {
      const response = await fetch('/api/admin/interviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          interviewId, 
          outcome,
          status: 'completed'
        }),
      });

      if (response.ok) {
        setInterviews(prev => prev.map(i => 
          i.id === interviewId ? { ...i, outcome, status: 'completed' } : i
        ));
      }
    } catch (error) {
      console.error('Failed to update outcome:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendOffer = async () => {
    if (!offerModal || !offerData.salary) return;
    
    setSendingOffer(true);
    try {
      const response = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: offerModal.applicationId,
          salaryOffered: parseFloat(offerData.salary),
          startDate: offerData.startDate || null,
        }),
      });

      if (response.ok) {
        setOfferModal(null);
        setOfferData({ salary: '', startDate: '' });
        // Show success or redirect to offers
        window.location.href = '/admin/offers';
      }
    } catch (error) {
      console.error('Failed to send offer:', error);
    } finally {
      setSendingOffer(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ElementType }> = {
      scheduled: { bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: Calendar },
      confirmed: { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle },
      in_progress: { bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Clock },
      completed: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
      cancelled: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
      no_show: { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertCircle },
      rescheduled: { bg: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Calendar },
    };
    const style = styles[status] || styles.scheduled;
    const Icon = style.icon;
    return (
      <Badge variant="outline" className={`${style.bg} capitalize`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const icons: Record<string, React.ElementType> = {
      screening: Phone,
      technical: Video,
      behavioral: Video,
      final: MapPin,
    };
    const Icon = icons[type] || Video;
    return (
      <Badge variant="outline" className="bg-white/5 text-gray-300 border-white/20 capitalize">
        <Icon className="h-3 w-3 mr-1" />
        {type}
      </Badge>
    );
  };

  const filteredInterviews = interviews.filter(i =>
    i.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count by status
  const statusCounts = interviews.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Interviews</h1>
          <p className="text-gray-400 mt-1">Manage interview schedules and outcomes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">
              {statusCounts['scheduled'] || 0}
            </p>
            <p className="text-gray-400 text-sm">Upcoming</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {statusCounts['completed'] || 0}
            </p>
            <p className="text-gray-400 text-sm">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">
              {statusCounts['cancelled'] || 0}
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
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
          <p className="text-gray-400 mt-2">Loading interviews...</p>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Interviews Yet</h3>
            <p className="text-gray-400">Interviews will appear here when you request them from applications.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInterviews.map((interview, index) => (
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
                          <span>{interview.jobTitle}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        {interview.scheduledAt ? (
                          <>
                            <div className="flex items-center gap-2 text-white">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {new Date(interview.scheduledAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                              <Clock className="h-4 w-4" />
                              {new Date(interview.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              <span>({interview.duration} min)</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-500 text-sm">Not scheduled yet</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getTypeBadge(interview.type)}
                        {getStatusBadge(interview.status)}
                      </div>
                      {interview.outcome && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={
                            interview.outcome === 'passed' 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }>
                            {interview.outcome}
                          </Badge>
                          {interview.outcome === 'passed' && (
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                              onClick={() => setOfferModal(interview)}
                            >
                              <Gift className="h-4 w-4 mr-1" />
                              Make Offer
                            </Button>
                          )}
                        </div>
                      )}
                      {interview.status === 'scheduled' && !interview.outcome && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            onClick={() => handleUpdateOutcome(interview.id, 'passed')}
                            disabled={actionLoading === interview.id}
                          >
                            {actionLoading === interview.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Pass
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:bg-red-500/10"
                            onClick={() => handleUpdateOutcome(interview.id, 'failed')}
                            disabled={actionLoading === interview.id}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Offer Modal */}
      {offerModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Send Job Offer</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOfferModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Candidate</p>
                <p className="text-white font-medium">{offerModal.candidateName}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Position</p>
                <p className="text-white font-medium">{offerModal.jobTitle}</p>
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Monthly Salary (PHP) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    placeholder="e.g. 50000"
                    value={offerData.salary}
                    onChange={(e) => setOfferData(prev => ({ ...prev, salary: e.target.value }))}
                    className="pl-10 bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Start Date (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={offerData.startDate}
                    onChange={(e) => setOfferData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="pl-10 bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1 border-white/10 text-gray-400"
                  onClick={() => setOfferModal(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  onClick={handleSendOffer}
                  disabled={!offerData.salary || sendingOffer}
                >
                  {sendingOffer ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-2" />
                      Send Offer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
