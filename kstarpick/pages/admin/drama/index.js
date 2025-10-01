import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';

export default function DramaAdminRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/content?contentType=drama');
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