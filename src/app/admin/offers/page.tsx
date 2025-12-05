'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Gift,
  Search,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Briefcase,
  Send
} from 'lucide-react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Badge } from '@/components/shared/ui/badge';
import { Avatar, AvatarFallback } from '@/components/shared/ui/avatar';

interface Offer {
  id: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  company: string;
  salary: string;
  startDate: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  sentAt: string;
  respondedAt?: string;
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from API
    setOffers([
      {
        id: '1',
        candidateName: 'John Smith',
        candidateEmail: 'john@email.com',
        jobTitle: 'Senior Software Engineer',
        company: 'TechCorp Inc.',
        salary: '$160,000/year',
        startDate: '2024-04-01',
        status: 'pending',
        sentAt: '2024-03-15T10:00:00Z',
      },
      {
        id: '2',
        candidateName: 'Sarah Johnson',
        candidateEmail: 'sarah@email.com',
        jobTitle: 'Product Designer',
        company: 'StartupXYZ',
        salary: '$95,000/year',
        startDate: '2024-03-25',
        status: 'accepted',
        sentAt: '2024-03-10T14:00:00Z',
        respondedAt: '2024-03-12T09:30:00Z',
      },
      {
        id: '3',
        candidateName: 'Mike Williams',
        candidateEmail: 'mike@email.com',
        jobTitle: 'Marketing Manager',
        company: 'BrandCo',
        salary: '$85,000/year',
        startDate: '2024-04-15',
        status: 'declined',
        sentAt: '2024-03-08T11:00:00Z',
        respondedAt: '2024-03-09T16:00:00Z',
      },
    ]);
    setLoading(false);
  }, []);

  const getStatusBadge = (status: Offer['status']) => {
    const styles = {
      pending: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', icon: Clock },
      accepted: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle },
      declined: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: XCircle },
      expired: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', icon: Clock },
    };
    const style = styles[status];
    const Icon = style.icon;
    return (
      <Badge variant="outline" className={`${style.bg} ${style.text} ${style.border} capitalize`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Offers</h1>
          <p className="text-gray-400 mt-1">Track job offers and hiring outcomes</p>
        </div>
        <Button className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700">
          <Send className="h-4 w-4 mr-2" />
          Send New Offer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-400">
              {offers.filter(o => o.status === 'pending').length}
            </p>
            <p className="text-gray-400 text-sm">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {offers.filter(o => o.status === 'accepted').length}
            </p>
            <p className="text-gray-400 text-sm">Accepted</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">
              {offers.filter(o => o.status === 'declined').length}
            </p>
            <p className="text-gray-400 text-sm">Declined</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-cyan-400">
              {Math.round((offers.filter(o => o.status === 'accepted').length / offers.length) * 100) || 0}%
            </p>
            <p className="text-gray-400 text-sm">Acceptance Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search offers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white"
        />
      </div>

      {/* Offers List */}
      <div className="space-y-4">
        {offers.map((offer, index) => (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="bg-white/5 border-white/10 hover:border-emerald-500/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-600 text-white">
                        {offer.candidateName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-white font-semibold">{offer.candidateName}</h3>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Briefcase className="h-4 w-4" />
                        <span>{offer.jobTitle} at {offer.company}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <DollarSign className="h-4 w-4" />
                        {offer.salary}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Calendar className="h-4 w-4" />
                        Start: {new Date(offer.startDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs">Sent {new Date(offer.sentAt).toLocaleDateString()}</p>
                      {offer.respondedAt && (
                        <p className="text-gray-500 text-xs">Responded {new Date(offer.respondedAt).toLocaleDateString()}</p>
                      )}
                    </div>
                    {getStatusBadge(offer.status)}
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

