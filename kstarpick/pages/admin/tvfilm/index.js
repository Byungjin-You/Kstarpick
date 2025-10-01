import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import { PlusCircle, Edit, Trash, ArrowLeft, ArrowRight, Search, Filter, Eye, ArrowUp, ArrowDown, Save, Info, Lock, AlertCircle } from 'lucide-react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useSession, signIn, getSession } from 'next-auth/react';

export default function TVFilmAdminRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/content?contentType=movie');
  }, [router]);
  
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-3 text-gray-600">콘텐츠 관리 페이지로 이동중...</p>
      </div>
    </div>
  );
}

// 서버 사이드에서 인증 확인
export async function getServerSideProps(context) {
  const session = await getSession(context);
  
  if (!session || !session.user || !['admin', 'editor'].includes(session.user.role)) {
    return {
      redirect: {
        destination: '/login?from=' + encodeURIComponent(context.resolvedUrl),
        permanent: false,
      },
    };
  }
  
  return {
    props: { session },
  };
} 