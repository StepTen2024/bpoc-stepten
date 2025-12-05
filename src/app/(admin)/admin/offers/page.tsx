'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Gift,
  Search,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  Loader2,
  Briefcase
} from 'lucide-react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Badge } from '@/components/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shared/ui/avatar';

interface Offer {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateAvatar?: string;
  jobId: string;
  jobTitle: string;
  salaryOffered: number;
  salaryType: string;
  currency: string;
  startDate?: string;
  benefits: string[];
  status: string;
  sentAt?: string;
  viewedAt?: string;
  respondedAt?: string;
  candidateResponse?: string;
  createdAt: string;
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchOffers = async () => {
    try {
      const response = await fetch(`/api/admin/offers?status=${statusFilter}`);
      const data = await response.json();
      
      if (response.ok) {
        setOffers(data.offers || []);
      }
    } catch (error) {
      console.error('Failed to fetch offers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [statusFilter]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ElementType }> = {
      draft: { bg: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Clock },
      sent: { bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: Send },
      viewed: { bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Eye },
      accepted: { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
      rejected: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
      negotiating: { bg: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: DollarSign },
      expired: { bg: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Clock },
      withdrawn: { bg: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
    };
    const style = styles[status] || styles.draft;
    const Icon = style.icon;
    return (
      <Badge variant="outline" className={`${style.bg} capitalize`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const formatSalary = (offer: Offer) => {
    const formatted = Number(offer.salaryOffered).toLocaleString();
    return `${offer.currency} ${formatted}/${offer.salaryType}`;
  };

  const filteredOffers = offers.filter(offer =>
    offer.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    offer.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count by status
  const statusCounts = offers.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Job Offers</h1>
        <p className="text-gray-400 mt-1">Manage offers sent to candidates</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">
              {statusCounts['sent'] || 0}
            </p>
            <p className="text-gray-400 text-sm">Pending Response</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">
              {statusCounts['viewed'] || 0}
            </p>
            <p className="text-gray-400 text-sm">Viewed</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {statusCounts['accepted'] || 0}
            </p>
            <p className="text-gray-400 text-sm">Accepted</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">
              {statusCounts['rejected'] || 0}
            </p>
            <p className="text-gray-400 text-sm">Declined</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search offers..."
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
          <option value="sent">Pending</option>
          <option value="viewed">Viewed</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Declined</option>
        </select>
      </div>

      {/* Offers List */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
          <p className="text-gray-400 mt-2">Loading offers...</p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Gift className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Offers Yet</h3>
            <p className="text-gray-400">Offers will appear here when you send them to candidates from interviews.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOffers.map((offer, index) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`border-white/10 transition-all ${
                offer.status === 'accepted'
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-white/5 hover:border-purple-500/30'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={offer.candidateAvatar} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                          {offer.candidateName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-white font-semibold">{offer.candidateName}</h3>
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <Briefcase className="h-4 w-4" />
                          <span>{offer.jobTitle}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <DollarSign className="h-4 w-4 text-emerald-400" />
                          {formatSalary(offer)}
                        </div>
                        {offer.startDate && (
                          <div className="flex items-center gap-1 text-gray-400 text-sm">
                            <Calendar className="h-3 w-3" />
                            Start: {new Date(offer.startDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(offer.status)}
                        {offer.sentAt && (
                          <span className="text-gray-500 text-sm">
                            Sent {new Date(offer.sentAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {offer.status === 'accepted' && (
                    <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-emerald-300 text-sm">
                        🎉 <span className="font-medium">Hired!</span> {offer.candidateName} accepted this offer
                        {offer.respondedAt && ` on ${new Date(offer.respondedAt).toLocaleDateString()}`}.
                      </p>
                    </div>
                  )}
                  {offer.status === 'rejected' && offer.candidateResponse && (
                    <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-red-300 text-sm">
                        <span className="font-medium">Declined:</span> {offer.candidateResponse}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
