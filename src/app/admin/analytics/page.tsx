'use client';

import React from 'react';
import { BarChart3, TrendingUp, Users, Eye, Clock, Globe, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 mt-1">Platform statistics and insights</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Page Views (Today)</p>
                <p className="text-2xl font-bold text-white">12,847</p>
                <p className="text-emerald-400 text-sm flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" /> +12.5%
                </p>
              </div>
              <Eye className="h-8 w-8 text-cyan-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Users</p>
                <p className="text-2xl font-bold text-white">1,234</p>
                <p className="text-emerald-400 text-sm flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" /> +8.2%
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg. Session</p>
                <p className="text-2xl font-bold text-white">4m 32s</p>
                <p className="text-red-400 text-sm flex items-center gap-1">
                  <ArrowDown className="h-3 w-3" /> -2.1%
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Bounce Rate</p>
                <p className="text-2xl font-bold text-white">32.4%</p>
                <p className="text-emerald-400 text-sm flex items-center gap-1">
                  <ArrowDown className="h-3 w-3" /> -5.3%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Placeholder */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
              Traffic Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Chart coming soon...</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-400" />
              User Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Map coming soon...</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Top Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { page: '/jobs', views: 4521, percentage: 35 },
              { page: '/resume-builder', views: 2847, percentage: 22 },
              { page: '/candidates', views: 1923, percentage: 15 },
              { page: '/games/typing-hero', views: 1456, percentage: 11 },
              { page: '/profile', views: 982, percentage: 8 },
            ].map((item) => (
              <div key={item.page} className="flex items-center gap-4">
                <span className="text-gray-300 w-48 font-mono text-sm">{item.page}</span>
                <div className="flex-1 bg-white/5 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="text-gray-400 text-sm w-20 text-right">{item.views.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

