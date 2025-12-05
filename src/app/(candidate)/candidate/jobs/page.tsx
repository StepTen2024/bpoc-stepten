'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Search,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  CheckCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Badge } from '@/components/shared/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface Job {
  id: string;
  title: string;
  slug: string;
  description: string;
  company: string;
  agency: string;
  workType: string;
  workArrangement: string;
  shift: string;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  skills: string[];
  createdAt: string;
}

export default function CandidateJobsPage() {
  const { session } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch(`/api/jobs/public?search=${searchQuery}`);
        const data = await response.json();
        
        if (response.ok) {
          setJobs(data.jobs || []);
        }
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [searchQuery]);

  const handleApply = async (jobId: string) => {
    if (!session?.access_token) {
      alert('Please sign in to apply for jobs');
      return;
    }

    setApplying(jobId);
    setSuccessMessage('');

    try {
      const response = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ jobId }),
      });

      const data = await response.json();

      if (response.ok) {
        setAppliedJobs(prev => new Set([...prev, jobId]));
        setSuccessMessage('Application submitted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert(data.error || 'Failed to apply');
      }
    } catch (error) {
      console.error('Failed to apply:', error);
      alert('Failed to apply');
    } finally {
      setApplying(null);
    }
  };

  const formatSalary = (job: Job) => {
    if (job.salaryMin && job.salaryMax) {
      return `${job.currency} ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`;
    }
    if (job.salaryMin) {
      return `${job.currency} ${job.salaryMin.toLocaleString()}+`;
    }
    return 'Competitive';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Browse Jobs</h1>
        <p className="text-gray-400 mt-1">Find your next opportunity</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3"
        >
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          <p className="text-emerald-400">{successMessage}</p>
        </motion.div>
      )}

      {/* Search */}
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search jobs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white"
        />
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-gray-400 mt-2">Loading jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Jobs Available</h3>
            <p className="text-gray-400">Check back later for new opportunities.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-white/5 border-white/10 hover:border-cyan-500/30 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{job.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {job.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.workArrangement}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatSalary(job)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{job.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                          {job.workType?.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                          {job.shift} shift
                        </Badge>
                        {job.skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="outline" className="bg-white/5 text-gray-300 border-white/20">
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > 3 && (
                          <Badge variant="outline" className="bg-white/5 text-gray-300 border-white/20">
                            +{job.skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="ml-6">
                      {appliedJobs.has(job.id) ? (
                        <Button disabled className="bg-emerald-500/20 text-emerald-400">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Applied
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleApply(job.id)}
                          disabled={applying === job.id}
                          className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
                        >
                          {applying === job.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              Apply Now
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </>
                          )}
                        </Button>
                      )}
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
