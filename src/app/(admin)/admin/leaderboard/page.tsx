'use client';

import React from 'react';
import { Trophy, Medal, Star, TrendingUp, Gamepad2, FileText, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Avatar, AvatarFallback } from '@/components/shared/ui/avatar';

export default function LeaderboardPage() {
  // Placeholder data
  const typingLeaders = [
    { rank: 1, name: 'John Smith', score: 95, wpm: 120 },
    { rank: 2, name: 'Sarah Johnson', score: 92, wpm: 115 },
    { rank: 3, name: 'Mike Williams', score: 88, wpm: 108 },
  ];

  const activeUsers = [
    { rank: 1, name: 'Alex Brown', applications: 15, games: 8 },
    { rank: 2, name: 'Emma Davis', applications: 12, games: 6 },
    { rank: 3, name: 'Chris Lee', applications: 10, games: 5 },
  ];

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-300';
      case 3: return 'text-orange-400';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
        <p className="text-gray-400 mt-1">Top performers and most active users</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Typing Heroes */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-cyan-400" />
              Typing Heroes - Top Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {typingLeaders.map((user) => (
              <div key={user.rank} className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                <Medal className={`h-6 w-6 ${getMedalColor(user.rank)}`} />
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-600 text-white">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-white font-medium">{user.name}</p>
                  <p className="text-gray-400 text-sm">{user.wpm} WPM</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-cyan-400">{user.score}</p>
                  <p className="text-gray-500 text-xs">points</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Most Active */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Most Active Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeUsers.map((user) => (
              <div key={user.rank} className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                <Medal className={`h-6 w-6 ${getMedalColor(user.rank)}`} />
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-600 text-white">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-white font-medium">{user.name}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-400">{user.applications}</p>
                    <p className="text-gray-500 text-xs">Apps</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-cyan-400">{user.games}</p>
                    <p className="text-gray-500 text-xs">Games</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

