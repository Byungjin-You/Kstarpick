import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { Mail, Lock, User, AlertCircle, Check } from 'lucide-react';

export default function AdminRegister() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset states
    setError('');
    setSuccess('');
    
    // Basic validation
    if (!name || !email || !password || !confirmPassword || !adminKey) {
      setError('Please fill out all fields.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Send request to create admin account
      const response = await fetch('/api/auth/register-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          adminKey,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to register admin account');
      }
      
      setSuccess('Admin account created successfully. You can now log in.');
      
      // Clear form fields
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setAdminKey('');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/admin/login');
      }, 3000);
      
    } catch (error) {
      setError(error.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Registration | K-POP News Portal</title>
        <meta name="description" content="Admin registration page for K-POP News Portal" />
      </Head>
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Admin Registration</h1>
                <p className="text-gray-600 mt-2">Create your admin account</p>
              </div>
              
              {error && (
                <div className="mb-6 flex items-center p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  <p>{error}</p>
                </div>
              )}
              
              {success && (
                <div className="mb-6 flex items-center p-4 border-l-4 border-green-500 bg-green-50 text-green-700 rounded">
                  <Check className="mr-2 h-5 w-5" />
                  <p>{success}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters long</p>
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="adminKey" className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Registration Key
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="adminKey"
                      name="adminKey"
                      type="password"
                      required
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="Enter admin registration key"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Contact system administrator for this key</p>
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm font-medium ${
                      isLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Admin Account'}
                  </button>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <p className="text-sm text-center text-gray-600">
                Already have an account? <Link href="/admin/login" className="font-medium text-blue-600 hover:text-blue-500">Sign in</Link>
              </p>
            </div>
          </div>
          
          <div className="text-center mt-6">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </>
  );
} 