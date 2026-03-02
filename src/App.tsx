import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Play, 
  User, 
  LogOut, 
  ShoppingBag, 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  Star,
  Search,
  Menu,
  X,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { User as UserType, Course, Lesson } from './types';

// --- Components ---

const Navbar = ({ 
  user, 
  onAuthClick, 
  onLogout, 
  onHomeClick,
  onMyCoursesClick 
}: { 
  user: UserType | null; 
  onAuthClick: () => void; 
  onLogout: () => void;
  onHomeClick: () => void;
  onMyCoursesClick: () => void;
}) => (
  <nav className="fixed top-0 left-0 right-0 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 cursor-pointer" 
          onClick={onHomeClick}
        >
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/20">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Lumina</span>
        </motion.div>
        
        <div className="hidden md:flex items-center gap-8">
          <button onClick={onHomeClick} className="text-zinc-400 hover:text-indigo-400 font-medium transition-colors">Courses</button>
          {user && (
            <button onClick={onMyCoursesClick} className="text-zinc-400 hover:text-indigo-400 font-medium transition-colors">My Courses</button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-zinc-300">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
                  {user.name[0]}
                </div>
                <span className="hidden sm:inline font-medium">{user.name}</span>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAuthClick}
              className="bg-indigo-600 text-white px-5 py-2 rounded-full font-medium hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              Sign In
            </motion.button>
          )}
        </div>
      </div>
    </div>
  </nav>
);

const CourseCard = ({ course, onClick }: { course: Course; onClick: () => void | Promise<void>; key?: any }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -8, scale: 1.02 }}
    transition={{ duration: 0.3 }}
    className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer group"
    onClick={() => onClick()}
  >
    <div className="relative aspect-video overflow-hidden">
      <img 
        src={course.thumbnail} 
        alt={course.title}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        referrerPolicy="no-referrer"
      />
      <div className="absolute top-3 left-3 bg-indigo-600/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
        {course.category}
      </div>
    </div>
    <div className="p-5">
      <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-indigo-400 transition-colors">{course.title}</h3>
      <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{course.description}</p>
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1 text-amber-500">
          <Star className="w-4 h-4 fill-current" />
          <span className="text-sm font-bold">4.8</span>
        </div>
        <div className="text-indigo-400 font-bold text-lg">
          ৳{course.price.toLocaleString()}
        </div>
      </div>
    </div>
  </motion.div>
);

