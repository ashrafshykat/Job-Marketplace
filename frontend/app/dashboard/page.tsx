'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { 
  Briefcase, 
  Users, 
  FileText, 
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import PageTransition from '@/components/animations/PageTransition';
import AnimatedCard from '@/components/animations/Card';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && user) {
      // GSAP timeline animation
      const tl = gsap.timeline();
      
      if (containerRef.current) {
        tl.from(containerRef.current.children, {
          opacity: 0,
          y: 50,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power3.out'
        });
      }

      // Redirect after animation
      const redirectTimer = setTimeout(() => {
        if (user.role === 'admin') {
          router.push('/admin/users');
        } else if (user.role === 'buyer') {
          router.push('/buyer/projects');
        } else if (user.role === 'problem_solver') {
          router.push('/solver/projects');
        }
      }, 1500);

      return () => clearTimeout(redirectTimer);
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full"
          />
        </div>
      </ProtectedRoute>
    );
  }

  const dashboardCards = [
    {
      icon: Briefcase,
      title: 'Projects',
      description: 'Manage your projects',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      route: user?.role === 'buyer' ? '/buyer/projects' : '/solver/projects'
    },
    {
      icon: FileText,
      title: 'Tasks',
      description: 'View your tasks',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      route: '/solver/tasks'
    },
    {
      icon: Users,
      title: 'Users',
      description: 'Manage users',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      route: '/admin/users',
      show: user?.role === 'admin'
    },
    {
      icon: TrendingUp,
      title: 'Analytics',
      description: 'View statistics',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      route: '/dashboard/analytics'
    }
  ].filter(card => card.show !== false);

  return (
    <ProtectedRoute>
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50">
          <div ref={containerRef} className="max-w-6xl w-full px-4">
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
                className="inline-block mb-4"
              >
                <Sparkles className="w-16 h-16 text-primary-600" />
              </motion.div>
              <h1 className="text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                Welcome Back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-xl text-gray-600">
                Choose where you'd like to go
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {dashboardCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    whileHover={{ 
                      scale: 1.05,
                      y: -5,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push(card.route)}
                    className="cursor-pointer"
                  >
                    <AnimatedCard className="p-6 hover:shadow-xl transition-all duration-300">
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.5 }}
                        className={`w-12 h-12 ${card.bgColor} ${card.color} rounded-lg flex items-center justify-center mb-4`}
                      >
                        <Icon className="w-6 h-6" />
                      </motion.div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {card.title}
                      </h3>
                      <p className="text-gray-600 mb-4">{card.description}</p>
                      <motion.div
                        whileHover={{ x: 5 }}
                        className="flex items-center text-primary-600 font-medium"
                      >
                        Go to {card.title}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </motion.div>
                    </AnimatedCard>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12 text-center"
            >
              <p className="text-gray-500 text-sm">
                Redirecting you automatically...
              </p>
            </motion.div>
          </div>
        </div>
      </PageTransition>
    </ProtectedRoute>
  );
}