const AuthModal = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: (user: UserType) => void 
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { email, password, name };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(data);
        onClose();
      } else {
        const errorMessage = data.details 
          ? `${data.error}: ${data.details} (Redis: ${data.redisStatus || 'unknown'})` 
          : (data.error || 'Something went wrong');
        setError(errorMessage);
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-zinc-900 rounded-3xl w-full max-w-md p-8 shadow-2xl relative border border-zinc-800"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-300 transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-2">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-zinc-400 mb-8">
          {isLogin ? 'Sign in to continue your learning journey.' : 'Join Lumina and start learning today.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-zinc-400 mb-1">Full Name</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-zinc-400 mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-400 mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          
          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </motion.button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [myCourses, setMyCourses] = useState<number[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseDetails, setCourseDetails] = useState<{ lessons: Lesson[] } | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [view, setView] = useState<'home' | 'my-courses' | 'course-detail' | 'player' | 'certificate'>('home');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    checkAuth();
    fetchCourses();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        fetchMyCourses();
      }
    } catch (err) {
      console.error('Auth check failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    const res = await fetch('/api/courses');
    const data = await res.json();
    setCourses(data);
  };

  const fetchMyCourses = async () => {
    const res = await fetch('/api/my-courses');
    if (res.ok) {
      const data = await res.json();
      setMyCourses(data.map((c: Course) => c.id));
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setMyCourses([]);
    setView('home');
  };

  const handleCourseClick = async (course: Course) => {
    setSelectedCourse(course);
    const res = await fetch(`/api/courses/${course.id}`);
    const data = await res.json();
    setCourseDetails(data);
    setView('course-detail');
    window.scrollTo(0, 0);
  };

  const handleEnroll = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!selectedCourse) return;

    const res = await fetch('/api/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: selectedCourse.id })
    });

    if (res.ok) {
      fetchMyCourses();
    }
  };

  const startLearning = (lesson?: Lesson) => {
    if (courseDetails?.lessons.length) {
      setCurrentLesson(lesson || courseDetails.lessons[0]);
      setView('player');
      window.scrollTo(0, 0);
    }
  };

  const isEnrolled = selectedCourse && myCourses.includes(selectedCourse.id);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar 
        user={user} 
        onAuthClick={() => setIsAuthModalOpen(true)} 
        onLogout={handleLogout}
        onHomeClick={() => setView('home')}
        onMyCoursesClick={() => setView('my-courses')}
      />

      <main className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-16 text-center max-w-3xl mx-auto">
                <motion.h1 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white mb-6"
                >
                  Unlock Your Potential with <span className="text-indigo-500">Lumina</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl text-zinc-400 mb-10 leading-relaxed"
                >
                  Learn from industry experts and master the skills that matter. Join over 10,000 students worldwide.
                </motion.p>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="relative max-w-lg mx-auto"
                >
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="Search for courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-800 bg-zinc-900 text-white shadow-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </motion.div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCourses.map((course, idx) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <CourseCard 
                      course={course} 
                      onClick={() => handleCourseClick(course)} 
                    />
                  </motion.div>
                ))}
                {filteredCourses.length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <p className="text-zinc-500 text-lg">No courses found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'my-courses' && (
            <motion.div 
              key="my-courses"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <h2 className="text-3xl font-bold mb-8 text-white">My Courses</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.filter(c => myCourses.includes(c.id)).map(course => (
                  <CourseCard 
                    key={course.id} 
                    course={course} 
                    onClick={() => handleCourseClick(course)} 
                  />
                ))}
                {myCourses.length === 0 && (
                  <div className="col-span-full py-24 text-center bg-zinc-900 rounded-3xl border border-dashed border-zinc-800">
                    <ShoppingBag className="w-16 h-16 text-zinc-700 mx-auto mb-6" />
                    <p className="text-zinc-400 text-lg font-medium">You haven't enrolled in any courses yet.</p>
                    <button 
                      onClick={() => setView('home')}
                      className="mt-6 text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
                    >
                      Browse Courses
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'course-detail' && selectedCourse && (
            <motion.div 
              key="course-detail"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-12"
            >
              <div className="lg:col-span-2">
                <button 
                  onClick={() => setView('home')}
                  className="flex items-center gap-2 text-zinc-500 hover:text-indigo-400 font-medium mb-8 transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back to Courses
                </button>
                
                <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">{selectedCourse.title}</h1>
                <p className="text-xl text-zinc-400 mb-10 leading-relaxed">{selectedCourse.description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                  <div className="flex items-center gap-3 text-zinc-300 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <User className="w-6 h-6 text-indigo-500" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Instructor</p>
                      <p className="font-semibold">{selectedCourse.instructor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-300 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <Clock className="w-6 h-6 text-indigo-500" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Duration</p>
                      <p className="font-semibold">12.5 Hours</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-300 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <CheckCircle className="w-6 h-6 text-indigo-500" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Certificate</p>
                      <p className="font-semibold">Included</p>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-xl">
                  <div className="p-8 border-b border-zinc-800 bg-zinc-900/50">
                    <h3 className="text-xl font-bold text-white">Course Content</h3>
                    <p className="text-sm text-zinc-500 mt-1">{courseDetails?.lessons.length || 0} lessons • Lifetime access</p>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {courseDetails?.lessons.map((lesson, idx) => (
                      <motion.div 
                        key={lesson.id}
                        whileHover={{ backgroundColor: 'rgba(79, 70, 229, 0.05)' }}
                        className={`p-6 flex items-center justify-between group ${isEnrolled ? 'cursor-pointer' : 'opacity-60'}`}
                        onClick={() => isEnrolled && startLearning(lesson)}
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-200 group-hover:text-white transition-colors">{lesson.title}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{lesson.duration}</p>
                          </div>
                        </div>
                        {isEnrolled ? (
                          <div className="bg-indigo-600/10 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <Play className="w-4 h-4 text-indigo-400 fill-current" />
                          </div>
                        ) : (
                          <Clock className="w-4 h-4 text-zinc-600" />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="sticky top-24 bg-zinc-900 rounded-3xl border border-zinc-800 p-6 shadow-2xl">
                  <div className="relative aspect-video rounded-2xl overflow-hidden mb-8 shadow-lg">
                    <img 
                      src={selectedCourse.thumbnail} 
                      alt={selectedCourse.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="bg-white/20 backdrop-blur-md p-4 rounded-full border border-white/30 shadow-2xl">
                        <Play className="w-8 h-8 text-white fill-current" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-4xl font-bold text-white mb-8 flex items-baseline gap-2">
                    ৳{selectedCourse.price.toLocaleString()}
                    <span className="text-sm text-zinc-500 line-through font-normal">৳{(selectedCourse.price * 1.5).toLocaleString()}</span>
                  </div>
                  
                  {isEnrolled ? (
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => startLearning()}
                      className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-3"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Continue Learning
                    </motion.button>
                  ) : (
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleEnroll}
                      className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                    >
                      Enroll Now
                    </motion.button>
                  )}
                  
                  <p className="text-center text-zinc-500 text-xs mt-6">30-Day Money-Back Guarantee</p>
                  
                  <div className="mt-10 space-y-5">
                    <p className="font-bold text-sm text-zinc-200">This course includes:</p>
                    <ul className="space-y-4">
                      {[
                        'Full lifetime access',
                        'Access on mobile and TV',
                        'Certificate of completion',
                        '12 downloadable resources'
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-4 text-sm text-zinc-400">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'player' && selectedCourse && currentLesson && (
            <motion.div 
              key="player"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-6xl mx-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <button 
                  onClick={() => setView('course-detail')}
                  className="flex items-center gap-2 text-zinc-500 hover:text-indigo-400 font-medium transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back to Course
                </button>
                <div className="text-sm font-medium text-zinc-500 bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
                  {selectedCourse.title} • <span className="text-indigo-400">{currentLesson.title}</span>
                </div>
              </div>

              <div className="bg-black aspect-video rounded-[2rem] overflow-hidden shadow-2xl mb-10 relative group border border-zinc-800">
                <video 
                  src={currentLesson.video_url} 
                  controls 
                  autoPlay
                  className="w-full h-full"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                  <h2 className="text-3xl font-bold text-white mb-6">{currentLesson.title}</h2>
                  <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 shadow-xl">
                    <h3 className="font-bold text-lg text-white mb-4">Lesson Description</h3>
                    <p className="text-zinc-400 leading-relaxed text-lg">
                      In this lesson, we'll dive deep into the core concepts of {currentLesson.title}. 
                      We'll cover the practical applications and best practices to ensure you have a solid foundation.
                    </p>
                    <div className="mt-8 pt-8 border-t border-zinc-800 flex gap-4">
                      <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold transition-all">Resources</button>
                      <button 
                        onClick={() => setView('certificate')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                      >
                        Claim Certificate
                      </button>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-xl sticky top-24">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                      <h3 className="font-bold text-white">Course Playlist</h3>
                      <p className="text-xs text-zinc-500 mt-1">{courseDetails?.lessons.length} lessons total</p>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto divide-y divide-zinc-800 custom-scrollbar">
                      {courseDetails?.lessons.map((lesson, idx) => (
                        <motion.div 
                          key={lesson.id}
                          whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                          className={`p-5 flex items-center gap-4 cursor-pointer transition-all ${currentLesson.id === lesson.id ? 'bg-indigo-600/10 border-l-4 border-indigo-600' : ''}`}
                          onClick={() => setCurrentLesson(lesson)}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${currentLesson.id === lesson.id ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${currentLesson.id === lesson.id ? 'text-indigo-400' : 'text-zinc-200'}`}>
                              {lesson.title}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{lesson.duration}</p>
                          </div>
                          {currentLesson.id === lesson.id && (
                            <div className="bg-indigo-600 p-1.5 rounded-full">
                              <Play className="w-3 h-3 text-white fill-current" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'certificate' && selectedCourse && user && (
            <motion.div 
              key="certificate"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-4xl mx-auto py-12"
            >
              <button 
                onClick={() => setView('player')}
                className="flex items-center gap-2 text-zinc-500 hover:text-indigo-400 font-medium mb-8 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Player
              </button>

              <div className="bg-white p-1 md:p-12 rounded-sm shadow-2xl relative overflow-hidden">
                {/* Certificate Border */}
                <div className="border-[16px] border-double border-indigo-900 p-8 md:p-16 relative">
                  {/* Decorative Corners */}
                  <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-indigo-600"></div>
                  <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-indigo-600"></div>
                  <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-indigo-600"></div>
                  <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-indigo-600"></div>

                  <div className="text-center space-y-8">
                    <div className="flex justify-center mb-6">
                      <div className="bg-indigo-600 p-3 rounded-xl">
                        <BookOpen className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    
                    <h1 className="text-indigo-900 text-4xl md:text-6xl font-serif font-bold tracking-widest uppercase">
                      Certificate
                    </h1>
                    <p className="text-zinc-500 text-xl font-medium tracking-widest uppercase">
                      of Achievement
                    </p>

                    <div className="py-8">
                      <p className="text-zinc-400 text-sm uppercase tracking-widest mb-2">This is to certify that</p>
                      <h2 className="text-zinc-900 text-3xl md:text-5xl font-serif italic font-bold border-b-2 border-zinc-200 inline-block px-8 py-2">
                        {user.name}
                      </h2>
                    </div>

                    <p className="text-zinc-600 text-lg max-w-2xl mx-auto leading-relaxed">
                      has successfully completed the premium course
                    </p>
                    
                    <h3 className="text-indigo-700 text-2xl md:text-3xl font-bold uppercase tracking-tight">
                      {selectedCourse.title}
                    </h3>

                    <p className="text-zinc-500 text-sm">
                      Issued on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>

                    <div className="pt-12 flex flex-col md:flex-row justify-between items-end gap-12">
                      <div className="text-center">
                        <div className="w-48 border-b border-zinc-400 mb-2"></div>
                        <p className="text-zinc-900 font-bold text-sm">Dr. Sarah Smith</p>
                        <p className="text-zinc-400 text-xs">Lead Instructor, Lumina</p>
                      </div>

                      <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-indigo-600/20 flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full border-2 border-indigo-600 flex items-center justify-center bg-indigo-50">
                            <CheckCircle className="w-10 h-10 text-indigo-600" />
                          </div>
                        </div>
                        <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                          VERIFIED
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="w-48 border-b border-zinc-400 mb-2"></div>
                        <p className="text-zinc-900 font-bold text-sm">Alex Rivera</p>
                        <p className="text-zinc-400 text-xs">Director of Education</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex justify-center gap-4">
                <button 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
                  onClick={() => window.print()}
                >
                  <ShoppingBag className="w-5 h-5" />
                  Download PDF
                </button>
                <button 
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-4 rounded-2xl font-bold transition-all"
                  onClick={() => setView('home')}
                >
                  Back to Home
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(u) => {
          setUser(u);
          fetchMyCourses();
        }}
      />

      <footer className="bg-zinc-950 border-t border-zinc-900 py-16 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-indigo-600 p-1.5 rounded-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white">Lumina</span>
              </div>
              <p className="text-zinc-500 max-w-sm leading-relaxed">
                Empowering learners worldwide with premium content and expert-led courses. Master your future today.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Platform</h4>
              <ul className="space-y-4 text-zinc-500 text-sm">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">All Courses</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Learning Paths</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Certifications</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Enterprise</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-6">Support</h4>
              <ul className="space-y-4 text-zinc-500 text-sm">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-sm text-zinc-600">
              © 2026 Lumina Learning Inc. All rights reserved.
            </div>
            <div className="flex gap-6">
              {['Twitter', 'LinkedIn', 'Instagram', 'YouTube'].map(social => (
                <a key={social} href="#" className="text-zinc-600 hover:text-white transition-colors text-sm font-medium">{social}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
